"""
LUDIA Iris Processor — entry point.

Performs iris segmentation and Daugman's Rubber Sheet Model normalisation on
a single eye image.

Usage
-----
    # Automatic detection
    python main.py <path/to/iris_image.jpg>

    # Manual annotation mode (colour-painted circles)
    python main.py <path/to/iris_image.jpg> \\
        --pupil-annotation <pupil_red.jpg> \\
        --iris-annotation  <iris_blue.jpg>

    python main.py <path/to/iris_image.jpg> --output ./results --verbose

Outputs (saved to --output directory)
--------------------------------------
    <stem>_segmented.png   — circular iris crop (non-iris pixels blacked out)
    <stem>_normalized.png  — 512 × 64 Daugman normalised strip
    <stem>_annotated.png   — original image with detected circles overlaid
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

# iris_processing/ is the working directory when this script is executed
from iris_processor import IrisNormalizer


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="iris_processor",
        description="LUDIA Iris Processor — segmentation & Daugman normalisation",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "image",
        help="Path to the input iris image (NIR or colour JPEG / PNG).",
    )
    parser.add_argument(
        "--output",
        default="output",
        metavar="DIR",
        help="Output directory (default: ./output).",
    )
    parser.add_argument(
        "--pupil-annotation",
        metavar="FILE",
        default=None,
        help=(
            "Image with the PUPIL region painted in solid RED. "
            "When provided together with --iris-annotation, automatic "
            "detection is skipped and circle parameters are read from "
            "the colour annotations instead."
        ),
    )
    parser.add_argument(
        "--iris-annotation",
        metavar="FILE",
        default=None,
        help=(
            "Image with the IRIS region painted in solid BLUE. "
            "Must be used together with --pupil-annotation."
        ),
    )
    parser.add_argument(
        "--sam",
        action="store_true",
        help=(
            "Use MobileSAM for automatic iris/pupil detection. "
            "Runs locally — no API key required. "
            "Requires models/mobile_sam.pt to be present."
        ),
    )
    parser.add_argument(
        "--ai",
        action="store_true",
        help=(
            "Use Claude Vision API (claude-opus-4-7) for automatic iris/pupil "
            "detection. Requires ANTHROPIC_API_KEY to be set. "
            "Overrides --pupil-annotation / --iris-annotation when present."
        ),
    )
    parser.add_argument(
        "--no-annotated",
        action="store_true",
        help="Skip saving the annotated detection overlay.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable DEBUG-level logging.",
    )
    return parser.parse_args()


def _banner() -> None:
    print()
    print("╔══════════════════════════════════════════════════════════╗")
    print("║          LUDIA · Iris Biometric Processor                ║")
    print("║          Daugman Rubber Sheet Model  ·  v1.0             ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print()


def _print_results(result: dict) -> None:
    p = result["pupil"]
    i = result["iris"]
    e = result["eccentricity"]

    print("── Detection Results ───────────────────────────────────────")
    print(f"  Pupil  │ centre ({p['cx']:>8.2f}, {p['cy']:>8.2f})  "
          f"radius {p['r']:>7.2f} px")
    print(f"  Iris   │ centre ({i['cx']:>8.2f}, {i['cy']:>8.2f})  "
          f"radius {i['r']:>7.2f} px")
    print(f"  Eccentricity │ Δx = {e['dx']:+.2f} px   Δy = {e['dy']:+.2f} px")
    print("────────────────────────────────────────────────────────────")
    print(f"  Segmented iris  → {result['segmented_path']}")
    print(f"  Normalised strip → {result['normalized_path']}")
    if result.get("annotated_path"):
        print(f"  Annotated image → {result['annotated_path']}")
    print()


def main() -> None:
    args = _parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.WARNING,
        format="%(levelname)-8s │ %(name)s — %(message)s",
        stream=sys.stderr,
    )

    _banner()

    image_path = Path(args.image)
    if not image_path.exists():
        print(f"Error: file not found — {image_path}", file=sys.stderr)
        sys.exit(1)

    processor = IrisNormalizer()

    use_both_annotations = bool(args.pupil_annotation and args.iris_annotation)
    use_iris_only        = bool(args.iris_annotation and not args.pupil_annotation)

    try:
        if args.sam:
            result = processor.process_with_sam(
                str(image_path),
                output_dir=args.output,
                save_annotated=not args.no_annotated,
            )
        elif args.ai:
            result = processor.process_with_ai(
                str(image_path),
                output_dir=args.output,
                save_annotated=not args.no_annotated,
            )
        elif use_both_annotations:
            result = processor.process_from_annotations(
                str(image_path),
                pupil_annotation_path=args.pupil_annotation,
                iris_annotation_path=args.iris_annotation,
                output_dir=args.output,
                save_annotated=not args.no_annotated,
            )
        elif use_iris_only:
            result = processor.process_from_iris_annotation(
                str(image_path),
                iris_annotation_path=args.iris_annotation,
                output_dir=args.output,
                save_annotated=not args.no_annotated,
            )
        else:
            result = processor.process(
                str(image_path),
                output_dir=args.output,
                save_annotated=not args.no_annotated,
            )
    except FileNotFoundError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)
    except Exception as exc:
        print(f"Unexpected error: {exc}", file=sys.stderr)
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(2)

    _print_results(result)


if __name__ == "__main__":
    main()
