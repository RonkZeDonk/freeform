from pathlib import Path
import json
import math
import time

import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "pose_landmarker_full.task"
POSES_PATH = BASE_DIR / "poses.json"

CAMERA_INDEX = 0
WINDOW_NAME = "Pose Maker"
VISIBILITY_THRESHOLD = 0.5
MATCH_THRESHOLD = 0.22

LANDMARK_COLOR = (0, 255, 0)
CONNECTION_COLOR = (255, 255, 255)
TEXT_COLOR = (255, 255, 255)
MATCH_COLOR = (0, 220, 255)
ERROR_COLOR = (0, 80, 255)

KEY_LANDMARKS = (
    0,
    11,
    12,
    13,
    14,
    15,
    16,
    23,
    24,
)

UPPER_BODY_CONNECTIONS = (
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
)


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


def load_saved_poses():
    if not POSES_PATH.exists():
        return []

    with POSES_PATH.open("r", encoding="utf-8") as file:
        data = json.load(file)

    return data.get("poses", [])


def save_poses(poses):
    data = {
        "version": 1,
        "landmarks": list(KEY_LANDMARKS),
        "normalization": "upper body only, centered on shoulder midpoint and scaled by shoulder width",
        "poses": poses,
    }
    with POSES_PATH.open("w", encoding="utf-8") as file:
        json.dump(data, file, indent=2)


def landmark_visible(landmark):
    return getattr(landmark, "visibility", 1.0) >= VISIBILITY_THRESHOLD


def distance_2d(first, second):
    return math.hypot(first.x - second.x, first.y - second.y)


def normalize_landmarks(pose_landmarks):
    left_shoulder = pose_landmarks[11]
    right_shoulder = pose_landmarks[12]

    required = (left_shoulder, right_shoulder)
    if not all(landmark_visible(landmark) for landmark in required):
        return None

    center_x = (left_shoulder.x + right_shoulder.x) / 2
    center_y = (left_shoulder.y + right_shoulder.y) / 2
    center_z = (left_shoulder.z + right_shoulder.z) / 2
    scale = distance_2d(left_shoulder, right_shoulder)

    if scale < 0.01:
        return None

    normalized = []
    for index in KEY_LANDMARKS:
        landmark = pose_landmarks[index]
        if not landmark_visible(landmark):
            return None

        normalized.append(
            {
                "index": index,
                "x": (landmark.x - center_x) / scale,
                "y": (landmark.y - center_y) / scale,
                "z": (landmark.z - center_z) / scale,
            }
        )

    return normalized


def pose_distance(current_pose, saved_pose):
    total = 0
    compared = 0

    for current, saved in zip(current_pose, saved_pose):
        total += math.sqrt(
            (current["x"] - saved["x"]) ** 2
            + (current["y"] - saved["y"]) ** 2
            + (current["z"] - saved["z"]) ** 2
        )
        compared += 1

    if compared == 0:
        return float("inf")

    return total / compared


def find_best_match(current_pose, saved_poses):
    best_pose = None
    best_distance = float("inf")

    for saved_pose in saved_poses:
        distance = pose_distance(current_pose, saved_pose["landmarks"])
        if distance < best_distance:
            best_pose = saved_pose
            best_distance = distance

    if best_pose is None:
        return None, best_distance

    return best_pose, best_distance


def draw_pose_landmarks(frame, pose_landmarks):
    height, width = frame.shape[:2]
    points = []

    for landmark in pose_landmarks:
        visible = landmark_visible(landmark)
        in_frame = 0 <= landmark.x <= 1 and 0 <= landmark.y <= 1

        if visible and in_frame:
            points.append((int(landmark.x * width), int(landmark.y * height)))
        else:
            points.append(None)

    for start_index, end_index in UPPER_BODY_CONNECTIONS:
        start = points[start_index]
        end = points[end_index]
        if start is not None and end is not None:
            cv2.line(frame, start, end, CONNECTION_COLOR, 2)

    for point in points:
        if point is not None:
            cv2.circle(frame, point, 4, LANDMARK_COLOR, -1)


def draw_status(frame, lines):
    y = 28
    for text, color in lines:
        cv2.putText(
            frame,
            text,
            (16, y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.65,
            color,
            2,
            cv2.LINE_AA,
        )
        y += 28


def prompt_pose_name(existing_count):
    name = input("Pose name: ").strip()
    if name:
        return name

    return f"pose_{existing_count + 1}"


def main():
    saved_poses = load_saved_poses()
    matching_enabled = True
    message = "Press S to save pose, M to toggle matching, Q/Esc to quit."

    camera = cv2.VideoCapture(CAMERA_INDEX)
    if not camera.isOpened():
        raise RuntimeError("Could not open webcam. Try changing CAMERA_INDEX.")

    print(f"Loaded {len(saved_poses)} saved poses from {POSES_PATH}")
    print("Controls: S = save current pose, M = toggle matching, Q/Esc = quit")

    latest_normalized_pose = None
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
            status_lines = [
                (f"Saved poses: {len(saved_poses)}", TEXT_COLOR),
                ("S: save  M: match on/off  Q/Esc: quit", TEXT_COLOR),
            ]

            if detection_result.pose_landmarks:
                pose_landmarks = detection_result.pose_landmarks[0]
                draw_pose_landmarks(frame, pose_landmarks)
                latest_normalized_pose = normalize_landmarks(pose_landmarks)

                if latest_normalized_pose is None:
                    status_lines.append(
                        ("Pose not stable enough to save/match.", ERROR_COLOR)
                    )
                elif matching_enabled and saved_poses:
                    best_pose, best_distance = find_best_match(
                        latest_normalized_pose, saved_poses
                    )

                    if best_pose and best_distance <= MATCH_THRESHOLD:
                        status_lines.append(
                            (
                                f"Match: {best_pose['name']} ({best_distance:.3f})",
                                MATCH_COLOR,
                            )
                        )
                    elif best_pose:
                        status_lines.append(
                            (
                                f"Closest: {best_pose['name']} ({best_distance:.3f})",
                                TEXT_COLOR,
                            )
                        )
                elif not matching_enabled:
                    status_lines.append(("Matching paused.", TEXT_COLOR))
            else:
                latest_normalized_pose = None
                status_lines.append(("No body detected.", ERROR_COLOR))

            status_lines.append((message, TEXT_COLOR))
            draw_status(frame, status_lines)
            cv2.imshow(WINDOW_NAME, frame)

            key = cv2.waitKey(1) & 0xFF
            if key in (27, ord("q"), ord("Q")):
                break

            if key in (ord("m"), ord("M")):
                matching_enabled = not matching_enabled
                message = f"Matching {'enabled' if matching_enabled else 'paused'}."

            if key in (ord("s"), ord("S")):
                if latest_normalized_pose is None:
                    message = "No stable pose available to save."
                    continue

                cv2.destroyWindow(WINDOW_NAME)
                pose_name = prompt_pose_name(len(saved_poses))
                saved_poses.append(
                    {
                        "name": pose_name,
                        "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                        "landmarks": latest_normalized_pose,
                    }
                )
                save_poses(saved_poses)
                message = f"Saved pose: {pose_name}"
                print(message)

    camera.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
