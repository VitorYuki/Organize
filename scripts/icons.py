"""Regenerate the app's checked-in PNG icons with Pillow."""

from pathlib import Path

from PIL import Image, ImageDraw

TARGET = Path(__file__).resolve().parents[1] / "frontend" / "public"
INK = "#12473e"


def main():
    # Draw at twice the largest export size for clean rounded strokes.
    card = Image.new("RGBA", (1024, 1024))
    draw = ImageDraw.Draw(card)
    draw.rounded_rectangle((288, 312, 744, 768), 96, fill="#69a687")
    draw.rounded_rectangle((260, 252, 716, 708), 96, fill="#d8ecc6")
    points = [(376, 476), (456, 552), (610, 408)]
    draw.line(points, fill=INK, width=52, joint="curve")
    for x, y in points:
        draw.ellipse((x - 26, y - 26, x + 26, y + 26), fill=INK)
    card = card.rotate(9, resample=Image.Resampling.BICUBIC)
    image = Image.new("RGB", card.size, INK)
    image.paste(card, mask=card.getchannel("A"))
    for name, size in (
        ("icon-192", 192),
        ("icon-512", 512),
        ("icon-maskable", 512),
        ("apple-touch-icon", 180),
    ):
        image.resize((size, size), Image.Resampling.LANCZOS).save(TARGET / f"{name}.png")


if __name__ == "__main__":
    main()
