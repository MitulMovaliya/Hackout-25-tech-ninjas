#!/usr/bin/env python
"""
Simple Python AI worker for image analysis.
Reads a JSON object from stdin and writes JSON to stdout.

Supported action: "classify_images"
Input format:
{ "action": "classify_images", "image_paths": ["/abs/path/img1.jpg", ...] }

Output format:
{ "predictions": [{"class":"mangrove","confidence":0.72,...}], "averageConfidence":0.72, "primaryClass":"mangrove", "isValid":true, "totalImages":n, "validImages":m }

This worker uses Pillow and numpy for lightweight image stats.
"""
import sys
import json
import os
from PIL import Image
import numpy as np


def analyze_image(path):
    try:
        with Image.open(path) as img:
            img = img.convert("RGB")
            arr = np.array(img)
            h, w, c = arr.shape

            total = h * w
            r = arr[:, :, 0].astype(np.int32)
            g = arr[:, :, 1].astype(np.int32)
            b = arr[:, :, 2].astype(np.int32)

            # simple green / brown / blue detection
            green_mask = (g > r + 20) & (g > b + 10) & (g > 80)
            brown_mask = (r > 100) & (g > 60) & (b < 80) & (r > g) & (g > b)
            blue_mask = (b > r + 15) & (b > g + 10) & (b > 60)

            green_ratio = float(np.count_nonzero(green_mask)) / total
            brown_ratio = float(np.count_nonzero(brown_mask)) / total
            blue_ratio = float(np.count_nonzero(blue_mask)) / total

            avg_brightness = float(np.mean((r + g + b) / 3.0))

            # simple heuristic for class
            if green_ratio > 0.25 and blue_ratio > 0.05:
                cls = "mangrove"
                confidence = 0.6 + min(0.3, green_ratio)
            elif brown_ratio > 0.2 and green_ratio < 0.1:
                cls = "cutting"
                confidence = 0.55 + min(0.25, brown_ratio)
            elif blue_ratio > 0.4:
                cls = "water_pollution"
                confidence = 0.6 + min(0.25, blue_ratio)
            else:
                cls = "unknown"
                confidence = 0.4 + max(0.0, min(0.2, green_ratio))

            return {
                "class": cls,
                "confidence": float(round(min(confidence, 0.98), 3)),
                "model": "python-heuristic-v1",
                "timestamp": None,
                "details": {
                    "greenRatio": green_ratio,
                    "brownRatio": brown_ratio,
                    "blueRatio": blue_ratio,
                    "averageBrightness": avg_brightness,
                    "dimensions": {"width": w, "height": h}
                }
            }
    except Exception as e:
        return {"class": "invalid", "confidence": 0.0, "model": "python-heuristic-v1", "error": str(e)}


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception as e:
        print(json.dumps({"error": "invalid input", "message": str(e)}))
        sys.exit(1)

    action = payload.get("action")

    if action == "classify_images":
        image_paths = payload.get("image_paths", [])
        predictions = []
        for p in image_paths:
            # allow relative paths by resolving against cwd
            p_abs = os.path.abspath(p)
            predictions.append(analyze_image(p_abs))

        valid = [pred for pred in predictions if pred.get("class") != "invalid"]
        avg_conf = float(sum([pred.get("confidence", 0) for pred in valid]) / len(valid)) if valid else 0.0
        primary = None
        if valid:
            counts = {}
            for v in valid:
                counts[v["class"]] = counts.get(v["class"], 0) + 1
            primary = max(counts.keys(), key=lambda k: counts[k])

        out = {
            "predictions": predictions,
            "averageConfidence": float(round(avg_conf, 3)),
            "primaryClass": primary or "unknown",
            "isValid": float(avg_conf) > 0.6,
            "totalImages": len(image_paths),
            "validImages": len(valid)
        }

        sys.stdout.write(json.dumps(out))
        sys.stdout.flush()
    else:
        print(json.dumps({"error": "unsupported action"}))


if __name__ == "__main__":
    main()
