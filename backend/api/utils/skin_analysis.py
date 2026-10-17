import cv2
import numpy as np

def analyze_skin(image: np.ndarray):
    """
    Developer 4: Skin Tone & Clearness Detection Module
    """
    # Convert to HSV for tone extraction
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    avg_v = np.mean(hsv[:, :, 2])
    
    tone = "Medium"
    if avg_v > 180:
        tone = "Light"
    elif avg_v < 90:
        tone = "Dark"

    # Convert to Grayscale for texture analysis
    blurred = cv2.GaussianBlur(image, (5, 5), 0)
    gray = cv2.cvtColor(blurred, cv2.COLOR_BGR2GRAY)
    
    # Laplacian Variance to detect high-frequency edges (blemishes/pores)
    variance = cv2.Laplacian(gray, cv2.CV_64F).var()

    condition = "Clear"
    score = 0.95
    if variance > 400: 
        condition = "Visible Blemishes"
        score = 0.65
    elif variance > 200:
        condition = "Moderate Texture"
        score = 0.85

    return {
        "skin_tone": tone,
        "condition": condition,
        "texture_score": score,
        "raw_variance": float(variance)
    }
