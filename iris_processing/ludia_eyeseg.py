"""
LUDIA LAB '자동 경계 찾기' + '동공 소견' — ludia-health에서 가져온 ONNX 분할 모델과 계산 코드(ludia_v3/)를 쓴다.
(2026-11-11 — LUDIA LAB에서 쓰는 여러 분류 감지를 이 앱 홍채 검진에도)

  분할 모델(models/ludia_eyeseg/model.onnx): 사진 → 배경·눈꺼풀·홍채·동공·반사광 5분류
  경계: 동공 = 동공 소견 방식(밝기 경계 + 타원), 홍채 = 모델 홍채 영역에 맞춘 원(일부가 눈꺼풀에 가려도)
  분석 영역: 홍채 원 안 ∧ 동공 밖 ∧ 눈꺼풀·반사광 아님 — 병소는 이 안에서만
  동공 소견: 동공 오른쪽(사진 기준, 두 눈 모두) 척추 구간 경추 12~1시 반 · 흉추 1시 반~4시 반 · 요추 4시 반~6시가
             안쪽으로 납작/바깥으로 불룩한지 + 검은 동공 바로 겉 테두리에 붙은 회색 테(위 고리, 2026-11-12 원장 기준)

설치·교체: python3 scripts/import_ludia_model.py --eyeseg ~/ludia-health/ai-engine/data/lab_exports/eyeseg_export.zip
연구·웰니스 참고용 후보이며 의료 진단이 아니다.
"""
from __future__ import annotations

import json
import os
from typing import Optional

import cv2
import numpy as np

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models", "ludia_eyeseg")

_S: dict = {"sess": None, "meta": None, "error": None}


def _load():
    if _S["sess"] is not None or _S["error"]:
        return _S["sess"]
    try:
        import onnxruntime as ort
        _S["meta"] = json.load(open(os.path.join(MODEL_DIR, "meta.json"), encoding="utf-8"))
        _S["sess"] = ort.InferenceSession(os.path.join(MODEL_DIR, "model.onnx"), providers=["CPUExecutionProvider"])
    except Exception as e:  # 모델이 없으면 예전 방식(밝기 원 검출)으로 동작
        _S["error"] = str(e)
    return _S["sess"]


def available() -> bool:
    return _load() is not None


def error() -> Optional[str]:
    return _S["error"]


def meta() -> dict:
    _load()
    return _S["meta"] or {}


def predict_mask(rgb: np.ndarray) -> np.ndarray:
    """ludia-health eyeseg.predict_mask와 같은 계산(letterbox 256, 좌우 뒤집기 평균) → 원본 크기 class 마스크."""
    from ludia_v3 import eyeseg as E
    sess = _load()
    h, w = rgb.shape[:2]
    li, _, (s, x0, y0, nw, nh) = E._letterbox(rgb)
    x = np.stack([li, li[:, ::-1]]).astype(np.float32).transpose(0, 3, 1, 2) / 255.0
    o = sess.run(None, {"image": np.ascontiguousarray(x)})[0]
    prob = (o[0] + o[1][:, :, ::-1]) / 2
    prob = prob[:, y0:y0 + nh, x0:x0 + nw]
    prob = np.stack([cv2.resize(c, (w, h), interpolation=cv2.INTER_LINEAR) for c in prob])
    return prob.argmax(0).astype(np.uint8)


_KIND = {"flat": "안쪽으로 납작", "bulge": "바깥으로 불룩"}
_LEVEL = {"strong": "뚜렷", "candidate": "후보", "none": "없음", "unseen": "가려서 못 봄"}
_CARE = {"cervical": "목·어깨", "thoracic": "등", "lumbar": "허리·골반"}


def _pupil_findings(rgb: np.ndarray, geo) -> Optional[dict]:
    from ludia_v3 import pupil_signs as PS
    res = PS.judge(PS.pupil_signs(rgb, geo))
    if not res.get("ok"):
        return {"ok": False, "reason": res.get("reason")}
    p, r = res["pupil"], res["gastric_ring"]
    segs = [{"key": s["key"], "name": s["name"], "level": s["level"], "levelLabel": _LEVEL[s["level"]],
             "kind": s.get("kind"), "kindLabel": _KIND.get(s.get("kind"), ""), "at": s.get("at"), "atDeg": s.get("at_deg"),
             "amount": s.get("amount")} for s in p.get("spine_segments") or []]
    found = [s for s in segs if s["level"] in ("candidate", "strong")]
    if found:
        parts = ", ".join(f"{s['name']}({(s['at'] or '').split('(')[0]} 쪽이 {s['kindLabel']})" for s in found)
        care = "·".join(dict.fromkeys(_CARE[s["key"]] for s in found))
        spine_text = f"동공 척추 구간에서 {parts} 일그러짐이 보입니다. {care}의 자세와 좌우 균형을 살펴보세요."
    else:
        spine_text = "동공 척추 구간(경추·흉추·요추)에서 뚜렷한 일그러짐은 보이지 않습니다."
    ring_text = {"strong": "검은 동공 바로 겉 테두리에 회색빛 테(위 고리)가 뚜렷합니다 — 위가 약하고 위염 가능성이 높은 신호로 봅니다. 맵고 짠 음식·과식·빈속 커피를 줄이고 따뜻한 음식을 천천히 드세요.",
                 "candidate": "검은 동공 바로 겉 테두리에 회색빛 테(위 고리) 후보가 보입니다 — 속쓰림·더부룩함이 있는지 살펴보세요.",
                 "none": "동공 테두리에 붙은 회색 테(위 고리)는 보이지 않습니다."}[r.get("level") or "none"]
    if r.get("blurry"):
        ring_text = "사진이 흐려 동공 테두리의 회색 테(위 고리)는 판단하지 않았습니다 — 초점을 맞춰 다시 찍으면 볼 수 있어요."
    return {"ok": True,
            "spine": {"level": p["spine_level"], "levelLabel": _LEVEL[p["spine_level"]], "where": p.get("spine_where"),
                      "segments": segs, "text": spine_text},
            "shape": {"level": p["shape_level"], "levelLabel": _LEVEL[p["shape_level"]]},
            "gastricRing": {"level": r.get("level") or "none", "levelLabel": "흐려서 판단 안 함" if r.get("blurry") else _LEVEL[r.get("level") or "none"],
                            "arc": r.get("arc"), "text": ring_text},
            "note": "동공 소견은 사진 기준 오른쪽(두 눈 모두)을 척추로 봅니다 — 12시 경추 · 3시 흉추 · 6시 요추. 후보 표시이며 진단이 아닙니다."}


def analyze(bgr: np.ndarray) -> Optional[dict]:
    """사진(BGR) → 경계·분석 영역·동공 소견. 모델이 없거나 동공/홍채를 못 찾으면 None."""
    if not available():
        return None
    from ludia_v3 import eyeseg as E
    from ludia_v3.preprocess import Geo
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    h, w = rgb.shape[:2]
    cls = predict_mask(rgb)
    g = E.auto_geometry(cls, rgb)
    pu, ir = g.get("pupil"), g.get("iris")
    if not (pu and ir) or not (1.6 * pu["r"] <= ir["r"] <= 0.75 * max(h, w)):
        return None
    pupil_e = ((pu["cx"], pu["cy"]), (pu["a"] * 2, pu["b"] * 2), pu["rot"])
    iris_e = ((ir["cx"], ir["cy"]), (ir["a"] * 2, ir["b"] * 2), ir["rot"])
    occ = (cls == 1) | (cls == 4)
    m = np.zeros((h, w), np.uint8)
    cv2.ellipse(m, iris_e, 1, -1)
    cv2.ellipse(m, pupil_e, 0, -1)
    region = (m > 0) & ~occ
    geo = Geo(float(pu["cx"]), float(pu["cy"]), float(pu["r"]), float(ir["r"]), "eyeseg")
    try:
        pf = _pupil_findings(rgb, geo)
    except Exception as e:
        pf = {"ok": False, "reason": f"동공 소견 계산 실패: {e}"}
    return {"cls": cls, "region": region, "pupil": pu, "iris": ir, "pupil_e": pupil_e, "iris_e": iris_e,
            "geometry": {"cx": float(pu["cx"]), "cy": float(pu["cy"]), "pupilR": float(pu["r"]), "limbusR": float(ir["r"]),
                         "irisCx": float(ir["cx"]), "irisCy": float(ir["cy"]), "source": "ludia_eyeseg"},
            "eyelidPolys": E.mask_polygons(cls, 1, 40), "pupilFindings": pf,
            "irisVisible": ir.get("visible"), "pupilSource": pu.get("source")}
