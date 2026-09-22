"""Conservative selection: OCR scores are not calibrated vehicle probabilities."""
import math
import re

PLATE = re.compile(r"^[A-Z]{3}[0-9]{2}[A-Z0-9]$")
TO_LETTER = str.maketrans({"0": "O", "1": "I", "2": "Z", "5": "S", "8": "B"})
TO_DIGIT = str.maketrans({"O": "0", "I": "1", "Z": "2", "S": "5", "B": "8"})


def select_plate(readings, min_score=0.90):
    candidates = {}
    raw_text = []
    for text, score in readings:
        raw_text.append(text)
        if not math.isfinite(score) or not 0 <= score <= 1:
            continue
        value = re.sub(r"[\s-]", "", text.upper())
        if len(value) != 6 or not value.isascii() or not value.isalnum():
            continue
        corrected = False
        if not PLATE.fullmatch(value):
            # Final character can be a digit (car) or a letter (motorcycle).
            fixed = value[:3].translate(TO_LETTER) + value[3:5].translate(TO_DIGIT) + value[5]
            changes = sum(a != b for a, b in zip(value, fixed))
            if not PLATE.fullmatch(fixed) or changes > 2:
                continue
            value, corrected = fixed, True
        candidate = {"plate": value, "score": score, "corrected": corrected}
        existing = candidates.get(value)
        if existing is None or (not corrected, score) > (not existing["corrected"], existing["score"]):
            candidates[value] = candidate

    ranked = sorted(candidates.values(), key=lambda item: item["score"], reverse=True)
    status, plate, confidence = "no_plate", None, "low"
    if len(ranked) > 1:
        status = "ambiguous"
    elif ranked:
        best = ranked[0]
        if best["score"] >= min_score and not best["corrected"]:
            status, plate, confidence = "recognized", best["plate"], "high"
        else:
            status, confidence = "review_required", "medium" if best["corrected"] else "low"
    return {
        "plate": plate, "status": status, "confidence": confidence,
        "ocrConfidence": round(ranked[0]["score"] * 100) if ranked else 0,
        "rawText": "\n".join(raw_text),
        "candidates": [
            {"plate": item["plate"], "ocrConfidence": round(item["score"] * 100), "corrected": item["corrected"]}
            for item in ranked[:5]
        ],
        "engine": "paddleocr-onnx",
    }
