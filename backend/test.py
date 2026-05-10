from pathlib import Path
import time
import math

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python
from mediapipe.tasks.python import vision


MODEL_PATH = Path(__file__).resolve().parent / "models" / "pose_landmarker_full.task"

CAMERA_INDEX = 0
WINDOW_NAME = "Bicep Curl Tracker"

LANDMARK_COLOR = (0, 255, 0)
CONNECTION_COLOR = (255, 255, 255)

VISIBILITY_THRESHOLD = 0.5

counter = 0
stage = "down"


POSE_CONNECTIONS = (
    (11, 13),
    (13, 15),
    (12, 14),
    (14, 16),
    (11, 12),
    (11, 23),
    (12, 24),
    (23, 24),
)


def calculate_angle(a, b, c):
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)

    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - \
              np.arctan2(a[1] - b[1], a[0] - b[0])

    angle = np.abs(radians * 180.0 / np.pi)

    if angle > 180:
        angle = 360 - angle

    return angle


def draw_pose_landmarks(frame, detection_result):
    global counter
    global stage

    height, width = frame.shape[:2]

    if not detection_result.pose_landmarks:
        return

    pose_landmarks = detection_result.pose_landmarks[0]

    points = []

    for landmark in pose_landmarks:
        visible = getattr(landmark, "visibility", 1.0) >= VISIBILITY_THRESHOLD
        in_frame = 0 <= landmark.x <= 1 and 0 <= landmark.y <= 1

        if visible and in_frame:
            points.append((int(landmark.x * width), int(landmark.y * height)))
        else:
            points.append(None)

    # Draw skeleton
    for start_index, end_index in POSE_CONNECTIONS:
        start = points[start_index]
        end = points[end_index]

        if start is not None and end is not None:
            cv2.line(frame, start, end, CONNECTION_COLOR, 2)

    for point in points:
        if point is not None:
            cv2.circle(frame, point, 5, LANDMARK_COLOR, -1)

    # LEFT ARM LANDMARKS
    shoulder = [
        pose_landmarks[11].x,
        pose_landmarks[11].y
    ]

    elbow = [
        pose_landmarks[13].x,
        pose_landmarks[13].y
    ]

    wrist = [
        pose_landmarks[15].x,
        pose_landmarks[15].y
    ]

    # Calculate elbow angle
    angle = calculate_angle(shoulder, elbow, wrist)

    # Draw angle text
    elbow_coords = (
        int(elbow[0] * width),
        int(elbow[1] * height)
    )

    cv2.putText(
        frame,
        str(int(angle)),
        elbow_coords,
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (0, 255, 255),
        2,
        cv2.LINE_AA
    )

    # Curl counter logic
    if angle > 160:
        stage = "down"

    if angle < 45 and stage == "down":
        stage = "up"
        counter += 1

    # UI
    cv2.rectangle(frame, (0, 0), (300, 120), (0, 0, 0), -1)

    cv2.putText(
        frame,
        f"Reps: {counter}",
        (20, 50),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (255, 255, 255),
        2,
        cv2.LINE_AA
    )

    cv2.putText(
        frame,
        f"Stage: {stage}",
        (20, 100),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (255, 255, 255),
        2,
        cv2.LINE_AA
    )


def create_pose_landmarker():
    model_path = str(MODEL_PATH)

    if not MODEL_PATH.is_file():
        raise FileNotFoundError(
            f"Model not found: {model_path}"
        )

    base_options = python.BaseOptions(
        model_asset_path=model_path
    )

    options = vision.PoseLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.VIDEO,
        num_poses=1,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    return vision.PoseLandmarker.create_from_options(options)


def main():
    camera = cv2.VideoCapture(CAMERA_INDEX)

    if not camera.isOpened():
        raise RuntimeError("Could not open webcam.")

    start_time = time.monotonic()

    with create_pose_landmarker() as landmarker:

        while camera.isOpened():

            success, frame = camera.read()

            if not success:
                break

            frame = cv2.flip(frame, 1)

            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            mp_image = mp.Image(
                image_format=mp.ImageFormat.SRGB,
                data=rgb_frame
            )

            timestamp_ms = int(
                (time.monotonic() - start_time) * 1000
            )

            detection_result = landmarker.detect_for_video(
                mp_image,
                timestamp_ms
            )

            draw_pose_landmarks(frame, detection_result)

            cv2.imshow(WINDOW_NAME, frame)

            if cv2.waitKey(1) & 0xFF in (27, ord("q")):
                break

    camera.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()