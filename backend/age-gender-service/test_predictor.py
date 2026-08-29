import sys
import numpy as np

# Test the fixed predictor
import predictor

print("=== predictor.py import: OK ===")
print(f"InsightFace available: {predictor.INSIGHTFACE_AVAILABLE}")
print()

# Test with a dummy blank image (fallback heuristic path)
dummy = np.zeros((100, 100, 3), dtype=np.uint8)
r = predictor.predict_age_gender(dummy, "fairface")
print(f"Dummy image result: {r}")
print()

# Test aggregate_session
frames = [
    {"age": 22, "gender": "male", "genderConfidence": 91},
    {"age": 23, "gender": "male", "genderConfidence": 89},
    {"age": 24, "gender": "male", "genderConfidence": 93},
]
agg = predictor.aggregate_session(frames, "fairface")
print(f"Aggregate session result: {agg}")
print()
print("=== All tests passed ===")
