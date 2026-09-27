"""
iris_region.py — 병소가 있을 수 있는 "보이는 홍채" 영역을 구한다.

  보이는 홍채 = 동공 원 바깥 ∩ 홍채(윤부) 원 안쪽 ∩ 위 눈꺼풀 아래 ∩ 아래 눈꺼풀 위

LUDIA 병소 모델에는 눈꺼풀 클래스가 없고 동공/홍채 분할도 학습 데이터가 적어 부정확하므로,
이 영역을 고전적 방법으로 따로 구해 동공 안·눈꺼풀 위·공막에 찍힌 검출을 걸러낸다.

눈꺼풀 검출: 눈꺼풀 피부는 홍채보다 훨씬 밝다는 점을 이용한다.
  1) 3·9시 방향 홍채 밝기(눈꺼풀에 거의 안 가림)와 홍채 바깥 링 밝기의 중간값을 임계값으로 둔다
  2) 홍채 원 안에서 열마다 가장자리 → 중심 쪽으로 내려가며 밝은 픽셀이 계속 이어지는 깊이를 찾는다
  3) 그 점들에 포물선 y = y0 + a·(x − cx)² 를 RANSAC 으로 맞춘다 (가려진 열이 적으면 눈꺼풀 없음)
"""

from __future__ import annotations

from typing import Dict, List, Optional

import cv2
import numpy as np

_WORK_R = 160.0          # 눈꺼풀 탐색 시 홍채 반경을 이 크기(px)로 맞춰 계산


def find_eyelids(bgr: np.ndarray, g: dict) -> Dict[str, dict]:
    """→ {"upper": {"y0", "a"}, "lower": {...}} (원본 픽셀 좌표). 홍채를 가리지 않는 쪽은 빠진다."""
    R, rp, cx, cy = g["limbusR"], g["pupilR"], g["cx"], g["cy"]
    s = _WORK_R / R
    gray = cv2.cvtColor(cv2.resize(bgr, None, fx=s, fy=s, interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY)
    gray = cv2.medianBlur(gray, 5).astype(np.float32)
    H, W = gray.shape
    R_, rp_, cx_, cy_ = R * s, rp * s, cx * s, cy * s

    yy, xx = np.mgrid[0:H, 0:W]
    d = np.hypot(xx - cx_, yy - cy_)
    ang = np.degrees(np.arctan2(yy - cy_, xx - cx_))
    band = (d > rp_ + 0.3 * (R_ - rp_)) & (d < rp_ + 0.8 * (R_ - rp_))
    side = band & ((np.abs(ang) < 30) | (np.abs(ang) > 150))
    if not band.any():
        return {}
    iris_v = np.median(gray[side]) if side.any() else np.median(gray[band])
    ring = (d > R_ * 1.08) & (d < R_ * 1.35)
    skin_v = np.percentile(gray[ring], 60) if ring.any() else np.percentile(gray, 85)
    if skin_v - iris_v < 15:              # 홍채와 주변 밝기 차이가 없으면 판단 불가
        return {}
    bright = gray > (iris_v + skin_v) / 2

    out: Dict[str, dict] = {}
    rng = np.random.default_rng(0)
    for name, sign in (("upper", -1), ("lower", 1)):
        pts = []
        for x in range(int(max(0, cx_ - 0.85 * R_)), int(min(W, cx_ + 0.85 * R_))):
            half = np.sqrt(max(R_ ** 2 - (x - cx_) ** 2, 0))
            inner = max(rp_ * 1.1, 0.35 * half) if abs(x - cx_) < rp_ else 0.35 * half
            ys = np.arange(int(cy_ + sign * half), int(cy_ + sign * inner), -sign)   # 가장자리 → 안쪽
            ys = ys[(ys >= 0) & (ys < H)]
            if len(ys) < 5:
                continue
            col = bright[ys, x].astype(np.float32)
            if col[:3].mean() <= 0.5:
                continue
            frac = np.cumsum(col) / np.arange(1, len(col) + 1)
            deep = np.where((frac >= 0.7) & (col > 0))[0]
            if len(deep) and deep.max() >= 3:
                pts.append((x, ys[deep.max()]))
        if len(pts) < 0.3 * R_:
            continue
        P = np.array(pts, np.float32)
        best = None
        for _ in range(200):
            i = rng.choice(len(P), 2, replace=False)
            u = (P[i, 0] - cx_) ** 2
            if abs(u[0] - u[1]) < 1:
                continue
            a = (P[i[0], 1] - P[i[1], 1]) / (u[0] - u[1])
            y0 = P[i[0], 1] - a * u[0]
            if a * -sign < 0 or abs(a) * R_ ** 2 > 0.9 * R_:   # 눈꺼풀 방향으로 휘고, 너무 급하지 않게
                continue
            n = int((np.abs(P[:, 1] - (y0 + a * (P[:, 0] - cx_) ** 2)) < 4).sum())
            if best is None or n > best[0]:
                best = (n, y0, a)
        if best and best[0] >= 0.25 * R_:
            out[name] = {"y0": float(best[1] / s), "a": float(best[2] * s)}
    return out


def eyelid_y(lid: dict, x, cx: float):
    return lid["y0"] + lid["a"] * (np.asarray(x, np.float64) - cx) ** 2


def visible_iris_mask(shape, g: dict, lids: Dict[str, dict], scale: float) -> np.ndarray:
    """보이는 홍채 영역 마스크 (원본 크기 × scale)."""
    H, W = int(round(shape[0] * scale)), int(round(shape[1] * scale))
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32) / scale
    d = np.hypot(xx - g["cx"], yy - g["cy"])
    m = (d > g["pupilR"] * 1.05) & (d < g["limbusR"])
    if "upper" in lids:
        m &= yy > eyelid_y(lids["upper"], xx, g["cx"])
    if "lower" in lids:
        m &= yy < eyelid_y(lids["lower"], xx, g["cx"])
    # 12시 방향으로 가는 얇은 틈 — 동공을 빙 두른 병소가 잘린 뒤 구멍 없는 다각형(C자)이 되도록
    m &= ~((np.abs(xx - g["cx"]) * scale < 1) & (yy < g["cy"]))
    return m.astype(np.uint8)


def exclusion_reason(points: List[List[float]], g: dict, lids: Dict[str, dict]) -> str:
    """보이는 홍채 밖으로 판정된 검출이 주로 어디에 있는지 — pupil | eyelid | outside."""
    p = np.asarray(points, np.float64).mean(0)
    d = float(np.hypot(p[0] - g["cx"], p[1] - g["cy"]))
    if d <= g["pupilR"] * 1.05:
        return "pupil"
    for name, sign in (("upper", -1), ("lower", 1)):
        if name in lids and sign * (p[1] - float(eyelid_y(lids[name], p[0], g["cx"]))) > 0:
            return "eyelid"
    return "outside"


def label_point(shape_kind: str, points: List[List[float]]) -> List[float]:
    """번호를 찍을 위치 — 다각형은 내부에서 가장 넓은 곳(C자 모양이어도 도형 안), 선은 가운데."""
    P = np.asarray(points, np.float64)
    if shape_kind == "polyline" or len(P) < 3:
        c = P.mean(0)
        return [round(float(c[0]), 1), round(float(c[1]), 1)]
    x0, y0 = P.min(0)
    k = 64 / max(float(np.ptp(P[:, 0])), float(np.ptp(P[:, 1])), 1e-6)
    m = np.zeros((66, 66), np.uint8)
    cv2.fillPoly(m, [np.round((P - [x0, y0]) * k).astype(np.int32) + 1], 1)
    dist = cv2.distanceTransform(m, cv2.DIST_L2, 3)
    yx = np.unravel_index(int(dist.argmax()), dist.shape)
    return [round(float((yx[1] - 1) / k + x0), 1), round(float((yx[0] - 1) / k + y0), 1)]


def clip_to_mask(shape_kind: str, points: List[List[float]], mask: np.ndarray, scale: float,
                 min_keep: float = 0.5) -> Optional[List[List[float]]]:
    """병소 도형을 보이는 홍채 영역으로 자른다. 영역 안 비율이 min_keep 미만이면 None(버림)."""
    H, W = mask.shape
    P = np.asarray(points, np.float64) * scale
    if shape_kind == "polyline":
        t = np.linspace(0, 1, 25)[:, None]
        S = P[0] + (P[-1] - P[0]) * t
        xi, yi = np.clip(S[:, 0].astype(int), 0, W - 1), np.clip(S[:, 1].astype(int), 0, H - 1)
        inside = mask[yi, xi] > 0
        if inside.mean() < min_keep:
            return None
        k = np.where(inside)[0]
        return [[round(float(v) / scale, 1) for v in S[k[0]]], [round(float(v) / scale, 1) for v in S[k[-1]]]]

    poly = np.zeros_like(mask)
    cv2.fillPoly(poly, [np.round(P).astype(np.int32)], 1)
    total = int(poly.sum())
    if total == 0:
        return None
    inter = poly & mask
    if inter.sum() / total < min_keep:
        return None
    if inter.sum() == total:
        return points
    cnts, _ = cv2.findContours(inter, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    c = max(cnts, key=cv2.contourArea)
    c = cv2.approxPolyDP(c, 0.004 * cv2.arcLength(c, True), True)[:, 0, :]
    if len(c) < 3:
        return None
    return [[round(float(x) / scale, 1), round(float(y) / scale, 1)] for x, y in c]
