#stream src: http://127.0.0.1:8000/video_feed
#change height: http://127.0.0.1:8000/height?value=5ft10

from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import math
from pathlib import Path
import time
from urllib.parse import parse_qs, urlparse

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python
from mediapipe.tasks.python import vision


DEBUG_MODE = False

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "pose_landmarker_full.task"
POSES_PATH = BASE_DIR / "poses.json"

HOST = "127.0.0.1"
PORT = 8000
CAMERA_INDEX = 0
JPEG_QUALITY = 85
STREAM_BOUNDARY = "frame"

VISIBILITY_THRESHOLD = 0.5
MATCH_THRESHOLD = 0.35
BASELINE_HEIGHT_INCHES = 72
DEFAULT_HEIGHT_INCHES = 72
BASE_ANGLE_TOLERANCE_DEGREES = 18

LANDMARK_COLOR = (0, 255, 0)
CONNECTION_COLOR = (255, 255, 255)
TEXT_COLOR = (255, 255, 255)
MATCH_COLOR = (0, 220, 255)
ERROR_COLOR = (0, 80, 255)

KEY_LANDMARKS = (
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

current_height_inches = DEFAULT_HEIGHT_INCHES


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


def load_reference_poses():
    if not POSES_PATH.exists():
        return []

    with POSES_PATH.open("r", encoding="utf-8") as file:
        data = json.load(file)

    return data.get("poses", [])


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


def landmarks_by_index(pose):
    return {landmark["index"]: landmark for landmark in pose}


def pose_distance(current_pose, reference_pose):
    current_points = landmarks_by_index(current_pose)
    reference_points = landmarks_by_index(reference_pose)
    shared_indexes = set(current_points) & set(reference_points)
    total = 0

    for index in shared_indexes:
        current = current_points[index]
        reference = reference_points[index]
        total += math.sqrt(
            (current["x"] - reference["x"]) ** 2
            + (current["y"] - reference["y"]) ** 2
            + (current["z"] - reference["z"]) ** 2
        )

    if not shared_indexes:
        return float("inf")

    return total / len(shared_indexes)


def angle_degrees(first, middle, last):
    first_angle = math.atan2(first["y"] - middle["y"], first["x"] - middle["x"])
    last_angle = math.atan2(last["y"] - middle["y"], last["x"] - middle["x"])
    angle = abs(math.degrees(first_angle - last_angle))

    if angle > 180:
        return 360 - angle

    return angle


def upper_body_angles(pose):
    points = landmarks_by_index(pose)
    angle_specs = {
        "left_elbow": (11, 13, 15),
        "right_elbow": (12, 14, 16),
        "left_shoulder": (13, 11, 23),
        "right_shoulder": (14, 12, 24),
    }
    angles = {}

    for name, indexes in angle_specs.items():
        if not all(index in points for index in indexes):
            continue

        first, middle, last = indexes
        angles[name] = angle_degrees(points[first], points[middle], points[last])

    return angles


def angle_distance(current_pose, reference_pose):
    current_angles = upper_body_angles(current_pose)
    reference_angles = upper_body_angles(reference_pose)
    shared_angles = set(current_angles) & set(reference_angles)

    if not shared_angles:
        return float("inf")

    total = sum(
        abs(current_angles[name] - reference_angles[name]) for name in shared_angles
    )
    return total / len(shared_angles)


def height_tolerance_multiplier(height_inches):
    height_difference = abs(height_inches - BASELINE_HEIGHT_INCHES)
    return 1 + (height_difference / BASELINE_HEIGHT_INCHES) * 0.75


def adjusted_match_threshold(height_inches):
    return MATCH_THRESHOLD * height_tolerance_multiplier(height_inches)


def adjusted_angle_tolerance(height_inches):
    return BASE_ANGLE_TOLERANCE_DEGREES * height_tolerance_multiplier(height_inches)


def find_closest_pose(current_pose, reference_poses):
    closest_pose = None
    closest_distance = float("inf")
    closest_angle_distance = float("inf")
    closest_score = float("inf")

    for reference_pose in reference_poses:
        distance = pose_distance(current_pose, reference_pose["landmarks"])
        angles = angle_distance(current_pose, reference_pose["landmarks"])
        score = distance + (angles / 180)

        if closest_pose is None or score < closest_score:
            closest_pose = reference_pose
            closest_distance = distance
            closest_angle_distance = angles
            closest_score = score

    return closest_pose, closest_distance, closest_angle_distance


def find_best_match(current_pose, reference_poses, height_inches):
    best_pose, best_distance, best_angle_distance = find_closest_pose(
        current_pose, reference_poses
    )

    if best_pose is None:
        return None, best_distance, best_angle_distance

    matches = (
        best_distance <= adjusted_match_threshold(height_inches)
        and best_angle_distance <= adjusted_angle_tolerance(height_inches)
    )

    return best_pose if matches else None, best_distance, best_angle_distance


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

    for index, point in enumerate(points):
        if point is not None:
            if index >= 11:
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


def parse_height_inches(text):
    cleaned = text.strip().lower().replace("feet", "ft").replace("foot", "ft")
    cleaned = cleaned.replace("inches", "in").replace("inch", "in")
    cleaned = cleaned.replace('"', " in").replace("'", " ft")

    if not cleaned:
        return DEFAULT_HEIGHT_INCHES

    if "ft" in cleaned:
        feet_text, _, rest = cleaned.partition("ft")
        feet = float(feet_text.strip() or 0)
        inches_text = rest.replace("in", "").strip()
        inches = float(inches_text or 0)
        return int(round(feet * 12 + inches))

    parts = cleaned.split()
    if len(parts) == 2 and all(part.replace(".", "", 1).isdigit() for part in parts):
        return int(round(float(parts[0]) * 12 + float(parts[1])))

    return int(round(float(cleaned.replace("in", "").strip())))


def format_height(height_inches):
    return f"{height_inches // 12}'{height_inches % 12}\""


def status_payload(reference_pose_count):
    return {
        "height_inches": current_height_inches,
        "height": format_height(current_height_inches),
        "reference_pose_count": reference_pose_count,
        "angle_tolerance": adjusted_angle_tolerance(current_height_inches),
        "stream": "/video_feed",
        "height_endpoint": "/height?value=5ft10",
    }


def encode_frame(frame):
    success, buffer = cv2.imencode(
        ".jpg",
        frame,
        [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY],
    )
    if not success:
        return None

    return buffer.tobytes()


def open_camera():
    indexes = [CAMERA_INDEX]
    for index in (0, 1, 2):
        if index not in indexes:
            indexes.append(index)

    for index in indexes:
        camera = cv2.VideoCapture(index)
        if camera.isOpened():
            print(f"Using webcam index {index}")
            return camera
        camera.release()

    raise RuntimeError(
        f"Could not open webcam. Tried camera indexes: {', '.join(str(index) for index in indexes)}."
    )


def message_frame(lines):
    frame = np.zeros((480, 854, 3), dtype=np.uint8)
    frame[:] = (15, 23, 42)
    y = 72

    for index, line in enumerate(lines):
        color = ERROR_COLOR if index == 0 else TEXT_COLOR
        cv2.putText(
            frame,
            line,
            (32, y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.72,
            color,
            2,
            cv2.LINE_AA,
        )
        y += 42

    return frame


def error_frame(error):
    frame = message_frame(
        [
            "Pose stream error",
            str(error),
            "Check the terminal, webcam permissions, and camera index.",
        ]
    )
    return encode_frame(frame)


def annotated_frames():
    reference_poses = load_reference_poses()
    camera = open_camera()

    start_time = time.monotonic()

    try:
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

                status_lines = []
                if DEBUG_MODE:
                    status_lines = [
                        (f"Reference poses: {len(reference_poses)}", TEXT_COLOR),
                        (
                            f"Height: {format_height(current_height_inches)}  Angle tolerance: {adjusted_angle_tolerance(current_height_inches):.1f} deg",
                            TEXT_COLOR,
                        ),
                        ("Set height: /height?value=5ft10", TEXT_COLOR),
                    ]

                if detection_result.pose_landmarks:
                    pose_landmarks = detection_result.pose_landmarks[0]
                    draw_pose_landmarks(frame, pose_landmarks)
                    normalized_pose = normalize_landmarks(pose_landmarks)

                    if normalized_pose is None:
                        if DEBUG_MODE:
                            status_lines.append(("Pose not stable enough to match.", ERROR_COLOR))
                    elif reference_poses:
                        best_pose, best_distance, best_angle_distance = find_best_match(
                            normalized_pose,
                            reference_poses,
                            current_height_inches,
                        )

                        if best_pose and DEBUG_MODE:
                            status_lines.append(
                                (
                                    f"Match: {best_pose['name']} ({best_distance:.3f}, {best_angle_distance:.1f} deg)",
                                    MATCH_COLOR,
                                )
                            )
                        elif DEBUG_MODE:
                            closest_pose, closest_distance, closest_angle_distance = (
                                find_closest_pose(normalized_pose, reference_poses)
                            )
                            status_lines.append(
                                (
                                    f"Closest: {closest_pose['name']} ({closest_distance:.3f}, {closest_angle_distance:.1f} deg)",
                                    TEXT_COLOR,
                                )
                            )
                    elif DEBUG_MODE:
                        status_lines.append(("No reference poses available to match.", ERROR_COLOR))
                elif DEBUG_MODE:
                    status_lines.append(("No body detected.", ERROR_COLOR))

                if DEBUG_MODE:
                    draw_status(frame, status_lines)
                jpg = encode_frame(frame)
                if jpg is not None:
                    yield jpg
    finally:
        camera.release()


class PoseStreamHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()

    def do_GET(self):
        parsed_url = urlparse(self.path)

        if parsed_url.path == "/":
            self.write_json(
                {
                    "message": "Pose stream is running.",
                    "video_feed": "/video_feed",
                    "status": "/status",
                    "height": "/height?value=5ft10",
                }
            )
            return

        if parsed_url.path == "/status":
            self.write_json(status_payload(len(load_reference_poses())))
            return

        if parsed_url.path == "/height":
            self.handle_height(parsed_url.query)
            return

        if parsed_url.path == "/video_feed":
            self.handle_video_feed()
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Unknown endpoint.")

    def handle_height(self, query):
        global current_height_inches

        params = parse_qs(query)
        value = params.get("value", [""])[0]

        if not value:
            self.write_json(status_payload(len(load_reference_poses())))
            return

        try:
            height_inches = parse_height_inches(value)
        except ValueError:
            self.send_error(HTTPStatus.BAD_REQUEST, "Could not read height value.")
            return

        if height_inches < 36 or height_inches > 96:
            self.send_error(HTTPStatus.BAD_REQUEST, "Height must be between 3 ft and 8 ft.")
            return

        current_height_inches = height_inches
        self.write_json(status_payload(len(load_reference_poses())))

    def handle_video_feed(self):
        self.send_response(HTTPStatus.OK)
        self.send_header("Age", "0")
        self.send_header("Cache-Control", "no-cache, private")
        self.send_header("Pragma", "no-cache")
        self.send_header(
            "Content-Type",
            f"multipart/x-mixed-replace; boundary={STREAM_BOUNDARY}",
        )
        self.end_headers()

        try:
            for jpg in annotated_frames():
                self.write_stream_frame(jpg)
        except (BrokenPipeError, ConnectionResetError):
            return
        except Exception as error:
            print(f"Video stream error: {error}")
            jpg = error_frame(error)
            if jpg is not None:
                try:
                    self.write_stream_frame(jpg)
                except (BrokenPipeError, ConnectionResetError):
                    return

    def write_stream_frame(self, jpg):
        self.wfile.write(f"--{STREAM_BOUNDARY}\r\n".encode("ascii"))
        self.wfile.write(b"Content-Type: image/jpeg\r\n")
        self.wfile.write(f"Content-Length: {len(jpg)}\r\n\r\n".encode("ascii"))
        self.wfile.write(jpg)
        self.wfile.write(b"\r\n")

    def write_json(self, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        print(f"{self.address_string()} - {format % args}")


def main():
    if not POSES_PATH.exists():
        print(f"No reference poses file found at {POSES_PATH}. Stream will run without matches.")

    server = ThreadingHTTPServer((HOST, PORT), PoseStreamHandler)
    print(f"Pose stream server running at http://{HOST}:{PORT}")
    print(f"Use http://{HOST}:{PORT}/video_feed as an img src in JavaScript.")
    print(f"Change height with http://{HOST}:{PORT}/height?value=5ft10")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Stopping pose stream server.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
