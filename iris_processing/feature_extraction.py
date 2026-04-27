"""
Iris feature extraction: Gabor, HOG, LBP, and pixel features.

Ported from diabetes-iridology (ICBME 2018, Moradi et al.) to Python 3.
Operates on a grayscale normalized iris strip produced by IrisNormalizer.

Typical usage
-------------
    from iris_processing.iris_processor import IrisNormalizer
    from iris_processing.feature_extraction import extract_all

    normalizer = IrisNormalizer()
    result = normalizer.process("eye.jpg")

    import cv2
    strip_bgr = cv2.imread(result["normalized_path"])
    strip_gray = cv2.cvtColor(strip_bgr, cv2.COLOR_BGR2GRAY)
    cv2.equalizeHist(strip_gray, strip_gray)

    # Informative column regions identified in the ICBME 2018 paper
    regions = [(75, 125), (375, 425), (235, 285), (615, 665)]
    features = extract_all(strip_gray, regions)
"""

from __future__ import annotations

import numpy as np
import cv2
from scipy import ndimage as ndi
from skimage.filters import gabor_kernel
from skimage.feature import hog, local_binary_pattern
from skimage.transform import rescale


# Rows trimmed from the top of the normalised strip (eyelid / upper-lid shadow).
_UPPER_CUT = 10

# Informative angular regions (column index pairs) from ICBME 2018.
# Use these as a starting point; slide a window to find region-specific patterns.
DIABETES_REGIONS = [
    (75,  125),   # region A
    (375, 425),   # region B
    (235, 285),   # region C
    (615, 665),   # region D
]


# ---------------------------------------------------------------------------
# Individual feature extractors
# ---------------------------------------------------------------------------

def gabor_features(iris_strip: np.ndarray, regions: list[tuple[int, int]]) -> np.ndarray:
    """
    Gabor filter-bank energy over specified column regions.

    Uses 8 orientations × 5 frequencies = 40 kernels per region.

    Args:
        iris_strip: grayscale normalised strip (H × W), uint8 or float.
        regions:    list of (col_start, col_end) tuples.

    Returns:
        1-D float32 vector of length len(regions) × 40.
    """
    kernels: list[np.ndarray] = []
    for t in range(8):
        theta = t / 8.0 * np.pi
        for freq in (0.1, 0.2, 0.3, 0.4, 0.5):
            kernels.append(np.real(gabor_kernel(freq, theta=theta, sigma_x=1, sigma_y=1)))

    features: list[float] = []
    for start, end in regions:
        patch = iris_strip[_UPPER_CUT:, start:end].astype(np.float32)
        for kernel in kernels:
            filtered = ndi.convolve(patch, kernel, mode="wrap")
            features.append(float(np.mean(filtered * filtered)))

    return np.array(features, dtype=np.float32)


def hog_features(iris_strip: np.ndarray, regions: list[tuple[int, int]]) -> np.ndarray:
    """
    HOG (Histogram of Oriented Gradients) features per region.

    Args:
        iris_strip: grayscale normalised strip.
        regions:    list of (col_start, col_end) tuples.

    Returns:
        1-D float32 vector.
    """
    features: list[float] = []
    for start, end in regions:
        patch = iris_strip[_UPPER_CUT:, start:end]
        feat = hog(patch, orientations=6, pixels_per_cell=(32, 32), cells_per_block=(1, 1))
        features.extend(feat.tolist())
    return np.array(features, dtype=np.float32)


def lbp_features(
    iris_strip: np.ndarray,
    regions: list[tuple[int, int]],
    n_points: int = 16,
) -> np.ndarray:
    """
    LBP (Local Binary Pattern) uniform histogram features per region.

    Args:
        iris_strip: grayscale normalised strip.
        regions:    list of (col_start, col_end) tuples.
        n_points:   number of LBP neighbours (default 16).

    Returns:
        1-D float32 vector of length len(regions) × (n_points + 2).
    """
    features: list[float] = []
    for start, end in regions:
        patch = iris_strip[_UPPER_CUT:, start:end]
        lbp = local_binary_pattern(patch, n_points, 2, method="uniform")
        hist, _ = np.histogram(
            lbp,
            density=True,
            bins=n_points + 2,
            range=(0, n_points + 2),
        )
        features.extend(hist.astype(np.float32).tolist())
    return np.array(features, dtype=np.float32)


def pixel_features(
    iris_strip: np.ndarray,
    regions: list[tuple[int, int]],
    downsample: float = 4.0,
) -> np.ndarray:
    """
    Downsampled raw pixel intensities per region.

    Args:
        iris_strip: grayscale normalised strip.
        regions:    list of (col_start, col_end) tuples.
        downsample: scale factor — output is 1/downsample of input resolution.

    Returns:
        1-D float32 vector.
    """
    features: list[float] = []
    for start, end in regions:
        patch = iris_strip[_UPPER_CUT:, start:end]
        small = rescale(patch, 1.0 / downsample, preserve_range=True, anti_aliasing=True)
        features.extend(small.flatten().astype(np.float32).tolist())
    return np.array(features, dtype=np.float32)


# ---------------------------------------------------------------------------
# Combined extractor
# ---------------------------------------------------------------------------

def extract_all(
    iris_strip: np.ndarray,
    regions: list[tuple[int, int]] | None = None,
    *,
    use_gabor: bool = True,
    use_hog: bool = True,
    use_lbp: bool = True,
    use_pixel: bool = True,
    downsample: float = 4.0,
) -> np.ndarray:
    """
    Concatenate all enabled feature types into a single vector.

    Args:
        iris_strip: grayscale normalised iris strip (H × W).
        regions:    column region tuples; defaults to DIABETES_REGIONS.
        use_gabor / use_hog / use_lbp / use_pixel: toggle each type.
        downsample: downsampling factor for pixel features.

    Returns:
        Concatenated float32 feature vector.
    """
    if regions is None:
        regions = DIABETES_REGIONS

    parts: list[np.ndarray] = []
    if use_gabor:
        parts.append(gabor_features(iris_strip, regions))
    if use_hog:
        parts.append(hog_features(iris_strip, regions))
    if use_lbp:
        parts.append(lbp_features(iris_strip, regions))
    if use_pixel:
        parts.append(pixel_features(iris_strip, regions, downsample))

    return np.concatenate(parts) if parts else np.array([], dtype=np.float32)


# ---------------------------------------------------------------------------
# Preprocessing helper
# ---------------------------------------------------------------------------

def prepare_strip(normalized_path: str) -> np.ndarray:
    """
    Load a saved normalised iris strip, convert to grayscale, and equalise.

    This matches the preprocessing used in the ICBME 2018 paper before
    feature extraction.

    Args:
        normalized_path: path returned by IrisNormalizer.process().

    Returns:
        Grayscale equalised strip as uint8 array.
    """
    bgr = cv2.imread(normalized_path)
    if bgr is None:
        raise FileNotFoundError(f"Cannot read strip: {normalized_path}")
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    return cv2.equalizeHist(gray)
