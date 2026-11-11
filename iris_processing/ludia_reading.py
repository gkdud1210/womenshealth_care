"""
LUDIA HEALTH 리포트와 같은 홍채 판독 — 같은 Mac에서 도는 LUDIA AI 엔진(ludia-health ai-engine, 127.0.0.1:8765)을 그대로 부른다.
(2026-11-11 사용자 — "ludiahealth랑 똑같이 앱에서 홍채가 분석되도록, 홍채 병소가 그대로 감지되게")

  /reading/predict      최종본 리포트로 학습한 판독 모델 — 구역(우안 R01–14·좌안 L01–15)별 방사선·색소 반점·열공·움(크립트)
                        + 전역 소견(나트륨/칼슘 링 등). ludiahealth 리포트 '🤖 자동 생성'과 같은 호출.
  /iris3d/ring_signs    콜레스테롤 링(규칙, 리포트 자동 생성과 같음)
  /iris3d/color_spots   색 편차 덩어리 — 병소 위치를 사진 위에 그릴 윤곽

엔진 모델이 재학습되면 앱 결과도 그대로 따라간다. 엔진이 꺼져 있으면 None.
"""
from __future__ import annotations

import base64
import json
import math
import os
import urllib.request
from typing import Optional

import cv2
import numpy as np

ENGINE = os.environ.get("LUDIA_ENGINE_URL", "http://127.0.0.1:8765")

# index.html LEFT_ZONES / RIGHT_ZONES 와 같은 표 (각도: 12시 = 0°, 시계 방향)
ZONES = {
    "left": [("L01", "0~1시", "뇌하수체·후두부", 0, 30), ("L02", "1~2시", "소뇌·연수·귀", 30, 60), ("L03", "2~3시", "폐·기관지", 60, 85),
             ("L04", "3시", "심장", 85, 97), ("L05", "3~4시", "유선·가슴·늑골", 97, 127), ("L06", "4~5시", "췌장꼬리·비장", 127, 150),
             ("L07", "5시", "난소·정소", 150, 162), ("L08", "5~6시", "골반·다리", 162, 185), ("L09", "6~7시", "콩팥·부신", 185, 215),
             ("L10", "7~8시", "직장·방광·척추", 215, 243), ("L11", "8~9시", "허리·횡경막", 243, 265), ("L12", "9시", "갑상선", 265, 277),
             ("L13", "9~10시", "혀·인두·후두", 277, 302), ("L14", "10~11시", "안면·눈·망막", 302, 332), ("L15", "11~12시", "전두엽·언어", 332, 360)],
    "right": [("R01", "0~1시", "전두엽·언어", 0, 30), ("R02", "1~2시", "안면·눈·망막", 30, 58), ("R03", "2~3시", "혀·인두·후두", 58, 82),
              ("R04", "3시", "갑상선", 82, 95), ("R05", "3~4시", "견갑골·척추", 95, 125), ("R06", "4~5시", "방광", 125, 155),
              ("R07", "5~6시", "자궁·콩팥·부신", 155, 178), ("R08", "6시", "다리·콩팥", 178, 190), ("R09", "6~7시", "골반·난소·췌장", 190, 220),
              ("R10", "7~8시", "간·담", 220, 250), ("R11", "8~9시", "팔·가슴·유선", 250, 280), ("R12", "9~10시", "폐·기관지", 280, 310),
              ("R13", "10~11시", "귀·청각신경", 310, 338), ("R14", "11~12시", "소뇌·연수·후두부", 338, 360)],
}
CODE_LABEL = {"rad": "방사선 (Radii Solaris)", "pig": "색소 반점 (Pigment)", "lac": "열공 (Lacuna)", "cry": "움 (Crypt)"}
# 색 편차 덩어리 중 이 병소의 위치로 쓸 종류 — reading._cells_for 와 같은 짝
SPOT_KIND = {"pig": ("pigment",), "cry": ("crypt",), "lac": ("crypt", "pigment"), "rad": ("crypt",)}
FLAG_LABEL = {"cho": "콜레스테롤 링", "na_ring": "나트륨/칼슘 링", "dark_veil": "흑색 테두리", "ner": "긴장륜(스트레스 링)",
              "stress_ring": "긴장륜(스트레스 링)", "lym": "림프 로제트", "vas": "혈관 변화"}
FLAG_NOTE = {"cho": "홍채 가장자리를 두르는 뿌연 흰 띠 — 지질 대사·순환 관리 신호로 봅니다.",
             "na_ring": "홍채 바깥쪽 백색~회백색 동심원 — 칼슘·미네랄 대사, 혈관·관절 관리 신호로 봅니다."}


def _post(path: str, body: dict, timeout: int = 120) -> dict:
    req = urllib.request.Request(ENGINE + path, json.dumps(body).encode(), {"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read().decode())
        except Exception:
            return {"error": f"HTTP {e.code}"}


def available() -> bool:
    try:
        with urllib.request.urlopen(ENGINE + "/status", timeout=3) as r:
            return r.status == 200
    except Exception:
        return False


def _wedge(geom: dict, s: float, e: float, r0: float = 0.35, r1: float = 0.9) -> list:
    """구역 부채꼴(홍채 반경 r0~r1) 폴리곤 — 색 편차 덩어리가 없을 때 그 구역을 표시."""
    cx, cy, pr, lr = geom["cx"], geom["cy"], geom["pupilR"], geom["limbusR"]
    ra, rb = pr + (lr - pr) * r0, pr + (lr - pr) * r1
    angs = np.linspace(s, e, max(4, int((e - s) / 3)))
    pt = lambda a, r: [round(cx + r * math.sin(math.radians(a)), 1), round(cy - r * math.cos(math.radians(a)), 1)]
    return [pt(a, rb) for a in angs] + [pt(a, ra) for a in angs[::-1]]


def analyze(bgr: np.ndarray, eye: str, geom: Optional[dict], institution: str = "") -> Optional[dict]:
    """사진(BGR) + 경계 → ludiahealth 판독과 같은 병소·전역 소견. 엔진이 꺼져 있으면 None."""
    if not available():
        return None
    ok, buf = cv2.imencode(".jpg", bgr, [cv2.IMWRITE_JPEG_QUALITY, 92])
    b64 = base64.b64encode(buf).decode()
    h, w = bgr.shape[:2]
    g = {"cx": geom["cx"], "cy": geom["cy"], "pupilR": geom["pupilR"], "limbusR": geom["limbusR"], "imgW": w, "imgH": h} if geom else None
    payload = {"image_base64": b64, "geometry": g}
    r = _post("/reading/predict", {"eyes": {eye: payload}, "institution": institution})
    if not r.get("success"):
        return {"error": r.get("error") or "판독 모델 호출 실패"}
    e = (r.get("eyes") or {}).get(eye) or {}
    if e.get("error"):
        return {"error": e["error"]}
    geo = e.get("geometry") or g
    spots = (_post("/iris3d/color_spots", payload).get("spots") or [])
    zones = {z[0]: z for z in ZONES[eye]}
    lesions = []
    for m in e.get("marks") or []:
        zid, s_, e_ = m["zone"], zones[m["zone"]][3], zones[m["zone"]][4]
        best = None
        for sp in spots:
            if s_ <= sp["theta"] < e_ and sp["kind"] in SPOT_KIND.get(m["code"], ()) and (best is None or sp["score"] > best["score"]):
                best = sp
        pts = [[round(float(x), 1), round(float(y), 1)] for x, y in best["points"]] if best else _wedge(geo, s_, e_)
        z = zones[zid]
        mid = (s_ + e_) / 2 if not best else best["theta"]
        lesions.append({"key": m["code"], "label": CODE_LABEL.get(m["code"], m.get("name", m["code"])), "confidence": float(m["p"]),
                        "kind": "instance", "shape": "polygon", "points": pts, "zone": zid, "zoneName": z[2], "zoneTime": z[1],
                        "located": "spot" if best else "zone",
                        "organs": [{"name": z[2], "pct": 100}],
                        "position": {"clock": int(round(mid / 30)) % 12 or 12, "rel": None}})
    flags = []
    for f in r.get("flags") or []:
        if f == "cho":
            continue   # 콜레스테롤 링은 규칙(ring_signs)으로 — 리포트 자동 생성과 같게
        flags.append({"key": f, "label": FLAG_LABEL.get(f, f), "note": FLAG_NOTE.get(f, ""), "score": (r.get("flag_scores") or {}).get(f)})
    rg = _post("/iris3d/ring_signs", payload)
    cho = ((rg.get("rings") or {}).get("cho") or {}) if rg.get("success") else {}
    if cho.get("flag"):
        flags.insert(0, {"key": "cho", "label": FLAG_LABEL["cho"], "note": FLAG_NOTE["cho"], "score": cho.get("score")})
    return {"lesions": lesions, "flags": flags, "model": r.get("model"), "candidates": len(e.get("top") or []),
            "geometry": geo}
