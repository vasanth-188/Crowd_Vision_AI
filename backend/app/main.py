from __future__ import annotations

import base64
import binascii
import os
import tempfile
import time

# Load .env from the backend directory (parent of this file's directory)
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
except ImportError:
    pass
from dataclasses import dataclass, field
from types import TracebackType
from typing import Any

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from deepface import DeepFace
except Exception:  # pragma: no cover - optional runtime dependency
    DeepFace = None

try:
    from roboflow import Roboflow
    import supervision as sv
except Exception:  # pragma: no cover - optional runtime dependency
    Roboflow = None
    sv = None


APP_TITLE = "CrowdVision AI Backend"
# Default model for crowd detection
DEFAULT_MODEL_NAME = os.getenv("ROBOFLOW_MODEL_ID", "people_counterv0/1")
DEFAULT_TRACKING = os.getenv("CV_ENABLE_TRACKING", "true").lower() == "true"
TRACK_TTL_SECONDS = float(os.getenv("CV_TRACK_TTL_SECONDS", "2.0"))
TRACK_IOU_THRESHOLD = float(os.getenv("CV_TRACK_IOU_THRESHOLD", "0.3"))
ROBOFLOW_API_URL = os.getenv("ROBOFLOW_API_URL", "https://serverless.roboflow.com")
# Backward/forward-compatible aliases while the project migrates naming.
DETECTION_API_KEY = os.getenv("DETECTION_API_KEY") or os.getenv("ROBOFLOW_API_KEY", "")
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CV_ALLOWED_ORIGINS",
        "http://localhost:8080,http://127.0.0.1:8080,http://localhost:8081,http://127.0.0.1:8081,http://localhost:4173,http://127.0.0.1:4173,http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]


class Box(BaseModel):
    xmin: float
    ymin: float
    xmax: float
    ymax: float


class ZoneDefinition(BaseModel):
    id: str
    name: str
    polygon: list[list[float]] = Field(
        description="List of [x,y] points in image coordinate space"
    )
    threshold: int = 50


class DetectRequest(BaseModel):
    imageBase64: str
    threshold: float = Field(default=0.25, ge=0.01, le=0.95)
    overlap: int = Field(default=50, ge=0, le=100)
    maxDetections: int = Field(default=1500, ge=1, le=10000)
    model: str | None = None
    cameraId: str = "default"
    frameId: int | None = None
    enableTracking: bool = DEFAULT_TRACKING
    zones: list[ZoneDefinition] = Field(default_factory=list)
    enableMissingSearch: bool = False
    missingPersonsDbPath: str | None = None
    matchThreshold: float = Field(default=0.65, ge=0.1, le=0.99)


class DetectionItem(BaseModel):
    label: str
    score: float
    box: Box
    trackingId: str | None = None


class ZoneCount(BaseModel):
    zoneId: str
    zoneName: str
    count: int
    threshold: int
    isBottleneck: bool


class MissingMatch(BaseModel):
    trackingId: str | None = None
    filePath: str
    identity: str
    distance: float


class DetectResponse(BaseModel):
    detections: list[DetectionItem]
    peopleCount: int
    modelUsed: str
    processingTimeMs: float
    zoneCounts: list[ZoneCount] = Field(default_factory=list)
    alerts: list[str] = Field(default_factory=list)
    missingMatches: list[MissingMatch] = Field(default_factory=list)


@dataclass
class TrackedObject:
    track_id: str
    box: Box
    last_seen: float


@dataclass
class CameraTracker:
    next_id: int = 1
    tracks: dict[str, TrackedObject] = field(default_factory=dict)


camera_trackers: dict[str, CameraTracker] = {}
roboflow_client: Any = None
app = FastAPI(title=APP_TITLE, version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_roboflow_client() -> Any:
    global roboflow_client

    if Roboflow is None:
        raise HTTPException(
            status_code=500,
            detail="Detection SDK is not installed in the backend environment",
        )

    if not DETECTION_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Detection provider key missing. Set DETECTION_API_KEY (or ROBOFLOW_API_KEY for backward compatibility).",
        )

    if roboflow_client is None:
        roboflow_client = Roboflow(api_key=DETECTION_API_KEY)

    return roboflow_client


def decode_base64_image(image_base64: str) -> np.ndarray:
    payload = image_base64
    if "," in image_base64:
        payload = image_base64.split(",", 1)[1]

    try:
        raw_bytes = base64.b64decode(payload)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Invalid base64 image payload") from exc

    img_array = np.frombuffer(raw_bytes, dtype=np.uint8)
    image = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Could not decode image")

    return image


def point_in_polygon(point: tuple[float, float], polygon: list[list[float]]) -> bool:
    x, y = point
    inside = False
    n = len(polygon)
    if n < 3:
        return False

    p1x, p1y = polygon[0]
    for i in range(n + 1):
        p2x, p2y = polygon[i % n]
        if min(p1y, p2y) < y <= max(p1y, p2y):
            if x <= max(p1x, p2x):
                if p1y != p2y:
                    xints = (y - p1y) * (p2x - p1x) / (p2y - p1y + 1e-9) + p1x
                else:
                    xints = p1x
                if p1x == p2x or x <= xints:
                    inside = not inside
        p1x, p1y = p2x, p2y

    return inside


def calculate_iou(box1: Box, box2: Box) -> float:
    x1 = max(box1.xmin, box2.xmin)
    y1 = max(box1.ymin, box2.ymin)
    x2 = min(box1.xmax, box2.xmax)
    y2 = min(box1.ymax, box2.ymax)

    intersection = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    area1 = max(0.0, box1.xmax - box1.xmin) * max(0.0, box1.ymax - box1.ymin)
    area2 = max(0.0, box2.xmax - box2.xmin) * max(0.0, box2.ymax - box2.ymin)
    union = area1 + area2 - intersection

    return intersection / union if union > 0 else 0.0


def assign_tracking_ids(camera_id: str, detections: list[DetectionItem]) -> list[DetectionItem]:
    now = time.time()
    tracker = camera_trackers.setdefault(camera_id, CameraTracker())

    tracker.tracks = {
        track_id: track
        for track_id, track in tracker.tracks.items()
        if now - track.last_seen <= TRACK_TTL_SECONDS
    }

    remaining_tracks = dict(tracker.tracks)

    for detection in sorted(detections, key=lambda item: item.score, reverse=True):
        best_track_id: str | None = None
        best_iou = 0.0

        for track_id, track in remaining_tracks.items():
            iou = calculate_iou(detection.box, track.box)
            if iou >= TRACK_IOU_THRESHOLD and iou > best_iou:
                best_iou = iou
                best_track_id = track_id

        if best_track_id is None:
            best_track_id = f"{camera_id}-{tracker.next_id}"
            tracker.next_id += 1

        detection.trackingId = best_track_id
        tracker.tracks[best_track_id] = TrackedObject(
            track_id=best_track_id,
            box=detection.box,
            last_seen=now,
        )
        remaining_tracks.pop(best_track_id, None)

    return detections


def parse_roboflow_predictions(
    raw_result: dict[str, Any],
    confidence: float,
    max_detections: int,
) -> list[DetectionItem]:
    """Parse detector JSON predictions into DetectionItem list."""
    predictions = raw_result.get("predictions", [])
    detections: list[DetectionItem] = []
    
    # Log all classes found for debugging
    if predictions:
        classes_found = {str(p.get('class', 'unknown')).lower() for p in predictions}
        print(f"[DEBUG] Classes found in predictions: {classes_found}")

    for prediction in predictions:
        score = float(prediction.get("confidence", 0.0))
        if score < confidence:
            continue

        label = str(
            prediction.get("class")
            or prediction.get("class_name")
            or prediction.get("label")
            or "unknown"
        ).lower()
        
        # crowdhuman-trial emits class "body" for full person boxes.
        if label not in ["person", "people", "crowdhuman", "human", "body"]:
            continue

        center_x = float(prediction.get("x", 0))
        center_y = float(prediction.get("y", 0))
        width = float(prediction.get("width", 0))
        height = float(prediction.get("height", 0))

        detections.append(
            DetectionItem(
                label="person",
                score=score,
                box=Box(
                    xmin=center_x - width / 2.0,
                    ymin=center_y - height / 2.0,
                    xmax=center_x + width / 2.0,
                    ymax=center_y + height / 2.0,
                ),
            )
        )

    detections.sort(key=lambda item: item.score, reverse=True)
    print(f"[DEBUG] Detected {len(detections)} person(s) after filtering")
    return detections[:max_detections]


def get_person_boxes(
    image: np.ndarray,
    model_name: str,
    confidence: float,
    overlap: int,
    max_detections: int,
) -> list[DetectionItem]:
    """
    Use the detection SDK to detect people in image.
    model_name format: "project_name/version_number" (e.g., "your_project/1")
    """
    rf = get_roboflow_client()

    # Parse model_name: "project_name/version_number"
    if "/" not in model_name:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid model format. Expected 'project_name/version_number', got '{model_name}'"
        )

    project_name, version_str = model_name.rsplit("/", 1)
    try:
        version_num = int(version_str)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid version number '{version_str}'. Must be integer."
        )

    # Save image to temp file for prediction
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as temp_file:
        temp_path = temp_file.name
        cv2.imwrite(temp_path, image)

    try:
        # Get project and model using Roboflow SDK
        project = rf.workspace().project(project_name)
        model = project.version(version_num).model
        
        # Run prediction (confidence uses a 0-100 scale)
        confidence_scaled = int(confidence * 100)
        result = model.predict(temp_path, confidence=confidence_scaled, overlap=overlap).json()
        
        print(f"[DEBUG] Detector: model={model_name}, predictions={len(result.get('predictions', []))}")
        
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Detector inference failed: {exc}"
        ) from exc
    finally:
        try:
            os.unlink(temp_path)
        except OSError:
            pass

    return parse_roboflow_predictions(result, confidence, max_detections)


def count_in_zones(
    detections: list[DetectionItem],
    zones: list[ZoneDefinition],
) -> tuple[list[ZoneCount], list[str]]:
    zone_counts: list[ZoneCount] = []
    alerts: list[str] = []

    for zone in zones:
        count = 0
        for det in detections:
            cx = (det.box.xmin + det.box.xmax) / 2.0
            cy = (det.box.ymin + det.box.ymax) / 2.0
            if point_in_polygon((cx, cy), zone.polygon):
                count += 1

        is_bottleneck = count > zone.threshold
        zone_count = ZoneCount(
            zoneId=zone.id,
            zoneName=zone.name,
            count=count,
            threshold=zone.threshold,
            isBottleneck=is_bottleneck,
        )
        zone_counts.append(zone_count)

        if is_bottleneck:
            alerts.append(
                f"Bottleneck alert in {zone.name}: {count} tracked people (threshold {zone.threshold})"
            )

    return zone_counts, alerts


def run_deepface_matching(
    image: np.ndarray,
    detections: list[DetectionItem],
    db_path: str,
    threshold: float,
) -> list[MissingMatch]:
    if not db_path or not os.path.isdir(db_path):
        raise HTTPException(status_code=400, detail="missingPersonsDbPath does not exist")

    if DeepFace is None:
        raise HTTPException(
            status_code=500,
            detail="DeepFace is not installed correctly in backend environment",
        )

    matches: list[MissingMatch] = []

    for det in detections:
        xmin = max(0, int(det.box.xmin))
        ymin = max(0, int(det.box.ymin))
        xmax = min(image.shape[1], int(det.box.xmax))
        ymax = min(image.shape[0], int(det.box.ymax))

        if xmax <= xmin or ymax <= ymin:
            continue

        crop = image[ymin:ymax, xmin:xmax]
        if crop.size == 0:
            continue

        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as temp_file:
            temp_path = temp_file.name
            cv2.imwrite(temp_path, crop)

        try:
            results = DeepFace.find(
                img_path=temp_path,
                db_path=db_path,
                enforce_detection=False,
                silent=True,
                detector_backend="opencv",
            )

            if not results:
                continue

            df = results[0]
            if df.empty:
                continue

            best_row = df.iloc[0]
            distance = float(best_row.get("distance", 1.0))
            if distance <= threshold:
                identity = str(best_row.get("identity", "unknown"))
                matches.append(
                    MissingMatch(
                        trackingId=det.trackingId,
                        filePath=identity,
                        identity=os.path.basename(identity),
                        distance=distance,
                    )
                )
        finally:
            try:
                os.unlink(temp_path)
            except OSError:
                pass

    return matches


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": APP_TITLE,
        "detector": "external-sdk",
        "defaultModel": DEFAULT_MODEL_NAME,
        "tracking": DEFAULT_TRACKING,
        "providerConfigured": bool(DETECTION_API_KEY),
        "inferenceApi": "configured",
    }


@app.post("/", response_model=DetectResponse)
def detect(payload: DetectRequest) -> DetectResponse:
    started = time.perf_counter()
    model_name = payload.model or DEFAULT_MODEL_NAME

    image = decode_base64_image(payload.imageBase64)
    detections = get_person_boxes(
        image=image,
        model_name=model_name,
        confidence=payload.threshold,
        overlap=payload.overlap,
        max_detections=payload.maxDetections,
    )

    if payload.enableTracking:
        detections = assign_tracking_ids(payload.cameraId, detections)

    zone_counts, alerts = count_in_zones(detections, payload.zones)

    missing_matches: list[MissingMatch] = []
    if payload.enableMissingSearch and payload.missingPersonsDbPath:
        missing_matches = run_deepface_matching(
            image=image,
            detections=detections,
            db_path=payload.missingPersonsDbPath,
            threshold=payload.matchThreshold,
        )

    elapsed_ms = (time.perf_counter() - started) * 1000.0
    return DetectResponse(
        detections=detections,
        peopleCount=len(detections),
        modelUsed=model_name,
        processingTimeMs=elapsed_ms,
        zoneCounts=zone_counts,
        alerts=alerts,
        missingMatches=missing_matches,
    )


@app.get("/models")
def models() -> dict[str, list[str]]:
    return {"supported": [DEFAULT_MODEL_NAME]}
