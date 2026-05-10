from pathlib import Path
import time

import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision


MODEL_PATH = Path(__file__).resolve().parent / "models" / "pose_landmarker_full.task"
CAMERA_INDEX = 0
WINDOW_NAME = "MediaPipe Live Pose Tracking"
LANDMARK_COLOR = (0, 255, 0)
CONNECTION_COLOR = (255, 255, 255)
VISIBILITY_THRESHOLD = 0.5


POSE_CONNECTIONS = (
    (0, 1),
    (1, 2),
    (2, 3),
    (3, 7),
    (0, 4),
    (4, 5),
    (5, 6),
    (6, 8),
    (9, 10),
    (11, 12),
    (11, 13),
    (13, 15),
    (15, 17),
    (15, 19),
    (15, 21),
    (17, 19),
    (12, 14),
    (14, 16),
    (16, 18),
    (16, 20),
    (16, 22),
    (18, 20),
    (11, 23),
    (12, 24),
    (23, 24),
    (23, 25),
    (24, 26),
    (25, 27),
    (26, 28),
    (27, 29),
    (28, 30),
    (29, 31),
    (30, 32),
    (27, 31),
    (28, 32),
)


def draw_pose_landmarks(frame, detection_result):
    height, width = frame.shape[:2]

    for pose_landmarks in detection_result.pose_landmarks:
        points = []
        for landmark in pose_landmarks:
            visible = getattr(landmark, "visibility", 1.0) >= VISIBILITY_THRESHOLD
            in_frame = 0 <= landmark.x <= 1 and 0 <= landmark.y <= 1

            if visible and in_frame:
                points.append((int(landmark.x * width), int(landmark.y * height)))
            else:
                points.append(None)

        for start_index, end_index in POSE_CONNECTIONS:
            start = points[start_index]
            end = points[end_index]
            if start is not None and end is not None:
                cv2.line(frame, start, end, CONNECTION_COLOR, 2)

        for point in points:
            if point is not None:
                cv2.circle(frame, point, 4, LANDMARK_COLOR, -1)


def create_pose_landmarker():
    model_path = str(MODEL_PATH)
    print(f"Loading pose model from: {model_path}")

    if not MODEL_PATH.is_file():
        raise FileNotFoundError(
            "Pose model file was not found.\n"
            f"Expected path: {model_path}\n"
            "Make sure backend/models/pose_landmarker_full.task exists."
        )

    base_options = python.BaseOptions(model_asset_path=model_path)
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
        raise RuntimeError("Could not open webcam. Try changing CAMERA_INDEX.")

    start_time = time.monotonic()

    with create_pose_landmarker() as landmarker:
        while camera.isOpened():
            success, frame = camera.read()
            if not success:
                break

            frame = cv2.flip(frame, 1)
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
            timestamp_ms = int((time.monotonic() - start_time) * 1000)

            detection_result = landmarker.detect_for_video(mp_image, timestamp_ms)
            draw_pose_landmarks(frame, detection_result)

            cv2.imshow(WINDOW_NAME, frame)

            if cv2.waitKey(1) & 0xFF in (27, ord("q")):
                break

    camera.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
