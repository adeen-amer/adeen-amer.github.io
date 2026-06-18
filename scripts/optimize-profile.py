"""Resize and compress the hero portrait for web delivery."""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "img" / "profile-img.png"
OUT_DIR = ROOT / "assets" / "img"

SIZES = (640, 480, 320)


def main() -> None:
    img = Image.open(SRC)
    img = img.convert("RGB")

    for width in SIZES:
        ratio = width / img.width
        height = round(img.height * ratio)
        resized = img.resize((width, height), Image.Resampling.LANCZOS)
        resized.save(OUT_DIR / f"profile-img-{width}.webp", "WEBP", quality=82, method=6)

    hero = img.resize((640, round(img.height * (640 / img.width))), Image.Resampling.LANCZOS)
    hero.save(SRC, "PNG", optimize=True)
    hero.save(OUT_DIR / "profile-img.webp", "WEBP", quality=82, method=6)

    print(f"Optimized {SRC.name} and wrote WebP variants at {SIZES}px width.")


if __name__ == "__main__":
    main()
