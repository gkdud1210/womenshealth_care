"""
ludia_lesion.py — LUDIA LAB에서 학습·내보낸 홍채 병소 모델(ONNX)로 사진에서 병소를 검출한다.

모델 묶음(models/ludia_lab/)은 scripts/import_ludia_model.py 가 ludia-health AI 엔진에서 받아온다:
  model.onnx        입력 [1,3,S,S] RGB 0..1 (정규화·sigmoid는 모델 내부) → 출력 [1,C,S,S] 클래스별 확률
  model_card.json   클래스 목록(key/label/kind/shape), 후처리 임계값
  organ_map.json    홍채 장기지도 (눈별 30링 × 120섹터 → 장기 이름) — 없으면 장기 조회 생략

후처리는 ludia-health ai-engine/lab_train.py:predict_annotations 와 동일하게 맞춘다
(학습 때와 다른 방식으로 자르면 모델 결과가 달라지므로 바꾸지 말 것).

좌표 규칙(ludia-health lab.html organAt 과 동일):
  링 = 동공반경~홍채반경을 rings 등분(안→밖), 섹터 = 12시부터 시계방향 sectors 등분.

주의: 연구용 병소 후보 검출기다. 의료기기가 아니며 진단 근거로 단독 사용해서는 안 된다.
"""

from __future__ import annotations

import json
import math
import os
from typing import Dict, List, Optional

import cv2
import numpy as np

MODEL_DIR = os.environ.get(
    "LUDIA_LAB_MODEL_DIR",
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models", "ludia_lab"),
)


class LesionDetector:
    def __init__(self, model_dir: str = MODEL_DIR):
        import onnxruntime as ort

        with open(os.path.join(model_dir, "model_card.json"), encoding="utf-8") as f:
            self.card = json.load(f)
        self.sess = ort.InferenceSession(os.path.join(model_dir, "model.onnx"), providers=["CPUExecutionProvider"])
        self.size = int(self.card["input"]["shape"][2])
        self.classes: List[dict] = self.card["classes"]
        pp = self.card.get("postprocess", {})
        self.thr = float(pp.get("threshold", 0.5))
        self.min_area = float(pp.get("min_area_px_at_model_resolution", 6))
        self.organ_maps: Dict[str, dict] = {}
        om_path = os.path.join(model_dir, "organ_map.json")
        if os.path.exists(om_path):
            with open(om_path, encoding="utf-8") as f:
                self.organ_maps = json.load(f)

    # ── 추론 ──────────────────────────────────────────────────────────────
    def predict(self, bgr: np.ndarray) -> List[dict]:
        """사진 → [{key,label,kind,shape,points,confidence,area}] (원본 픽셀 좌표)."""
        H, W = bgr.shape[:2]
        S = self.size
        rgb = cv2.cvtColor(cv2.resize(bgr, (S, S), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2RGB)
        x = (rgb.astype(np.float32) / 255.0).transpose(2, 0, 1)[None]
        prob = self.sess.run(None, {self.card["input"]["name"]: x})[0][0]   # (C,S,S)
        sx, sy = W / S, H / S
        out = []
        for c in self.classes:
            ci = c["index"]
            mask = (prob[ci] > self.thr).astype(np.uint8)
            cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            cands = []
            for cnt in cnts:
                area = cv2.contourArea(cnt)
                if area < self.min_area:
                    continue
                cm = np.zeros_like(mask)
                cv2.drawContours(cm, [cnt], -1, 1, -1)
                cands.append((area, cnt, float(prob[ci][cm > 0].mean())))
            if c.get("kind") == "semantic":          # 홍채·동공 등은 이미지당 1개 — 가장 큰 덩어리만
                cands = sorted(cands, key=lambda t: -t[0])[:1]
            for area, cnt, conf in cands:
                if c.get("shape") == "polyline":     # 선형 병소: 장축 양 끝점 2점
                    (cx, cy), (rw, rh), ang = cv2.minAreaRect(cnt)
                    L = max(rw, rh) / 2
                    th = np.deg2rad(ang if rw >= rh else ang + 90)
                    pts = [[(cx - L * np.cos(th)) * sx, (cy - L * np.sin(th)) * sy],
                           [(cx + L * np.cos(th)) * sx, (cy + L * np.sin(th)) * sy]]
                    shape = "polyline"
                else:
                    ap = cv2.approxPolyDP(cnt, 0.004 * cv2.arcLength(cnt, True), True)[:, 0, :]
                    if len(ap) < 3:
                        continue
                    pts = [[float(p[0]) * sx, float(p[1]) * sy] for p in ap]
                    shape = "polygon"
                out.append({
                    "key": c["key"], "label": c.get("label", c["key"]), "kind": c.get("kind", "instance"), "shape": shape,
                    "points": [[round(a, 1), round(b, 1)] for a, b in pts],
                    "confidence": round(conf, 3), "area": round(area * sx * sy, 1),
                })
        return out

    # ── 기하 / 장기 조회 ───────────────────────────────────────────────────
    @staticmethod
    def geometry_from_semantic(dets: List[dict]) -> Optional[dict]:
        """모델이 찾은 iris/pupil 영역 → 같은 넓이의 원 (lab.html geomFromLabels 와 동일 규칙)."""
        def stat(key):
            d = next((d for d in dets if d["key"] == key and d["shape"] == "polygon"), None)
            if not d:
                return None
            c = np.array(d["points"], np.float32)
            m = cv2.moments(c)
            if abs(m["m00"]) < 1e-6:
                return None
            return m["m10"] / m["m00"], m["m01"] / m["m00"], abs(m["m00"])
        ir, pu = stat("iris"), stat("pupil")
        if ir and pu:
            return {"cx": pu[0], "cy": pu[1], "pupilR": math.sqrt(pu[2] / math.pi), "limbusR": math.sqrt(ir[2] / math.pi), "src": "model"}
        if ir:
            R = math.sqrt(ir[2] / math.pi)
            return {"cx": ir[0], "cy": ir[1], "pupilR": R * 0.2, "limbusR": R, "src": "model-iris"}
        return None

    def organs_for(self, points: List[List[float]], geom: dict, eye: str) -> List[dict]:
        """병소 도형 안(또는 선 위)의 점들이 어느 장기 구역에 얼마나 걸치는지 → [{name,pct}] 큰 순."""
        om = self.organ_maps.get(eye)
        if not om or not geom:
            return []
        rings, sectors, names, idx = om["rings"], om["sectors"], om["names"], om["idx"]
        samples = _sample_shape(points)
        cnt: Dict[str, int] = {}
        inside = 0
        for x, y in samples:
            dx, dy = x - geom["cx"], y - geom["cy"]
            r = math.hypot(dx, dy)
            if r < geom["pupilR"] or r > geom["limbusR"]:
                continue
            inside += 1
            ring = min(rings - 1, int((r - geom["pupilR"]) / (geom["limbusR"] - geom["pupilR"]) * rings))
            a = math.atan2(dx, -dy) / (2 * math.pi) % 1.0
            sec = min(sectors - 1, int(a * sectors))
            k = idx[ring * sectors + sec]
            n = names[k] if k >= 0 else None
            if n:
                cnt[n] = cnt.get(n, 0) + 1
        if not inside:
            return []
        return [{"name": n, "pct": round(100 * v / inside)} for n, v in sorted(cnt.items(), key=lambda t: -t[1])][:3]

    @staticmethod
    def radial_position(points: List[List[float]], geom: dict) -> Optional[dict]:
        """병소 무게중심의 홍채 내 위치: rel(0=동공경계, 1=홍채경계), clock(1~12시)."""
        if not geom:
            return None
        xs = [p[0] for p in points]; ys = [p[1] for p in points]
        cx, cy = sum(xs) / len(xs), sum(ys) / len(ys)
        dx, dy = cx - geom["cx"], cy - geom["cy"]
        r = math.hypot(dx, dy)
        rel = (r - geom["pupilR"]) / max(geom["limbusR"] - geom["pupilR"], 1e-6)
        clock = int(round((math.atan2(dx, -dy) / (2 * math.pi) % 1.0) * 12)) or 12
        return {"rel": round(rel, 3), "clock": clock}


def _sample_shape(points: List[List[float]], step: int = 60) -> List[tuple]:
    """폴리곤이면 내부 격자점, 선이면 선분 위 점들."""
    if len(points) == 2:
        (x0, y0), (x1, y1) = points
        return [(x0 + (x1 - x0) * t / 20, y0 + (y1 - y0) * t / 20) for t in range(21)]
    pts = np.array(points, np.float32)
    x0, y0 = pts.min(0); x1, y1 = pts.max(0)
    n = max(4, min(step, int(max(x1 - x0, y1 - y0))))
    out = []
    cnt = pts.reshape(-1, 1, 2)
    for i in range(n):
        for j in range(n):
            x = x0 + (x1 - x0) * (i + 0.5) / n
            y = y0 + (y1 - y0) * (j + 0.5) / n
            if cv2.pointPolygonTest(cnt, (float(x), float(y)), False) >= 0:
                out.append((x, y))
    if not out:
        out = [tuple(pts.mean(0))]
    return out


_detector: Optional[LesionDetector] = None
_detector_err: Optional[str] = None


def get_detector() -> Optional[LesionDetector]:
    """모델이 없으면 None (서비스는 기하 검출만 하는 기본 모드로 동작)."""
    global _detector, _detector_err
    if _detector is None and _detector_err is None:
        try:
            _detector = LesionDetector()
        except Exception as e:  # 모델 파일 없음 / onnxruntime 없음
            _detector_err = f"{type(e).__name__}: {e}"
    return _detector


def detector_error() -> Optional[str]:
    return _detector_err
