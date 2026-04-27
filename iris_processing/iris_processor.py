"""
IrisNormalizer — iris segmentation and Daugman Rubber Sheet normalisation.

Detection pipeline
──────────────────
1. MediaPipe Face Mesh (refine_landmarks=True) → iris boundary landmarks.
2. HoughCircles inside the iris ROI                → pupil boundary.
3. Fallback (if MediaPipe fails): HoughCircles on the full image for iris,
   then HoughCircles inside that ROI for pupil.

Normalisation
─────────────
Daugman's Rubber Sheet Model transforms the annular iris region into a
rectangular strip (512 × 64 px) supporting eccentric pupil / iris centres.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional, Tuple

import cv2
import mediapipe as mp
import numpy as np

from utils import (
    build_rubber_sheet_maps,
    compute_circle_from_points,
    create_circular_mask,
    detect_pupil_hough,
)

log = logging.getLogger(__name__)

# MediaPipe Face-Mesh refined iris landmark indices (require refine_landmarks=True)
# Each group: [centre, top, right, bottom, left]
_IRIS_GROUPS = (
    [468, 469, 470, 471, 472],   # left  iris (from the subject's perspective)
    [473, 474, 475, 476, 477],   # right iris
)


class IrisNormalizer:
    """
    Detects, segments, and normalises the iris region in an eye image.

    Attributes:
        NORM_WIDTH  : width  of the output normalised strip (angular axis).
        NORM_HEIGHT : height of the output normalised strip (radial  axis).
    """

    NORM_WIDTH  = 512
    NORM_HEIGHT = 64

    def __init__(self) -> None:
        # mp.solutions is absent in mediapipe ≥ 0.10 on Python 3.12+.
        # Gracefully disable MediaPipe; HoughCircles fallback takes over.
        try:
            self._face_mesh = mp.solutions.face_mesh.FaceMesh(
                static_image_mode=True,
                refine_landmarks=True,
                max_num_faces=1,
                min_detection_confidence=0.5,
            )
        except AttributeError:
            log.warning(
                "mediapipe.solutions unavailable (Python 3.12+ / mediapipe 0.10+). "
                "Iris detection will use HoughCircles only."
            )
            self._face_mesh = None

    # ------------------------------------------------------------------ #
    #  Iris / Pupil Detection                                              #
    # ------------------------------------------------------------------ #

    def _mediapipe_iris(
        self,
        image_rgb: np.ndarray,
    ) -> Optional[Tuple[float, float, float]]:
        """
        Run MediaPipe Face Mesh and return the best iris circle.

        'Best' is defined as the iris with the larger detected radius, so the
        module works on close-up single-eye images as well as full-face shots.

        Returns:
            (iris_cx, iris_cy, iris_r) in pixel coordinates, or None.
        """
        if self._face_mesh is None:
            return None

        results = self._face_mesh.process(image_rgb)
        if not results.multi_face_landmarks:
            return None

        h, w = image_rgb.shape[:2]
        lm = results.multi_face_landmarks[0].landmark

        best: Optional[Tuple[float, float, float]] = None
        for group in _IRIS_GROUPS:
            pts = np.array([[lm[i].x * w, lm[i].y * h] for i in group], dtype=np.float32)
            cx, cy, r = compute_circle_from_points(pts)
            if r < 3:          # degenerate — skip
                continue
            if best is None or r > best[2]:
                best = (cx, cy, r)

        return best

    @staticmethod
    def _remove_specular(gray: np.ndarray) -> np.ndarray:
        """Inpaint specular reflections (pixels > 235) so they don't bias detection."""
        _, spec = cv2.threshold(gray, 235, 255, cv2.THRESH_BINARY)
        spec_d  = cv2.dilate(spec, np.ones((19, 19), np.uint8), iterations=2)
        return cv2.inpaint(gray, spec_d, 17, cv2.INPAINT_TELEA)

    def _detect_all(
        self,
        gray: np.ndarray,
    ) -> Optional[Tuple[float, float, float, float, float, float]]:
        """
        Two-stage close-up iris detection validated against slit-lamp imagery.

        Stage 1 — Iris via Canny + HoughCircles:
          Inpaint specular highlights → CLAHE → Canny edges → HoughCircles.
          Rank candidates by darkest interior mean (iris+pupil region is dark).

        Stage 2 — Pupil via radial brightness scan:
          Seed = darkest pixel in the upper 70 % of the image (avoids lower
          eyelid shadow blobs).  Scan radially outward; the first pixel whose
          smoothed brightness exceeds the pupil_threshold (55) marks the
          pupil-iris boundary.  Boundary points inside the iris circle are
          kept; a circle is fitted to them.

        Returns:
            (pupil_cx, pupil_cy, pupil_r, iris_cx, iris_cy, iris_r) or None.
        """
        h, w = gray.shape
        min_dim = min(h, w)

        # Use original gray (no inpainting) for iris edge detection.
        # Inpainting alters the limbus edge profile and shifts detected circles.
        blurred_orig = cv2.GaussianBlur(gray, (21, 21), 5)

        # ── Pre-stage: dark-pixel anchor (rough pupil centroid) ───────────
        # The pupil is always the darkest region in the eye image, so its
        # centroid provides a reliable anchor to filter out false iris circles
        # that are centred on eyelid edges or other non-iris structures.
        y_pre = int(h * 0.70)
        search_region = blurred_orig[:y_pre, :]
        dark_thresh_pre = min(int(np.percentile(search_region, 3)) + 15, 55)
        ys_pre, xs_pre = np.where(search_region < dark_thresh_pre)
        if len(xs_pre) >= 20:
            anchor_x = float(xs_pre.mean())
            anchor_y = float(ys_pre.mean())
        else:
            anchor_x, anchor_y = w / 2.0, h / 2.0
        max_anchor_dist = min_dim * 0.23   # iris centre must be within 23 % of min_dim from the dark anchor
        log.debug(
            "_detect_all: dark anchor (%.0f, %.0f) thresh=%d max_dist=%.0f",
            anchor_x, anchor_y, dark_thresh_pre, max_anchor_dist,
        )

        # ── Stage 1: iris circle ─────────────────────────────────────────
        clahe    = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        blur_e   = cv2.GaussianBlur(enhanced, (7, 7), 1.5)
        edges    = cv2.Canny(blur_e, 30, 80)

        circles = cv2.HoughCircles(
            edges, cv2.HOUGH_GRADIENT,
            dp=1.0,
            minDist=min_dim // 4,
            param1=50,
            param2=15,
            minRadius=int(min_dim * 0.20),
            maxRadius=int(min_dim * 0.50),
        )

        if circles is None:
            log.debug("_detect_all: Canny+Hough found no iris candidates.")
            return None

        # Select the iris circle: centre must be near the dark-pixel anchor,
        # not too low, and have a dark interior (iris+pupil region is dark).
        iris_params: Optional[Tuple[float, float, float]] = None
        best_score = np.inf
        for c in circles[0]:
            if c[1] > h * 0.80:               # reject circles centred too low
                continue
            anchor_dist = float(np.hypot(c[0] - anchor_x, c[1] - anchor_y))
            if anchor_dist > max_anchor_dist:  # iris centre must be near the dark region
                continue
            mask = np.zeros(gray.shape, np.uint8)
            cv2.circle(mask, (int(c[0]), int(c[1])), int(c[2]), 255, -1)
            mean_b = float(blurred_orig[mask > 0].mean())
            # Score: lower = better.  Small penalty for off-anchor offset.
            score = mean_b + anchor_dist * 0.3
            if mean_b < 160 and score < best_score:
                best_score = score
                iris_params = (float(c[0]), float(c[1]), float(c[2]))

        if iris_params is None:
            log.debug("_detect_all: no dark-interior iris candidate found.")
            return None

        iris_cx, iris_cy, iris_r = iris_params
        log.info(
            "_detect_all: iris (%.1f, %.1f) r=%.1f score=%.1f",
            iris_cx, iris_cy, iris_r, best_score,
        )

        # ── Stage 2: pupil via Otsu contour detection ────────────────────
        # Use the same contour-based approach as detect_pupil_hough for
        # robustness against specular reflections and large dilated pupils.
        pupil = detect_pupil_hough(gray, iris_cx, iris_cy, iris_r)
        if pupil is not None:
            pupil_cx, pupil_cy, pupil_r = pupil
        else:
            log.warning("_detect_all: pupil detection failed — using concentric fallback.")
            pupil_cx, pupil_cy = iris_cx, iris_cy
            pupil_r = iris_r * 0.30

        if pupil_r >= iris_r:
            pupil_r = iris_r * 0.30

        return pupil_cx, pupil_cy, pupil_r, iris_cx, iris_cy, iris_r

    def _hough_iris(
        self,
        gray: np.ndarray,
    ) -> Optional[Tuple[float, float, float]]:
        """Last-resort HoughCircles iris fallback (no inpainting, no Canny)."""
        h, w = gray.shape
        min_dim = min(h, w)

        clahe    = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        blurred  = cv2.GaussianBlur(enhanced, (9, 9), 2)

        circles = cv2.HoughCircles(
            blurred, cv2.HOUGH_GRADIENT,
            dp=1.2, minDist=min_dim // 3,
            param1=50, param2=28,
            minRadius=int(min_dim * 0.22),
            maxRadius=int(min_dim * 0.47),
        )
        if circles is None:
            return None

        img_cx, img_cy = w / 2.0, h / 2.0

        def _score(c: np.ndarray) -> float:
            return np.hypot(c[0] - img_cx, c[1] - img_cy) - c[2] * 0.1

        best = min(circles[0], key=_score)
        return float(best[0]), float(best[1]), float(best[2])

    def detect(
        self,
        image_rgb: np.ndarray,
    ) -> Tuple[float, float, float, float, float, float]:
        """
        Detect iris and pupil circles in the image.

        Detection priority:
          1. MediaPipe Face Mesh (iris landmarks) + HoughCircles for pupil.
          2. Pupil-first: Otsu blob detection → radial limbus scan.
          3. HoughCircles on full image for iris + HoughCircles for pupil.
          4. Image-centre heuristic (last resort).

        Returns:
            (pupil_cx, pupil_cy, pupil_r, iris_cx, iris_cy, iris_r)
            in pixel coordinates.  Always returns a result.
        """
        gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
        h, w = gray.shape

        # ── Priority 1: MediaPipe ─────────────────────────────────────────
        iris_params = self._mediapipe_iris(image_rgb)
        if iris_params is not None:
            log.info("Detection: MediaPipe iris landmarks.")
            iris_cx, iris_cy, iris_r = iris_params
            pupil = detect_pupil_hough(gray, iris_cx, iris_cy, iris_r)
            if pupil is None:
                pupil = (iris_cx, iris_cy, iris_r * 0.30)
            return (*pupil, iris_cx, iris_cy, iris_r)

        # ── Priority 2: Canny iris + radial pupil scan ────────────────────
        result = self._detect_all(gray)
        if result is not None:
            log.info("Detection: Canny-iris + radial-pupil pipeline.")
            return result

        # ── Priority 3: simple HoughCircles fallback ──────────────────────
        log.warning("Falling back to simple HoughCircles for iris.")
        iris_params = self._hough_iris(gray)
        if iris_params is None:
            log.warning("All detectors failed — using image-centre heuristic.")
            iris_params = (w / 2.0, h / 2.0, min(h, w) * 0.35)

        iris_cx, iris_cy, iris_r = iris_params
        pupil = detect_pupil_hough(gray, iris_cx, iris_cy, iris_r)
        if pupil is None:
            pupil = (iris_cx, iris_cy, iris_r * 0.30)

        pupil_cx, pupil_cy, pupil_r = pupil
        return pupil_cx, pupil_cy, pupil_r, iris_cx, iris_cy, iris_r

    # ------------------------------------------------------------------ #
    #  Segmentation                                                        #
    # ------------------------------------------------------------------ #

    def segment(
        self,
        image_rgb: np.ndarray,
        iris_cx: float,
        iris_cy: float,
        iris_r: float,
        pad: float = 1.05,
    ) -> np.ndarray:
        """
        Crop and mask the circular iris region from the image.

        Pixels outside the iris circle are zeroed (black).  A small padding
        factor ensures the limbus ring is not clipped.

        Args:
            image_rgb : source image in RGB format.
            iris_cx / iris_cy / iris_r : iris circle in pixel coords.
            pad       : radius scale factor (default 1.05 = 5 % extra margin).

        Returns:
            RGB crop with the non-iris area blacked out.
        """
        r  = int(iris_r * pad)
        cx = int(iris_cx)
        cy = int(iris_cy)
        h, w = image_rgb.shape[:2]

        x1, y1 = max(0, cx - r), max(0, cy - r)
        x2, y2 = min(w, cx + r), min(h, cy + r)
        crop = image_rgb[y1:y2, x1:x2].copy()

        # Iris centre in crop coordinates
        c_crop = (cx - x1, cy - y1)
        mask = create_circular_mask(crop.shape[0], crop.shape[1], c_crop, r)
        crop[mask == 0] = 0
        return crop

    # ------------------------------------------------------------------ #
    #  Normalisation — Daugman's Rubber Sheet Model                        #
    # ------------------------------------------------------------------ #

    def normalize(
        self,
        image_rgb: np.ndarray,
        pupil_cx: float,
        pupil_cy: float,
        pupil_r: float,
        iris_cx: float,
        iris_cy: float,
        iris_r: float,
    ) -> np.ndarray:
        """
        Apply Daugman's Rubber Sheet Model.

        Transforms the annular region between the pupil and iris boundaries
        into a (NORM_HEIGHT × NORM_WIDTH) rectangular strip.

        Columns represent the angular dimension (0 → 2π).
        Rows represent the radial dimension (pupil boundary → iris boundary).

        Eccentric (non-concentric) centres are fully supported: each angular
        ray independently interpolates between the two boundary curves.

        Args:
            image_rgb                      : source image in RGB format.
            pupil_cx / pupil_cy / pupil_r  : pupil circle (pixel coords).
            iris_cx  / iris_cy  / iris_r   : iris circle  (pixel coords).

        Returns:
            RGB strip of shape (NORM_HEIGHT, NORM_WIDTH) = (64, 512).
        """
        map_x, map_y = build_rubber_sheet_maps(
            pupil_cx, pupil_cy, pupil_r,
            iris_cx,  iris_cy,  iris_r,
            self.NORM_WIDTH,
            self.NORM_HEIGHT,
        )

        # cv2.remap operates on BGR; convert round-trip to keep output RGB
        image_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
        strip_bgr  = cv2.remap(
            image_bgr,
            map_x,
            map_y,
            interpolation=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_REPLICATE,
        )
        return cv2.cvtColor(strip_bgr, cv2.COLOR_BGR2RGB)

    # ------------------------------------------------------------------ #
    #  MobileSAM-based automatic detection                               #
    # ------------------------------------------------------------------ #

    _SAM_CHECKPOINT = str(
        Path(__file__).parent / "models" / "mobile_sam.pt"
    )

    def _load_sam_predictor(self):
        """Lazy-load MobileSAM predictor (cached on self)."""
        if hasattr(self, "_sam_predictor"):
            return self._sam_predictor
        from mobile_sam import sam_model_registry, SamPredictor
        sam = sam_model_registry["vit_t"](checkpoint=self._SAM_CHECKPOINT)
        sam.eval()
        predictor = SamPredictor(sam)
        self._sam_predictor = predictor
        return predictor

    def _detect_circles_with_sam(
        self,
        image_rgb: np.ndarray,
        gray: np.ndarray,
    ) -> Tuple[float, float, float, float, float, float]:
        """
        Use MobileSAM to segment pupil and iris and fit circles to the masks.

        Strategy
        --------
        1. Pupil  — positive point prompt at the darkest pixel cluster centroid.
                    Pick the smallest high-scoring mask → pupil mask.
        2. Iris   — four positive prompts in a ring at 1.7× pupil_r around
                    the pupil centre. Pick the largest mask → iris mask.
        3. Circle fit — centroid + 95th-percentile radius on each mask.
        """
        predictor = self._load_sam_predictor()
        predictor.set_image(image_rgb)

        h, w = gray.shape

        # ── Pupil anchor ──────────────────────────────────────────────────
        # 1. Find the illuminated eye region: centroid of bright pixels
        #    (slit-lamp images have a dark background; the eye is bright).
        # 2. Inside that region, the pupil is the darkest compact spot.
        blurred = cv2.GaussianBlur(gray, (51, 51), 15)
        bright_thresh = int(np.percentile(blurred, 55))
        ys_b, xs_b   = np.where(blurred > bright_thresh)
        if len(xs_b) > 200:
            eye_cx, eye_cy = float(xs_b.mean()), float(ys_b.mean())
        else:
            eye_cx, eye_cy = w / 2.0, h / 2.0

        # Search for the darkest local minimum inside the eye region
        search_r = int(min(h, w) * 0.40)
        x1 = max(0, int(eye_cx) - search_r)
        y1 = max(0, int(eye_cy) - search_r)
        x2 = min(w, int(eye_cx) + search_r)
        y2 = min(h, int(eye_cy) + search_r)

        roi_blur = cv2.GaussianBlur(blurred[y1:y2, x1:x2], (51, 51), 20)
        _, _, min_loc, _ = cv2.minMaxLoc(roi_blur)
        anchor_x = float(min_loc[0]) + x1
        anchor_y = float(min_loc[1]) + y1

        log.debug("SAM anchor: eye centroid (%.0f, %.0f) → pupil anchor (%.0f, %.0f)",
                  eye_cx, eye_cy, anchor_x, anchor_y)

        # ── Stage 1 & 2: one SAM call → pupil + iris from multimask ─────
        # SAM returns 3 masks at different scales from the same prompt point.
        # Smallest (darkest) = pupil;  largest = iris disc (pupil+iris area).
        masks_all, scores_all, _ = predictor.predict(
            point_coords=np.array([[anchor_x, anchor_y]]),
            point_labels=np.array([1]),
            multimask_output=True,
        )

        # Sort masks by area ascending: [pupil, mid, iris-disc]
        sorted_by_area = sorted(
            zip(masks_all, scores_all), key=lambda ms: int(ms[0].sum())
        )

        # ── Pupil: smallest dark mask ─────────────────────────────────────
        best_pupil_mask = None
        best_pupil_score = -1.0
        for mask, score in sorted_by_area:
            area = int(mask.sum())
            if area < 100:
                continue
            ys_m, xs_m = np.where(mask)
            interior_brightness = float(gray[ys_m, xs_m].mean())
            combined = float(score) - interior_brightness / 255.0
            if combined > best_pupil_score:
                best_pupil_score = combined
                best_pupil_mask = mask

        if best_pupil_mask is None:
            best_pupil_mask = sorted_by_area[0][0]

        ys_p, xs_p = np.where(best_pupil_mask)
        pupil_cx = float(xs_p.mean())
        pupil_cy = float(ys_p.mean())
        dists_p  = np.sqrt((xs_p - pupil_cx) ** 2 + (ys_p - pupil_cy) ** 2)
        pupil_r  = float(np.percentile(dists_p, 95))
        log.info("SAM pupil: (%.1f, %.1f) r=%.1f", pupil_cx, pupil_cy, pupil_r)

        # ── Stage 2: iris — SAM with positive (iris ring) + negative (sclera) ─
        # Positive prompts: 4 points in the iris annular region (1.6× pupil_r).
        # Negative prompts: 4 points in the sclera (far outside the iris disc).
        # This guides SAM to segment only the iris disc and not the background.
        min_dim  = min(h, w)
        ring_pos = pupil_r * 1.6
        ring_neg = min(pupil_r * 5.0, min_dim * 0.46)
        n_pts    = 4
        angles   = np.linspace(0, 2 * np.pi, n_pts, endpoint=False)

        pos_pts = np.array([
            [pupil_cx + ring_pos * np.cos(a), pupil_cy + ring_pos * np.sin(a)]
            for a in angles
        ])
        neg_pts = np.array([
            [pupil_cx + ring_neg * np.cos(a), pupil_cy + ring_neg * np.sin(a)]
            for a in angles
        ])
        # Keep only negative points that lie inside the image
        in_bounds = (
            (neg_pts[:, 0] >= 0) & (neg_pts[:, 0] < w) &
            (neg_pts[:, 1] >= 0) & (neg_pts[:, 1] < h)
        )
        pos_pts[:, 0] = np.clip(pos_pts[:, 0], 0, w - 1)
        pos_pts[:, 1] = np.clip(pos_pts[:, 1], 0, h - 1)

        all_pts    = np.vstack([pos_pts, neg_pts[in_bounds]])
        all_labels = np.array([1] * n_pts + [0] * int(in_bounds.sum()))

        masks_iris, _, _ = predictor.predict(
            point_coords=all_pts,
            point_labels=all_labels,
            multimask_output=True,
        )

        def _circle_from_mask(mask: np.ndarray) -> Tuple[float, float, float]:
            ys_m, xs_m = np.where(mask)
            cx = float(xs_m.mean()); cy = float(ys_m.mean())
            d  = np.sqrt((xs_m - cx) ** 2 + (ys_m - cy) ** 2)
            return cx, cy, float(np.percentile(d, 95))

        pupil_area = int(best_pupil_mask.sum())
        iris_cx, iris_cy, iris_r = pupil_cx, pupil_cy, 0.0
        best_prox = np.inf   # pick the candidate whose centre is closest to pupil
        for mask in masks_iris:
            if int(mask.sum()) <= pupil_area * 3:
                continue
            cx_m, cy_m, r_m = _circle_from_mask(mask)
            if r_m > min_dim * 0.53 or r_m < pupil_r * 1.8:
                continue
            prox = float(np.hypot(cx_m - pupil_cx, cy_m - pupil_cy))
            if prox > pupil_r * 0.75:
                continue
            if prox < best_prox:
                best_prox = prox
                iris_cx, iris_cy, iris_r = cx_m, cy_m, r_m

        # ── Hough fallback if SAM iris is rejected ────────────────────────
        if iris_r < pupil_r * 1.8:
            log.debug("SAM iris rejected — running Hough with pupil anchor.")
            clahe   = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            enhanced = clahe.apply(gray)
            edges   = cv2.Canny(cv2.GaussianBlur(enhanced, (7, 7), 1.5), 30, 80)
            circles = cv2.HoughCircles(
                edges, cv2.HOUGH_GRADIENT, dp=1.0, minDist=min_dim // 4,
                param1=50, param2=12,
                minRadius=int(pupil_r * 1.8), maxRadius=int(min_dim * 0.53),
            )
            best_hough = np.inf
            if circles is not None:
                for c in circles[0]:
                    prox = float(np.hypot(c[0] - pupil_cx, c[1] - pupil_cy))
                    if prox > pupil_r * 1.5:
                        continue
                    mask_h = np.zeros(gray.shape, np.uint8)
                    cv2.circle(mask_h, (int(c[0]), int(c[1])), int(c[2]), 255, -1)
                    mean_b = float(blurred[mask_h > 0].mean())
                    score  = mean_b + prox * 0.3
                    if mean_b < 175 and score < best_hough:
                        best_hough = score
                        iris_cx, iris_cy, iris_r = float(c[0]), float(c[1]), float(c[2])

        # ── Radial gradient fallback ─────────────────────────────────────
        # Scan radially from the accurate SAM pupil centre.  At each angle,
        # the brightness rises when the ray crosses the limbus (iris→sclera).
        # Collect boundary points and fit a circle.
        if iris_r < pupil_r * 1.8:
            log.debug("SAM+Hough failed — trying radial limbus scan.")
            gray_sm = cv2.GaussianBlur(gray, (9, 9), 2).astype(np.float32)
            n_ang   = 48
            r_start = int(pupil_r * 1.4)
            r_end   = int(min_dim * 0.52)
            step    = 2
            boundary_pts: list = []

            for theta in np.linspace(0, 2 * np.pi, n_ang, endpoint=False):
                cos_t, sin_t = np.cos(theta), np.sin(theta)
                brightness_seq = []
                r_seq          = []
                for r in range(r_start, r_end, step):
                    xi = int(pupil_cx + r * cos_t)
                    yi = int(pupil_cy + r * sin_t)
                    if 0 <= xi < w and 0 <= yi < h:
                        brightness_seq.append(gray_sm[yi, xi])
                        r_seq.append(r)

                if len(brightness_seq) < 10:
                    continue

                b = np.array(brightness_seq, dtype=np.float32)
                # Gradient: rising edge = limbus
                grad = np.diff(b)
                # Find the first position where brightness exceeds the
                # midpoint between iris-interior mean and outer mean
                iris_mean  = b[:5].mean()
                outer_mean = b[-5:].mean()
                if outer_mean <= iris_mean + 5:
                    continue
                threshold = iris_mean + (outer_mean - iris_mean) * 0.4
                for idx, val in enumerate(b):
                    if val >= threshold:
                        r_b = r_seq[idx]
                        boundary_pts.append(
                            [pupil_cx + r_b * cos_t, pupil_cy + r_b * sin_t]
                        )
                        break

            if len(boundary_pts) >= 8:
                pts = np.array(boundary_pts, dtype=np.float64)
                iris_cx, iris_cy, iris_r = compute_circle_from_points(pts)
                log.info("Radial scan iris: (%.1f, %.1f) r=%.1f", iris_cx, iris_cy, iris_r)
            else:
                log.warning("Radial scan failed (%d pts) — concentric 3.0×.", len(boundary_pts))
                iris_cx, iris_cy, iris_r = pupil_cx, pupil_cy, pupil_r * 3.0

        log.info("SAM iris:  (%.1f, %.1f) r=%.1f", iris_cx, iris_cy, iris_r)

        if pupil_r >= iris_r:
            log.warning("SAM: pupil_r >= iris_r — clamping to 30%%.")
            pupil_r = iris_r * 0.30

        return pupil_cx, pupil_cy, pupil_r, iris_cx, iris_cy, iris_r

    def process_with_sam(
        self,
        image_path: str,
        output_dir: str = "output",
        save_annotated: bool = True,
    ) -> dict:
        """
        Full pipeline using MobileSAM for automatic iris/pupil detection.

        No API key required.  Loads the model once and caches it on the
        instance for subsequent calls.

        Returns the same dict as :meth:`process`.
        """
        bgr = cv2.imread(str(image_path))
        if bgr is None:
            raise FileNotFoundError(f"Cannot read image: {image_path}")
        image_rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        gray      = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

        pupil_cx, pupil_cy, pupil_r, iris_cx, iris_cy, iris_r = (
            self._detect_circles_with_sam(image_rgb, gray)
        )

        segmented_rgb  = self.segment(image_rgb, iris_cx, iris_cy, iris_r)
        normalized_rgb = self.normalize(
            image_rgb, pupil_cx, pupil_cy, pupil_r, iris_cx, iris_cy, iris_r
        )

        out = Path(output_dir)
        out.mkdir(parents=True, exist_ok=True)
        stem = Path(image_path).stem

        seg_path  = out / f"{stem}_segmented.png"
        norm_path = out / f"{stem}_normalized.png"
        cv2.imwrite(str(seg_path),  cv2.cvtColor(segmented_rgb,  cv2.COLOR_RGB2BGR))
        cv2.imwrite(str(norm_path), cv2.cvtColor(normalized_rgb, cv2.COLOR_RGB2BGR))

        ann_path = None
        if save_annotated:
            ann_rgb  = self.draw_detections(
                image_rgb, pupil_cx, pupil_cy, pupil_r, iris_cx, iris_cy, iris_r
            )
            ann_path = out / f"{stem}_annotated.png"
            cv2.imwrite(str(ann_path), cv2.cvtColor(ann_rgb, cv2.COLOR_RGB2BGR))

        return {
            "pupil": {"cx": round(pupil_cx, 2), "cy": round(pupil_cy, 2), "r": round(pupil_r, 2)},
            "iris":  {"cx": round(iris_cx,  2), "cy": round(iris_cy,  2), "r": round(iris_r,  2)},
            "eccentricity": {
                "dx": round(iris_cx - pupil_cx, 2),
                "dy": round(iris_cy - pupil_cy, 2),
            },
            "segmented_path":  str(seg_path.resolve()),
            "normalized_path": str(norm_path.resolve()),
            "annotated_path":  str(ann_path.resolve()) if ann_path else None,
        }

    # ------------------------------------------------------------------ #
    #  Claude Vision API detection                                        #
    # ------------------------------------------------------------------ #

    def detect_with_claude_vision(
        self,
        image_path: str,
    ) -> Tuple[float, float, float, float, float, float]:
        """
        Use Claude Vision API (claude-opus-4-7) to detect iris and pupil circles.

        Sends the image to Claude with a structured JSON prompt; parses the
        returned pupil/iris circle parameters directly.

        Requires the ANTHROPIC_API_KEY environment variable to be set.

        Returns:
            (pupil_cx, pupil_cy, pupil_r, iris_cx, iris_cy, iris_r) in pixels.
        """
        import base64
        import json
        import re

        import anthropic

        suffix = Path(image_path).suffix.lower()
        media_type = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg"}.get(
            suffix, "image/jpeg"
        )

        with open(image_path, "rb") as fh:
            image_b64 = base64.standard_b64encode(fh.read()).decode("utf-8")

        client = anthropic.Anthropic()

        prompt = (
            "This is a close-up photograph of a human eye/iris.\n"
            "Identify the pupil (dark central circle) and the iris (coloured ring around the pupil).\n"
            "Return ONLY a JSON object — no explanation, no markdown fences:\n"
            '{"pupil":{"cx":<float>,"cy":<float>,"r":<float>},'
            '"iris":{"cx":<float>,"cy":<float>,"r":<float>}}\n'
            "cx and cy are the circle centre in image pixels; r is the radius in pixels.\n"
            "The image origin (0,0) is the top-left corner."
        )

        message = client.messages.create(
            model="claude-opus-4-7",
            max_tokens=256,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_b64,
                            },
                        },
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
        )

        raw = message.content[0].text.strip()
        # Strip markdown code fences if the model adds them anyway
        raw = re.sub(r"^```[a-z]*\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw)

        data = json.loads(raw)
        p = data["pupil"]
        i = data["iris"]

        pupil_cx, pupil_cy, pupil_r = float(p["cx"]), float(p["cy"]), float(p["r"])
        iris_cx,  iris_cy,  iris_r  = float(i["cx"]), float(i["cy"]), float(i["r"])

        log.info(
            "Claude Vision: pupil (%.1f, %.1f) r=%.1f  iris (%.1f, %.1f) r=%.1f",
            pupil_cx, pupil_cy, pupil_r, iris_cx, iris_cy, iris_r,
        )
        return pupil_cx, pupil_cy, pupil_r, iris_cx, iris_cy, iris_r

    def process_with_ai(
        self,
        image_path: str,
        output_dir: str = "output",
        save_annotated: bool = True,
    ) -> dict:
        """
        Full pipeline using Claude Vision API for automatic circle detection.

        Sends the iris photo to claude-opus-4-7, receives pupil and iris circle
        parameters as JSON, then runs the same segment → normalize → save
        pipeline as :meth:`process`.

        Requires the ANTHROPIC_API_KEY environment variable to be set.

        Returns the same dict as :meth:`process`.
        """
        bgr = cv2.imread(str(image_path))
        if bgr is None:
            raise FileNotFoundError(f"Cannot read image: {image_path}")
        image_rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)

        pupil_cx, pupil_cy, pupil_r, iris_cx, iris_cy, iris_r = (
            self.detect_with_claude_vision(image_path)
        )

        if pupil_r >= iris_r:
            log.warning("Claude Vision: pupil_r >= iris_r — clamping pupil_r to 30 %% of iris_r.")
            pupil_r = iris_r * 0.30

        segmented_rgb  = self.segment(image_rgb, iris_cx, iris_cy, iris_r)
        normalized_rgb = self.normalize(
            image_rgb, pupil_cx, pupil_cy, pupil_r, iris_cx, iris_cy, iris_r
        )

        out = Path(output_dir)
        out.mkdir(parents=True, exist_ok=True)
        stem = Path(image_path).stem

        seg_path  = out / f"{stem}_segmented.png"
        norm_path = out / f"{stem}_normalized.png"
        cv2.imwrite(str(seg_path),  cv2.cvtColor(segmented_rgb,  cv2.COLOR_RGB2BGR))
        cv2.imwrite(str(norm_path), cv2.cvtColor(normalized_rgb, cv2.COLOR_RGB2BGR))

        ann_path = None
        if save_annotated:
            ann_rgb  = self.draw_detections(
                image_rgb, pupil_cx, pupil_cy, pupil_r, iris_cx, iris_cy, iris_r
            )
            ann_path = out / f"{stem}_annotated.png"
            cv2.imwrite(str(ann_path), cv2.cvtColor(ann_rgb, cv2.COLOR_RGB2BGR))

        return {
            "pupil": {"cx": round(pupil_cx, 2), "cy": round(pupil_cy, 2), "r": round(pupil_r, 2)},
            "iris":  {"cx": round(iris_cx,  2), "cy": round(iris_cy,  2), "r": round(iris_r,  2)},
            "eccentricity": {
                "dx": round(iris_cx - pupil_cx, 2),
                "dy": round(iris_cy - pupil_cy, 2),
            },
            "segmented_path":  str(seg_path.resolve()),
            "normalized_path": str(norm_path.resolve()),
            "annotated_path":  str(ann_path.resolve()) if ann_path else None,
        }

    # ------------------------------------------------------------------ #
    #  Annotation-based detection (user-drawn coloured circles)           #
    # ------------------------------------------------------------------ #

    @staticmethod
    def circle_from_color_annotation(
        image_path: str,
        hue_lo: int,
        hue_hi: int,
        sat_lo: int = 150,
        val_lo: int = 100,
    ) -> Tuple[float, float, float]:
        """
        Extract a circle from a user-drawn filled coloured region.

        The caller provides an image where the target boundary (pupil or iris)
        is painted with a solid colour.  This method isolates that colour in
        HSV space, finds its minimum enclosing circle, and returns the result.

        Args:
            image_path : path to the annotated image.
            hue_lo / hue_hi : HSV hue range (0-180 in OpenCV).
            sat_lo / val_lo : minimum saturation / value thresholds.

        Returns:
            (cx, cy, radius) in pixel coordinates.

        Raises:
            ValueError if no pixels of the target colour are found.
        """
        bgr = cv2.imread(str(image_path))
        if bgr is None:
            raise FileNotFoundError(f"Cannot read annotation image: {image_path}")

        hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)

        # Red hue wraps around 180; handle it by combining two ranges.
        if hue_lo > hue_hi:
            mask = (
                cv2.inRange(hsv, (hue_lo, sat_lo, val_lo), (180, 255, 255))
                | cv2.inRange(hsv, (0, sat_lo, val_lo), (hue_hi, 255, 255))
            )
        else:
            mask = cv2.inRange(hsv, (hue_lo, sat_lo, val_lo), (hue_hi, 255, 255))

        ys, xs = np.where(mask > 0)
        if len(xs) < 10:
            raise ValueError(
                f"No colour pixels found (hue {hue_lo}-{hue_hi}) in {image_path}"
            )

        # Use centroid as the circle centre and the 95th-percentile radial
        # distance as the radius.  This is robust to stray colour pixels at
        # image edges that would inflate minEnclosingCircle enormously.
        cx = float(xs.mean())
        cy = float(ys.mean())
        dists = np.sqrt((xs - cx) ** 2 + (ys - cy) ** 2)
        radius = float(np.percentile(dists, 95))
        return cx, cy, radius

    def process_from_iris_annotation(
        self,
        image_path: str,
        iris_annotation_path: str,
        output_dir: str = "output",
        save_annotated: bool = True,
    ) -> dict:
        """
        Full pipeline using only an iris colour annotation; pupil is auto-detected.

        iris_annotation_path must have the iris region painted in solid BLUE
        (hue 100-130).  The pupil is found automatically inside the extracted
        iris boundary using Otsu contour detection.

        Returns the same dict as :meth:`process`.
        """
        bgr = cv2.imread(str(image_path))
        if bgr is None:
            raise FileNotFoundError(f"Cannot read image: {image_path}")
        image_rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        gray      = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

        iris_cx, iris_cy, iris_r = self.circle_from_color_annotation(
            iris_annotation_path, hue_lo=100, hue_hi=130,
        )
        log.info("Annotation iris: (%.1f, %.1f) r=%.1f", iris_cx, iris_cy, iris_r)

        pupil = detect_pupil_hough(gray, iris_cx, iris_cy, iris_r)
        if pupil is not None:
            pupil_cx, pupil_cy, pupil_r = pupil
        else:
            log.warning("Pupil auto-detection failed — using concentric fallback.")
            pupil_cx, pupil_cy, pupil_r = iris_cx, iris_cy, iris_r * 0.30

        if pupil_r >= iris_r:
            pupil_r = iris_r * 0.30

        segmented_rgb  = self.segment(image_rgb, iris_cx, iris_cy, iris_r)
        normalized_rgb = self.normalize(
            image_rgb, pupil_cx, pupil_cy, pupil_r, iris_cx, iris_cy, iris_r
        )

        out = Path(output_dir)
        out.mkdir(parents=True, exist_ok=True)
        stem = Path(image_path).stem

        seg_path  = out / f"{stem}_segmented.png"
        norm_path = out / f"{stem}_normalized.png"
        cv2.imwrite(str(seg_path),  cv2.cvtColor(segmented_rgb,  cv2.COLOR_RGB2BGR))
        cv2.imwrite(str(norm_path), cv2.cvtColor(normalized_rgb, cv2.COLOR_RGB2BGR))

        ann_path = None
        if save_annotated:
            ann_rgb  = self.draw_detections(
                image_rgb, pupil_cx, pupil_cy, pupil_r, iris_cx, iris_cy, iris_r
            )
            ann_path = out / f"{stem}_annotated.png"
            cv2.imwrite(str(ann_path), cv2.cvtColor(ann_rgb, cv2.COLOR_RGB2BGR))

        return {
            "pupil": {"cx": round(pupil_cx, 2), "cy": round(pupil_cy, 2), "r": round(pupil_r, 2)},
            "iris":  {"cx": round(iris_cx,  2), "cy": round(iris_cy,  2), "r": round(iris_r,  2)},
            "eccentricity": {
                "dx": round(iris_cx - pupil_cx, 2),
                "dy": round(iris_cy - pupil_cy, 2),
            },
            "segmented_path":  str(seg_path.resolve()),
            "normalized_path": str(norm_path.resolve()),
            "annotated_path":  str(ann_path.resolve()) if ann_path else None,
        }

    def process_from_annotations(
        self,
        image_path: str,
        pupil_annotation_path: str,
        iris_annotation_path: str,
        output_dir: str = "output",
        save_annotated: bool = True,
    ) -> dict:
        """
        Full pipeline using user-provided colour-annotation images.

        Instead of automatic detection, circle parameters are extracted from:
          • pupil_annotation_path — image with the pupil region painted RED
            (hue 0-10 and 160-180)
          • iris_annotation_path  — image with the iris region painted BLUE
            (hue 100-130)

        Returns the same dict as :meth:`process`.
        """
        bgr = cv2.imread(str(image_path))
        if bgr is None:
            raise FileNotFoundError(f"Cannot read image: {image_path}")
        image_rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)

        # Red wraps around hue=180 → use hue_lo > hue_hi to trigger two-range mode
        pupil_cx, pupil_cy, pupil_r = self.circle_from_color_annotation(
            pupil_annotation_path, hue_lo=160, hue_hi=10,
        )
        iris_cx, iris_cy, iris_r = self.circle_from_color_annotation(
            iris_annotation_path, hue_lo=100, hue_hi=130,
        )

        log.info(
            "Annotation: pupil (%.1f, %.1f) r=%.1f  iris (%.1f, %.1f) r=%.1f",
            pupil_cx, pupil_cy, pupil_r, iris_cx, iris_cy, iris_r,
        )

        segmented_rgb = self.segment(image_rgb, iris_cx, iris_cy, iris_r)
        normalized_rgb = self.normalize(
            image_rgb, pupil_cx, pupil_cy, pupil_r, iris_cx, iris_cy, iris_r
        )

        out = Path(output_dir)
        out.mkdir(parents=True, exist_ok=True)
        stem = Path(image_path).stem

        seg_path  = out / f"{stem}_segmented.png"
        norm_path = out / f"{stem}_normalized.png"
        cv2.imwrite(str(seg_path),  cv2.cvtColor(segmented_rgb,  cv2.COLOR_RGB2BGR))
        cv2.imwrite(str(norm_path), cv2.cvtColor(normalized_rgb, cv2.COLOR_RGB2BGR))

        ann_path = None
        if save_annotated:
            ann_rgb  = self.draw_detections(
                image_rgb, pupil_cx, pupil_cy, pupil_r, iris_cx, iris_cy, iris_r
            )
            ann_path = out / f"{stem}_annotated.png"
            cv2.imwrite(str(ann_path), cv2.cvtColor(ann_rgb, cv2.COLOR_RGB2BGR))

        return {
            "pupil": {"cx": round(pupil_cx, 2), "cy": round(pupil_cy, 2), "r": round(pupil_r, 2)},
            "iris":  {"cx": round(iris_cx,  2), "cy": round(iris_cy,  2), "r": round(iris_r,  2)},
            "eccentricity": {
                "dx": round(iris_cx - pupil_cx, 2),
                "dy": round(iris_cy - pupil_cy, 2),
            },
            "segmented_path":  str(seg_path.resolve()),
            "normalized_path": str(norm_path.resolve()),
            "annotated_path":  str(ann_path.resolve()) if ann_path else None,
        }

    # ------------------------------------------------------------------ #
    #  Visualisation helper                                                #
    # ------------------------------------------------------------------ #

    def draw_detections(
        self,
        image_rgb: np.ndarray,
        pupil_cx: float,
        pupil_cy: float,
        pupil_r: float,
        iris_cx: float,
        iris_cy: float,
        iris_r: float,
    ) -> np.ndarray:
        """
        Return a copy of image_rgb with the detected iris and pupil circles
        annotated in green (iris) and yellow (pupil).
        """
        vis = image_rgb.copy()
        # Draw on BGR canvas then convert back
        vis_bgr = cv2.cvtColor(vis, cv2.COLOR_RGB2BGR)
        cv2.circle(vis_bgr, (int(iris_cx),  int(iris_cy)),  int(iris_r),  (0, 220, 0),   2)
        cv2.circle(vis_bgr, (int(pupil_cx), int(pupil_cy)), int(pupil_r), (0, 220, 220), 2)
        cv2.circle(vis_bgr, (int(iris_cx),  int(iris_cy)),  3,            (0, 220, 0),   -1)
        cv2.circle(vis_bgr, (int(pupil_cx), int(pupil_cy)), 3,            (0, 220, 220), -1)
        return cv2.cvtColor(vis_bgr, cv2.COLOR_BGR2RGB)

    # ------------------------------------------------------------------ #
    #  Main pipeline                                                       #
    # ------------------------------------------------------------------ #

    def process(
        self,
        image_path: str,
        output_dir: str = "output",
        save_annotated: bool = True,
    ) -> dict:
        """
        Full pipeline: load → detect → segment → normalize → save.

        Args:
            image_path     : Path to input iris image (NIR or colour JPEG/PNG).
            output_dir     : Directory where output images are written.
            save_annotated : Also save an annotated version showing the
                             detected circles overlaid on the original.

        Returns:
            Dictionary with keys:
              "pupil"            : {cx, cy, r}
              "iris"             : {cx, cy, r}
              "eccentricity"     : {dx, dy}  — centre offset in pixels
              "segmented_path"   : absolute path to the saved segmented image
              "normalized_path"  : absolute path to the saved normalised strip
              "annotated_path"   : absolute path to the annotated image (or None)
        """
        bgr = cv2.imread(str(image_path))
        if bgr is None:
            raise FileNotFoundError(f"Cannot read image: {image_path}")

        image_rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)

        # Detect
        pupil_cx, pupil_cy, pupil_r, iris_cx, iris_cy, iris_r = self.detect(image_rgb)

        # Segment (circular crop)
        segmented_rgb = self.segment(image_rgb, iris_cx, iris_cy, iris_r)

        # Normalise (Daugman strip)
        normalized_rgb = self.normalize(
            image_rgb, pupil_cx, pupil_cy, pupil_r, iris_cx, iris_cy, iris_r
        )

        # Persist results
        out = Path(output_dir)
        out.mkdir(parents=True, exist_ok=True)
        stem = Path(image_path).stem

        seg_path  = out / f"{stem}_segmented.png"
        norm_path = out / f"{stem}_normalized.png"

        cv2.imwrite(str(seg_path),  cv2.cvtColor(segmented_rgb,  cv2.COLOR_RGB2BGR))
        cv2.imwrite(str(norm_path), cv2.cvtColor(normalized_rgb, cv2.COLOR_RGB2BGR))

        ann_path = None
        if save_annotated:
            ann_rgb  = self.draw_detections(
                image_rgb, pupil_cx, pupil_cy, pupil_r, iris_cx, iris_cy, iris_r
            )
            ann_path = out / f"{stem}_annotated.png"
            cv2.imwrite(str(ann_path), cv2.cvtColor(ann_rgb, cv2.COLOR_RGB2BGR))

        return {
            "pupil": {
                "cx": round(pupil_cx, 2),
                "cy": round(pupil_cy, 2),
                "r":  round(pupil_r,  2),
            },
            "iris": {
                "cx": round(iris_cx, 2),
                "cy": round(iris_cy, 2),
                "r":  round(iris_r,  2),
            },
            "eccentricity": {
                "dx": round(iris_cx - pupil_cx, 2),
                "dy": round(iris_cy - pupil_cy, 2),
            },
            "segmented_path":  str(seg_path.resolve()),
            "normalized_path": str(norm_path.resolve()),
            "annotated_path":  str(ann_path.resolve()) if ann_path else None,
        }
