"""
홍채 분석 FastAPI 서비스 — LUDIA LAB 병소 검출 모델(ONNX) 기반

모델: models/ludia_lab/ (scripts/import_ludia_model.py 로 ludia-health 에서 가져옴)
  사진 → 병소 검출(ludia_lesion.py) → 장기지도로 구역 매핑 → 구역별 점수·주석 이미지

실행:
    cd /Users/hayoungchoi/womens-health-app/iris_processing
    python ../iris_service.py          # 포트 8001

엔드포인트
  GET  /health            — 서비스 상태 확인
  POST /analyze           — 병소 검출 + 장기 구역 매핑 (form: file, eye=right|left)
  POST /analyze/detailed  — (동일, 하위호환 유지)
"""
import base64
import os
import re
import sys
from typing import Optional

import cv2
import numpy as np
import uvicorn
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware

# iris_processing 모듈 경로 추가
IRIS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "iris_processing")
if IRIS_DIR not in sys.path:
    sys.path.insert(0, IRIS_DIR)

from iris_processor import IrisNormalizer  # noqa: E402
from iris_region import clip_to_mask, exclusion_reason, eyelid_y, find_eyelids, label_point, visible_iris_mask  # noqa: E402
from ludia_lesion import detector_error, get_detector  # noqa: E402

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


# ── 여성 건강 구역 (병소가 걸친 장기 이름으로 판정) ──────────────────────────────
# match: LUDIA 장기지도(organ_map.json)의 장기 이름(예: "Uterus/Prostate, 자궁/전립선")을 , / 공백으로 나눈 조각에
#        이 문자열이 들어 있으면 해당 구역 병소로 본다. 한 글자(간)는 조각과 정확히 같을 때만.
# Skin은 장기지도에 없을 수 있어 홍채 가장자리(rel ≥ 0.85, 피부 링) 병소도 포함한다.
ZONES = [
    {"name": "Uterus",  "nameKo": "자궁",   "match": ["자궁"]},
    {"name": "Ovaries", "nameKo": "난소",   "match": ["난소"]},
    {"name": "Thyroid", "nameKo": "갑상선", "match": ["갑상"]},
    {"name": "Adrenal", "nameKo": "부신",   "match": ["부신"]},
    {"name": "Liver",   "nameKo": "간",     "match": ["간"]},
    {"name": "Colon",   "nameKo": "대장",   "match": ["대장", "결장", "직장", "맹장"]},
    {"name": "Lymph",   "nameKo": "림프",   "match": ["림프"]},
    {"name": "Skin",    "nameKo": "피부",   "match": ["피부"], "outer_rel": 0.85},
]

# 점수 = 기준점 − Σ(병소 신뢰도 × 가중치). 병소가 없으면 기준점. 연구용 요약 지표이며 임상 점수가 아니다.
EYE_BASE, EYE_PER_LESION = 92, 6
# 검증 mIoU가 이보다 낮은 모델은 "학습 데이터 부족" 경고를 붙인다 (결과를 숨기지는 않음)
RELIABLE_VAL_MIOU = 0.35
ZONE_BASE, ZONE_PER_LESION = 90, 14

_PALETTE = [(80, 80, 255), (0, 170, 255), (255, 90, 200), (255, 200, 0), (120, 255, 120),
            (255, 120, 60), (200, 120, 255), (60, 220, 220), (180, 180, 60), (140, 90, 255)]


def _organ_matches(organ: str, m: str) -> bool:
    return any(t == m or (len(m) > 1 and m in t) for t in re.split(r"[,/\s()]+", organ) if t)


def _zone_hit(z: dict, les: dict) -> bool:
    if any(_organ_matches(o["name"], m) for o in les.get("organs", []) for m in z["match"]):
        return True
    rel = (les.get("position") or {}).get("rel")
    return "outer_rel" in z and rel is not None and rel >= z["outer_rel"]


def _status(v: int) -> str:
    return "normal" if v >= 65 else "elevated" if v >= 50 else "low" if v >= 35 else "critical"


def _build_zones(lesions: list) -> list:
    zones = []
    for z in ZONES:
        hits = [l for l in lesions if _zone_hit(z, l)]
        v = max(10, min(95, round(ZONE_BASE - ZONE_PER_LESION * sum(l["confidence"] for l in hits))))
        zones.append({"name": z["name"], "nameKo": z["nameKo"], "density": v, "status": _status(v),
                      "lesionCount": len(hits), "lesions": [l["id"] for l in hits]})
    return zones


def _classical_geometry(bgr: np.ndarray) -> Optional[dict]:
    """기존 검출기(MobileSAM → MediaPipe/Hough)로 동공·홍채 원을 구한다.
    샘플 사진에서 LUDIA 모델의 동공/홍채 분할(학습 6장, 동공 IoU 0.18)보다 훨씬 정확해 우선 사용한다."""
    image_rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    normalizer = get_normalizer()
    try:
        pcx, pcy, pr, icx, icy, ir = normalizer._detect_circles_with_sam(image_rgb, gray)
    except Exception:
        try:
            pcx, pcy, pr, icx, icy, ir = normalizer.detect(image_rgb)
        except Exception:
            return None
    return {"cx": float(pcx), "cy": float(pcy), "pupilR": float(pr), "limbusR": float(ir), "src": "classical"}


def _plausible(g: Optional[dict], shape) -> bool:
    """모델이 찾은 홍채/동공 원이 말이 되는지 — 중심이 사진 안, 동공/홍채 비율 0.1~0.75, 홍채가 사진보다 크지 않음."""
    if not g:
        return False
    h, w = shape[:2]
    ratio = g["pupilR"] / max(g["limbusR"], 1e-6)
    return 0 <= g["cx"] < w and 0 <= g["cy"] < h and 0.1 <= ratio <= 0.75 and g["limbusR"] <= 0.75 * max(h, w)


def _draw(bgr: np.ndarray, geom: Optional[dict], lesions: list, color_of: dict, lids: Optional[dict] = None) -> str:
    img = bgr.copy()
    h, w = img.shape[:2]
    s = min(800 / max(h, w), 1.0)
    if s < 1.0:
        img = cv2.resize(img, (int(w * s), int(h * s)), interpolation=cv2.INTER_AREA)
    lw = max(2, int(round(max(img.shape[:2]) / 300)))
    if geom:
        c = (int(geom["cx"] * s), int(geom["cy"] * s))
        cv2.circle(img, c, int(geom["limbusR"] * s), (30, 220, 90), lw, cv2.LINE_AA)
        cv2.circle(img, c, int(geom["pupilR"] * s), (0, 200, 255), lw, cv2.LINE_AA)
        # 눈꺼풀 경계는 홍채 원과 겹치는 구간만 그린다
        for lid in (lids or {}).values():
            xs = np.linspace(geom["cx"] - geom["limbusR"], geom["cx"] + geom["limbusR"], 80)
            ys = eyelid_y(lid, xs, geom["cx"])
            near = np.hypot(xs - geom["cx"], ys - geom["cy"]) <= geom["limbusR"] * 1.15
            if near.sum() >= 2:
                pts = (np.stack([xs[near], ys[near]], 1) * s).astype(np.int32)
                cv2.polylines(img, [pts], False, (255, 80, 255), lw, cv2.LINE_AA)
    for l in lesions:
        col = color_of[l["key"]]
        pts = (np.array(l["points"]) * s).astype(np.int32)
        if l["shape"] == "polyline":
            cv2.polylines(img, [pts], False, col, lw + 1, cv2.LINE_AA)
        else:
            ov = img.copy()
            cv2.fillPoly(ov, [pts], col)
            img = cv2.addWeighted(ov, 0.30, img, 0.70, 0)
            cv2.polylines(img, [pts], True, col, lw, cv2.LINE_AA)
        tx, ty = (np.array(l["labelAt"]) * s).astype(int)
        label = str(l["id"])
        cv2.putText(img, label, (int(tx) + 1, int(ty) + 1), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 3, cv2.LINE_AA)
        cv2.putText(img, label, (int(tx), int(ty)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)
    _, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 88])
    return "data:image/jpeg;base64," + base64.b64encode(buf).decode()


def _analyze(image_bytes: bytes, eye: str) -> dict:
    bgr = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
    if bgr is None:
        return {"error": "이미지를 읽을 수 없습니다"}
    det = get_detector()
    if det is None:
        return {"error": f"LUDIA 병소 모델이 설치되지 않았습니다 (models/ludia_lab) — {detector_error()}"}

    dets = det.predict(bgr)
    geom = _classical_geometry(bgr)
    if not _plausible(geom, bgr.shape):
        geom = det.geometry_from_semantic(dets)
        if not _plausible(geom, bgr.shape):
            geom = None
    lids = find_eyelids(bgr, geom) if geom else {}

    # 동공 안·눈꺼풀 위·홍채 밖에 걸친 검출은 보이는 홍채 영역으로 잘라내고, 절반 이상 밖이면 버린다
    ms = min(1.0, 800 / max(bgr.shape[:2]))
    mask = visible_iris_mask(bgr.shape, geom, lids, ms) if geom else None
    excluded = {"pupil": 0, "eyelid": 0, "outside": 0}
    lesions = []
    for d in sorted((d for d in dets if d["kind"] != "semantic"), key=lambda d: -d["confidence"]):
        pts = d["points"]
        if mask is not None:
            clipped = clip_to_mask(d["shape"], pts, mask, ms)
            if clipped is None:
                excluded[exclusion_reason(pts, geom, lids)] += 1
                continue
            pts = clipped
        les = {**d, "id": len(lesions) + 1, "points": pts, "labelAt": label_point(d["shape"], pts)}
        les["organs"] = det.organs_for(pts, geom, eye)
        les["position"] = det.radial_position(pts, geom)
        lesions.append(les)

    keys = [c["key"] for c in det.classes]
    color_of = {k: _PALETTE[i % len(_PALETTE)] for i, k in enumerate(keys)}
    summary: dict = {}
    for l in lesions:
        e = summary.setdefault(l["key"], {"key": l["key"], "label": l["label"], "count": 0,
                                          "color": "#%02x%02x%02x" % color_of[l["key"]][::-1]})
        e["count"] += 1

    eye_score = max(30, min(95, round(EYE_BASE - EYE_PER_LESION * sum(l["confidence"] for l in lesions))))
    zones = _build_zones(lesions)
    zone_v = {z["name"]: z["density"] for z in zones}
    return {
        "eye":             eye,
        "leftScore":       eye_score,
        "rightScore":      eye_score,
        "skinZone":        zone_v["Skin"],
        "thyroidZone":     zone_v["Thyroid"],
        "zones":           zones,
        "lesions":         lesions,
        "lesionSummary":   sorted(summary.values(), key=lambda e: -e["count"]),
        "geometry":        {k: (round(v, 1) if isinstance(v, float) else v) for k, v in geom.items()} if geom else None,
        "eyelids":         {k: {"y0": round(v["y0"], 1), "a": v["a"]} for k, v in lids.items()},
        "excluded":        excluded,
        "pupil":           {"cx": round(geom["cx"], 1), "cy": round(geom["cy"], 1), "r": round(geom["pupilR"], 1)} if geom else None,
        "iris":            {"cx": round(geom["cx"], 1), "cy": round(geom["cy"], 1), "r": round(geom["limbusR"], 1)} if geom else None,
        "organMap":        bool(det.organ_maps.get(eye)),
        "model":           {"source": "LUDIA LAB", "runId": det.card.get("run_id"), "exportedAt": det.card.get("exported_at"),
                            "valMiou": (det.card.get("metrics") or {}).get("val_miou"),
                            "trainImages": ((det.card.get("metrics") or {}).get("n") or {}).get("train"),
                            "reliable": ((det.card.get("metrics") or {}).get("val_miou") or 0) >= RELIABLE_VAL_MIOU,
                            "classes": [{"key": c["key"], "label": c.get("label", c["key"])} for c in det.classes if c.get("kind") != "semantic"]},
        "annotatedImage":  _draw(bgr, geom, lesions, color_of, lids),
        # 병소 없이 홍채/동공 원만 그린 이미지 + 원본 크기 — 화면에서 병소를 골라 SVG로 겹쳐 그릴 때 사용
        "baseImage":       _draw(bgr, geom, [], color_of, lids),
        "imageSize":       {"w": int(bgr.shape[1]), "h": int(bgr.shape[0])},
        "disclaimer":      "연구용 병소 후보 검출 결과입니다. 의료 진단이 아니며 전문가 판독을 대신하지 않습니다.",
    }


# ── 엔드포인트 ─────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    det = get_detector()
    return {"status": "ok", "mode": "LUDIA LAB lesion model" if det else "no-model",
            "model": {"runId": det.card.get("run_id"), "classes": [c["key"] for c in det.classes],
                      "organMapEyes": sorted(det.organ_maps)} if det else None,
            "error": None if det else detector_error()}


def _eye(v: Optional[str]) -> str:
    return "left" if (v or "").lower() in ("left", "l", "os") else "right"


@app.post("/analyze")
async def analyze(file: UploadFile = File(...), eye: Optional[str] = Form(None)):
    return _analyze(await file.read(), _eye(eye))


@app.post("/analyze/detailed")
async def analyze_detailed(file: UploadFile = File(...), eye: Optional[str] = Form(None)):
    return _analyze(await file.read(), _eye(eye))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=False)
