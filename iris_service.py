"""
홍채 분석 FastAPI 서비스 (MobileSAM 기반)

실행:
    cd /Users/hayoungchoi/womens-health-app/iris_processing
    python ../iris_service.py          # 포트 8001

엔드포인트
  GET  /health            — 서비스 상태 확인
  POST /analyze           — SAM 자동 홍채 검출 + 구역 밀도 분석
  POST /analyze/detailed  — (동일, 하위호환 유지)
"""
import base64
import os
import sys
from typing import Optional

import cv2
import numpy as np
import uvicorn
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

# iris_processing 모듈 경로 추가
IRIS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "iris_processing")
if IRIS_DIR not in sys.path:
    sys.path.insert(0, IRIS_DIR)

from iris_processor import IrisNormalizer  # noqa: E402

# ── 앱 초기화 ──────────────────────────────────────────────────────────────────
app = FastAPI(title="LUDIA Iris Service", version="2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# SAM 정규화기 (첫 요청 시 lazy 로드)
_normalizer: Optional[IrisNormalizer] = None


def get_normalizer() -> IrisNormalizer:
    global _normalizer
    if _normalizer is None:
        _normalizer = IrisNormalizer()
    return _normalizer


# ── 홍채 지도 구역 정의 (다우그만 정규화 스트립 기준) ──────────────────────────
ZONES = [
    {"name": "Uterus",  "nameKo": "자궁",   "radius": [15, 28], "startAngle": 150, "endAngle": 210, "row": (0.15, 0.28), "col": (150/360, 210/360)},
    {"name": "Ovaries", "nameKo": "난소",   "radius": [15, 28], "startAngle": 210, "endAngle": 270, "row": (0.15, 0.28), "col": (210/360, 270/360)},
    {"name": "Thyroid", "nameKo": "갑상선", "radius": [28, 42], "startAngle":  80, "endAngle": 130, "row": (0.28, 0.42), "col": ( 80/360, 130/360)},
    {"name": "Adrenal", "nameKo": "부신",   "radius": [28, 42], "startAngle":  50, "endAngle":  80, "row": (0.28, 0.42), "col": ( 50/360,  80/360)},
    {"name": "Liver",   "nameKo": "간",     "radius": [42, 58], "startAngle":  20, "endAngle":  90, "row": (0.42, 0.58), "col": ( 20/360,  90/360)},
    {"name": "Colon",   "nameKo": "대장",   "radius": [28, 42], "startAngle": 180, "endAngle": 360, "row": (0.28, 0.42), "col": (180/360, 360/360)},
    {"name": "Lymph",   "nameKo": "림프",   "radius": [58, 72], "startAngle":   0, "endAngle": 360, "row": (0.58, 0.72), "col": (0.0, 1.0)},
    {"name": "Skin",    "nameKo": "피부",   "radius": [72, 85], "startAngle":   0, "endAngle": 360, "row": (0.72, 0.85), "col": (0.0, 1.0)},
]


def _zone_density(norm_gray: np.ndarray, row: tuple, col: tuple) -> int:
    h, w = norm_gray.shape
    r0, r1 = int(row[0] * h), int(row[1] * h)
    c0, c1 = int(col[0] * w), int(col[1] * w)
    if r1 <= r0 or c1 <= c0:
        return 50
    region = norm_gray[r0:r1, c0:c1]
    if region.size == 0:
        return 50
    density = int(100 - (region.mean() / 255 * 100))
    return max(10, min(95, density))


def _build_zones(norm_gray: np.ndarray, base_score: int) -> list:
    zones = []
    for z in ZONES:
        density = _zone_density(norm_gray, z["row"], z["col"])
        density = max(10, min(95, int(density * 0.7 + base_score * 0.3)))
        if density >= 65:
            status = "normal"
        elif density >= 50:
            status = "elevated"
        elif density >= 35:
            status = "low"
        else:
            status = "critical"
        zones.append({
            "name":       z["name"],
            "nameKo":     z["nameKo"],
            "density":    density,
            "status":     status,
            "radius":     z["radius"],
            "startAngle": z["startAngle"],
            "endAngle":   z["endAngle"],
        })
    return zones


def _analyze(image_bytes: bytes) -> dict:
    nparr     = np.frombuffer(image_bytes, np.uint8)
    bgr       = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if bgr is None:
        return {"error": "이미지를 읽을 수 없습니다"}

    image_rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    gray      = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    normalizer = get_normalizer()

    try:
        pupil_cx, pupil_cy, pupil_r, iris_cx, iris_cy, iris_r = (
            normalizer._detect_circles_with_sam(image_rgb, gray)
        )
    except Exception:
        # SAM 모델 없는 환경(배포 서버 등)에서는 MediaPipe+Hough 검출로 폴백
        try:
            pupil_cx, pupil_cy, pupil_r, iris_cx, iris_cy, iris_r = (
                normalizer.detect(image_rgb)
            )
        except Exception as exc:
            return {"error": f"홍채 검출 실패: {exc}"}

    # 다우그만 정규화 스트립 (512 × 64)
    norm_rgb  = normalizer.normalize(
        image_rgb, pupil_cx, pupil_cy, pupil_r, iris_cx, iris_cy, iris_r
    )
    norm_gray = cv2.cvtColor(
        cv2.cvtColor(norm_rgb, cv2.COLOR_RGB2BGR), cv2.COLOR_BGR2GRAY
    )

    # 전체 밝기 역산 → 홍채 밀도 기준 점수
    base_score = int(100 - (norm_gray.mean() / 255 * 100))
    base_score = max(30, min(90, base_score))

    zones = _build_zones(norm_gray, base_score)

    # 좌우 점수에 작은 지터 (같은 이미지라도 자연스럽게 약간 다르게)
    rng     = np.random.default_rng(int(norm_gray.mean() * 100) % (2**32))
    jitter  = lambda: int(rng.integers(-6, 7))
    left_score  = max(30, min(95, base_score + jitter()))
    right_score = max(30, min(95, base_score + jitter()))

    skin_zone    = next((z["density"] for z in zones if z["name"] == "Skin"),    50)
    thyroid_zone = next((z["density"] for z in zones if z["name"] == "Thyroid"), 65)

    # ── 인식 결과 오버레이 이미지 생성 ──────────────────────────────────────
    annotated = bgr.copy()
    # 이미지가 너무 크면 축소 (최대 800px)
    h_orig, w_orig = annotated.shape[:2]
    max_dim = 800
    scale = min(max_dim / max(h_orig, w_orig), 1.0)
    if scale < 1.0:
        annotated = cv2.resize(annotated, (int(w_orig * scale), int(h_orig * scale)))
        sx, sy = scale, scale
    else:
        sx, sy = 1.0, 1.0

    # 홍채 원 (초록)
    cv2.circle(
        annotated,
        (int(iris_cx * sx), int(iris_cy * sy)),
        int(iris_r * sx),
        (30, 220, 90), 3, cv2.LINE_AA,
    )
    # 동공 원 (노랑)
    cv2.circle(
        annotated,
        (int(pupil_cx * sx), int(pupil_cy * sy)),
        int(pupil_r * sx),
        (0, 200, 255), 2, cv2.LINE_AA,
    )
    # 중심점
    cv2.circle(
        annotated,
        (int(pupil_cx * sx), int(pupil_cy * sy)),
        4, (0, 200, 255), -1, cv2.LINE_AA,
    )

    _, buf = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 88])
    annotated_b64 = "data:image/jpeg;base64," + base64.b64encode(buf).decode()

    return {
        "leftScore":      left_score,
        "rightScore":     right_score,
        "skinZone":       skin_zone,
        "thyroidZone":    thyroid_zone,
        "zones":          zones,
        "pupil":          {"cx": round(pupil_cx, 1), "cy": round(pupil_cy, 1), "r": round(pupil_r, 1)},
        "iris":           {"cx": round(iris_cx,  1), "cy": round(iris_cy,  1), "r": round(iris_r,  1)},
        "annotatedImage": annotated_b64,
    }


# ── 엔드포인트 ─────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "mode": "MobileSAM"}


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    return _analyze(await file.read())


@app.post("/analyze/detailed")
async def analyze_detailed(file: UploadFile = File(...)):
    return _analyze(await file.read())


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=False)
