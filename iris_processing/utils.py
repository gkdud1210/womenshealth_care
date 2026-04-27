"""
Utility functions for iris coordinate transformation and image processing.

Provides:
  - Algebraic circle fitting from landmark points
  - Daugman Rubber Sheet remap-map builder (eccentric-centre support)
  - Circular mask creation
  - HoughCircles-based pupil detector operating inside an iris ROI
"""

from __future__ import annotations

import logging
from typing import Optional, Tuple

import cv2
import numpy as np

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Circle fitting
# ---------------------------------------------------------------------------

def compute_circle_from_points(points: np.ndarray) -> Tuple[float, float, float]:
    """
    Algebraic least-squares circle fit to N × 2 float points.

    Solves the linear system derived from (x-a)² + (y-b)² = r² to find
    centre (a, b) and radius r.  Falls back to centroid + mean distance when
    the matrix is rank-deficient.

    Returns:
        (cx, cy, radius) as floats.
    """
    pts = np.asarray(points, dtype=np.float64)
    if pts.ndim != 2 or pts.shape[1] != 2:
        raise ValueError("points must be an N×2 array")

    x, y = pts[:, 0], pts[:, 1]
    A = np.column_stack([2.0 * x, 2.0 * y, np.ones(len(x))])
    b = x ** 2 + y ** 2

    try:
        result, _, rank, _ = np.linalg.lstsq(A, b, rcond=None)
        if rank < 3:
            raise np.linalg.LinAlgError("rank-deficient")
        cx, cy = result[0], result[1]
        r2 = result[2] + cx ** 2 + cy ** 2
        radius = float(np.sqrt(max(r2, 0.0)))
    except np.linalg.LinAlgError:
        cx, cy = x.mean(), y.mean()
        radius = float(np.sqrt(((x - cx) ** 2 + (y - cy) ** 2).mean()))

    return float(cx), float(cy), radius


# ---------------------------------------------------------------------------
# Daugman Rubber Sheet remap maps
# ---------------------------------------------------------------------------

def build_rubber_sheet_maps(
    pupil_cx: float,
    pupil_cy: float,
    pupil_r: float,
    iris_cx: float,
    iris_cy: float,
    iris_r: float,
    norm_width: int = 512,
    norm_height: int = 64,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Build (map_x, map_y) arrays for cv2.remap implementing Daugman's Rubber
    Sheet Model with eccentricity support.

    For each output pixel (row i, col j):
        θ  = 2π · j / norm_width          — angle in [0, 2π)
        ρ  = i / (norm_height − 1)         — normalised radius in [0, 1]
                                             0 → pupil boundary
                                             1 → iris boundary

    Source image coordinate (linear interpolation between eccentric circles):
        x_src = (1−ρ)·(pupil_cx + pupil_r·cos θ) + ρ·(iris_cx + iris_r·cos θ)
        y_src = (1−ρ)·(pupil_cy + pupil_r·sin θ) + ρ·(iris_cy + iris_r·sin θ)

    Args:
        pupil_cx / pupil_cy / pupil_r : pupil circle parameters (pixels)
        iris_cx  / iris_cy  / iris_r  : iris circle parameters  (pixels)
        norm_width  : output strip width  (columns = angular samples)
        norm_height : output strip height (rows    = radial  samples)

    Returns:
        (map_x, map_y) — float32 arrays of shape (norm_height, norm_width)
        suitable for cv2.remap.
    """
    # Angular samples — one full revolution across the strip width
    theta = (2.0 * np.pi * np.arange(norm_width, dtype=np.float64) / norm_width)  # (W,)

    cos_t = np.cos(theta)
    sin_t = np.sin(theta)

    # Boundary sample points for each angle
    px = pupil_cx + pupil_r * cos_t   # (W,)  pupil ring x
    py = pupil_cy + pupil_r * sin_t   # (W,)  pupil ring y
    ix = iris_cx  + iris_r  * cos_t   # (W,)  iris ring x
    iy = iris_cy  + iris_r  * sin_t   # (W,)  iris ring y

    # Normalised radii per row
    rho = np.linspace(0.0, 1.0, norm_height, dtype=np.float64)[:, np.newaxis]  # (H, 1)

    # Bilinear blend: eccentric centres handled naturally
    map_x = ((1.0 - rho) * px + rho * ix).astype(np.float32)   # (H, W)
    map_y = ((1.0 - rho) * py + rho * iy).astype(np.float32)   # (H, W)

    return map_x, map_y


# ---------------------------------------------------------------------------
# Circular mask
# ---------------------------------------------------------------------------

def create_circular_mask(
    h: int,
    w: int,
    center: Tuple[int, int],
    radius: int,
) -> np.ndarray:
    """
    Create a uint8 binary mask of shape (h, w).

    Pixels inside the circle are 255; outside are 0.
    """
    mask = np.zeros((h, w), dtype=np.uint8)
    cv2.circle(mask, (int(center[0]), int(center[1])), max(1, int(radius)), 255, thickness=-1)
    return mask


# ---------------------------------------------------------------------------
# Pupil detector
# ---------------------------------------------------------------------------

def detect_pupil_hough(
    gray: np.ndarray,
    iris_cx: float,
    iris_cy: float,
    iris_r: float,
) -> Optional[Tuple[float, float, float]]:
    """
    Detect the pupil circle inside the iris region via HoughCircles.

    The pupil is typically 20–55 % of the iris radius and is the darkest
    filled circle within the iris ROI.  The function crops to the iris
    bounding box, runs the detector, and converts results back to full-image
    coordinates.

    Args:
        gray   : full-image grayscale array.
        iris_cx, iris_cy, iris_r : iris circle in pixel coordinates.

    Returns:
        (pupil_cx, pupil_cy, pupil_r) in full-image pixel coordinates,
        or None when no pupil is found.
    """
    r_i = int(iris_r)
    x1 = max(0, int(iris_cx) - r_i)
    y1 = max(0, int(iris_cy) - r_i)
    x2 = min(gray.shape[1], int(iris_cx) + r_i)
    y2 = min(gray.shape[0], int(iris_cy) + r_i)

    roi = gray[y1:y2, x1:x2]
    if roi.size == 0:
        return None

    # ── Circular iris mask: blank pixels outside the iris circle ──────────
    # Without this, eyelashes and skin outside the iris are mistaken for pupil.
    roi_iris_mask = np.zeros(roi.shape[:2], dtype=np.uint8)
    cx_in_roi = int(iris_cx) - x1
    cy_in_roi = int(iris_cy) - y1
    cv2.circle(roi_iris_mask, (cx_in_roi, cy_in_roi), int(iris_r * 0.90), 255, -1)

    # ── Otsu threshold: find the darkest blob (pupil) in the ROI ──────────
    # Blur to suppress specular highlights before thresholding
    roi_blur = cv2.GaussianBlur(roi, (11, 11), 3)
    roi_blur[roi_iris_mask == 0] = 255   # treat outside-iris pixels as bright
    _, thresh = cv2.threshold(roi_blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # Morphological closing to fill the pupil interior
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=2)

    # Find the largest dark contour — should be the pupil
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    min_r = max(5,  int(iris_r * 0.10))
    max_r = max(10, int(iris_r * 0.55))

    best_c: Optional[tuple] = None
    best_area = 0
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < np.pi * min_r ** 2:
            continue
        (cx_r, cy_r), r_c = cv2.minEnclosingCircle(cnt)
        if not (min_r <= r_c <= max_r):
            continue
        if area > best_area:
            best_area = area
            best_c = (cx_r, cy_r, r_c)

    if best_c is not None:
        cx_r, cy_r, r_c = best_c
        log.debug("Pupil found via Otsu contour — r=%.1f", r_c)
        return float(cx_r) + x1, float(cy_r) + y1, float(r_c)

    # ── Fallback: HoughCircles inside the ROI ─────────────────────────────
    roi_hough = cv2.GaussianBlur(roi, (7, 7), 1.5)
    circles = cv2.HoughCircles(
        roi_hough, cv2.HOUGH_GRADIENT,
        dp=1.0,
        minDist=roi.shape[0] // 2,
        param1=60,
        param2=18,
        minRadius=min_r,
        maxRadius=max_r,
    )

    if circles is None:
        log.debug("HoughCircles found no pupil candidate in iris ROI.")
        return None

    # Pick the darkest candidate
    best_h: Optional[np.ndarray] = None
    best_mean = np.inf
    for c in circles[0]:
        cx_r, cy_r, r_c = int(c[0]), int(c[1]), int(c[2])
        m = create_circular_mask(roi.shape[0], roi.shape[1], (cx_r, cy_r), r_c)
        region = roi[m > 0]
        if region.size > 0:
            val = float(region.mean())
            if val < best_mean:
                best_mean = val
                best_h = c

    if best_h is None:
        return None

    return float(best_h[0]) + x1, float(best_h[1]) + y1, float(best_h[2])
