import { useEffect, useRef, useState } from "react";
import "./App.css";
import TimeBar from "./components/TimeBar";

type Accuracy = "hit" | "almost" | "bad" | "miss";

const ACCURACY_THRESHOLDS: { accuracy: Accuracy; maxOffsetMs: number }[] = [
  { accuracy: "hit", maxOffsetMs: 100 },
  { accuracy: "almost", maxOffsetMs: 150 },
  { accuracy: "bad", maxOffsetMs: 200 },
];

const ACCURACY_LABELS: Record<Accuracy, string> = {
  hit: "Hit",
  almost: "Almost",
  bad: "Bad",
  miss: "Miss",
};

const EXPECTED_POSE_SEQUENCE = ["down", "curl_up"];

const formatPoseName = (poseName: string) =>
  poseName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

type ClickTiming = {
  offsetMs: number;
  kind: "min" | "max";
  clickedAt: number;
  accuracy: Accuracy;
};

type PoseMatchMessage = {
  type: "pose_match";
  match: string | null;
  matched: boolean;
  distance: number | null;
  angle_distance: number | null;
  height_inches: number | null;
  height: string | null;
  updated_at: number;
};

function App() {
  const [progress, setProgress] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [speed] = useState(0.333);
  const [pulseKey, setPulseKey] = useState<number | null>(null);
  const [pulseAccuracy, setPulseAccuracy] = useState<Accuracy>("hit");
  const [pulsePending, setPulsePending] = useState(false);
  const [clickTimings, setClickTimings] = useState<ClickTiming[]>([]);
  const [matchedPoseName, setMatchedPoseName] = useState<string | null>(null);
  const [expectedPoseIndex, setExpectedPoseIndex] = useState(0);

  const loopId = useRef(0);
  const previousTime = useRef(0);
  const activeStartTime = useRef(Date.now());
  const previousPhase = useRef<number | null>(null);
  const lastTargetHit = useRef<{ time: number; phase: number } | null>(null);
  const enabledRef = useRef(enabled);
  const gameStartedRef = useRef(gameStarted);
  const expectedPoseIndexRef = useRef(expectedPoseIndex);

  const crossedPhaseTarget = (prev: number, next: number, target: number) => {
    if (prev <= next) {
      return prev <= target && target <= next;
    }

    // Wrapped around from ~1 back to ~0.
    return target >= prev || target <= next;
  };

  const circularDistance = (a: number, b: number) => {
    const diff = Math.abs(a - b);
    return Math.min(diff, 1 - diff);
  };

  const targetKind = (phase: number): ClickTiming["kind"] =>
    phase === 0.5 ? "min" : "max";

  const getAccuracy = (offsetMs: number) => {
    const absoluteOffset = Math.abs(offsetMs);
    return (
      ACCURACY_THRESHOLDS.find(
        ({ maxOffsetMs }) => absoluteOffset < maxOffsetMs,
      )?.accuracy ?? "miss"
    );
  };

  const getUpcomingTarget = (phase: number) => {
    if (phase < 0.5) {
      return 0.5;
    }

    return 1;
  };

  const scoreClick = () => {
    const now = Date.now();
    let offsetMs = 0;
    let targetPhase = 0;

    if (!enabledRef.current && lastTargetHit.current) {
      offsetMs = now - lastTargetHit.current.time;
      targetPhase = lastTargetHit.current.phase;
    } else {
      const elapsed =
        (previousTime.current + (now - activeStartTime.current) * speed) / 1000;
      const phase = elapsed - Math.floor(elapsed);
      targetPhase = getUpcomingTarget(phase);
      const phasesUntilTarget = targetPhase - phase;
      offsetMs = -(phasesUntilTarget * 1000) / speed;
    }

    const timing = {
      offsetMs: Math.round(offsetMs),
      kind: targetKind(targetPhase === 1 ? 0 : targetPhase),
      clickedAt: now,
      accuracy: getAccuracy(offsetMs),
    };

    setClickTimings((timings) => [timing, ...timings].slice(0, 10));
    console.log(
      `${timing.accuracy}: click was ${Math.abs(timing.offsetMs)}ms ${timing.offsetMs < 0 ? "early" : "late"} for ${timing.kind} distance`,
    );

    return {
      ...timing,
      targetPhase,
    };
  };

  const skipToPhase = (targetPhase: number) => {
    const now = Date.now();
    const elapsed =
      (previousTime.current + (now - activeStartTime.current) * speed) / 1000;
    const skippedElapsed = Math.floor(elapsed) + targetPhase;
    const phase = targetPhase === 1 ? 0 : targetPhase;

    previousTime.current = skippedElapsed * 1000;
    activeStartTime.current = now;
    // The skip lands exactly on a target, so ignore crossing detection on the
    // next animation frame instead of immediately auto-pausing there.
    previousPhase.current = null;
    setProgress(-4 * phase * (phase - 1));
  };

  const playPulse = (accuracy: Accuracy) => {
    setPulseAccuracy(accuracy);
    setPulseKey(Date.now());
    setTimeout(() => setPulseKey(null), 700);
  };

  const triggerAccuracy = () => {
    if (!gameStartedRef.current) {
      return;
    }

    const timing = scoreClick();

    if (enabledRef.current && timing.offsetMs < 0) {
      skipToPhase(timing.targetPhase);
      playPulse(timing.accuracy);
      setEnabled(true);
      enabledRef.current = true;
      return;
    }

    setEnabled((isEnabled) => {
      enabledRef.current = !isEnabled;
      return !isEnabled;
    });
  };

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    gameStartedRef.current = gameStarted;
  }, [gameStarted]);

  useEffect(() => {
    expectedPoseIndexRef.current = expectedPoseIndex;
  }, [expectedPoseIndex]);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8001");

    socket.onmessage = (ev) => {
      try {
        const message = JSON.parse(ev.data) as Partial<PoseMatchMessage>;

        if (message.type !== "pose_match") {
          return;
        }

        const poseName =
          message.matched === true && typeof message.match === "string"
            ? message.match
            : null;

        setMatchedPoseName(poseName);

        if (!poseName) {
          return;
        }

        const expectedPose =
          EXPECTED_POSE_SEQUENCE[
            expectedPoseIndexRef.current % EXPECTED_POSE_SEQUENCE.length
          ];

        if (poseName !== expectedPose) {
          return;
        }

        triggerAccuracy();
        setExpectedPoseIndex((index) => {
          const nextIndex = index + 1;
          expectedPoseIndexRef.current = nextIndex;
          return nextIndex;
        });
      } catch (error) {
        console.warn("Unable to parse pose websocket message", error);
      }
    };

    return () => {
      socket.close();
    };
  }, []);

  const startCountdown = () => {
    if (countdown !== null || gameStarted) {
      return;
    }

    setCountdown(5);
    setClickTimings([]);
    setExpectedPoseIndex(0);
    expectedPoseIndexRef.current = 0;

    const countdownId = window.setInterval(() => {
      setCountdown((currentCountdown) => {
        if (currentCountdown === null) {
          window.clearInterval(countdownId);
          return null;
        }

        if (currentCountdown <= 1) {
          window.clearInterval(countdownId);
          previousTime.current = 0;
          activeStartTime.current = Date.now();
          previousPhase.current = null;
          lastTargetHit.current = null;
          setProgress(0);
          setGameStarted(true);
          gameStartedRef.current = true;
          setEnabled(true);
          enabledRef.current = true;
          return null;
        }

        return currentCountdown - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (enabled) {
      // Ignore crossing checks on the first frame after resuming.
      previousPhase.current = null;
    }
  }, [enabled]);
  // useEffect(() => {
  //   const loop = (time: number) => {
  //     const now = new Date(Date.now() / 5).getMilliseconds() / 1000;
  //     const num = now - Math.floor(now);

  //     const x = (-4*num)*(num-1);

  //     if (enabled) setProgress(x);

  //     previousTime.current = time;
  //     loopId.current = requestAnimationFrame(loop);
  //   }
  // 	loopId.current = requestAnimationFrame(loop);
  // 	return () => cancelAnimationFrame(loopId.current);
  // }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    activeStartTime.current = Date.now();
    const loop = () => {
      const now = Date.now();
      const elapsed =
        (previousTime.current + (now - activeStartTime.current) * speed) / 1000;
      const num = elapsed - Math.floor(elapsed);
      let effectiveNum = num;

      const prev = previousPhase.current;
      const crossedTargets =
        prev === null
          ? []
          : [0, 0.5, 1].filter((target) =>
              crossedPhaseTarget(prev, num, target),
            );
      const shouldPause = crossedTargets.length > 0;

      if (shouldPause) {
        effectiveNum = crossedTargets.reduce((best, target) =>
          circularDistance(num, target) < circularDistance(num, best)
            ? target
            : best,
        );
        lastTargetHit.current = {
          time: now,
          phase: effectiveNum === 1 ? 0 : effectiveNum,
        };
      }

      const x = -4 * effectiveNum * (effectiveNum - 1);
      previousPhase.current = effectiveNum === 1 ? 0 : effectiveNum;
      setProgress(x);

      if (shouldPause) {
        // mark pulse to play when user re-enables
        setPulsePending(true);
        setEnabled(false);
        return;
      }

      loopId.current = requestAnimationFrame(loop);
    };

    loopId.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(loopId.current);
      previousTime.current += (Date.now() - activeStartTime.current) * speed;
    };
  }, [enabled, speed]);

  useEffect(() => {
    if (enabled && pulsePending) {
      playPulse(clickTimings[0]?.accuracy ?? "hit");
      setPulsePending(false);
    }
  }, [enabled, pulsePending, clickTimings]);

  const latestTiming = clickTimings[0];
  const expectedPoseName =
    EXPECTED_POSE_SEQUENCE[expectedPoseIndex % EXPECTED_POSE_SEQUENCE.length];
  const formattedExpectedPoseName = formatPoseName(expectedPoseName);

  return (
    <div
      className="bg-gray-700 h-screen"
      onMouseDown={() => {
        triggerAccuracy();
      }}
    >
      <img
        src={"http://localhost:8000/video_feed"}
        className="mx-auto h-full"
      />
      {latestTiming && (
        <div className="absolute left-4 top-4 rounded bg-black/70 px-4 py-3 text-white">
          <div className="text-sm uppercase tracking-wide text-white/70">
            {latestTiming.kind} distance
          </div>
          <div className="text-2xl font-bold">
            {Math.abs(latestTiming.offsetMs)}ms{" "}
            {latestTiming.offsetMs < 0 ? "early" : "late"}
          </div>
          <div className="mt-2 border-t border-white/15 pt-2 text-base font-semibold text-white/85">
            {matchedPoseName ? `Pose: ${matchedPoseName}` : "No pose match"}
          </div>
          <div className="mt-1 text-sm font-semibold text-white/60">
            Expecting: {formattedExpectedPoseName}
          </div>
        </div>
      )}
      {latestTiming && (
        <div
          key={latestTiming.clickedAt}
          className={`accuracy-card accuracy-${latestTiming.accuracy}`}
        >
          <div className="accuracy-card__label">
            {ACCURACY_LABELS[latestTiming.accuracy]}
          </div>
        </div>
      )}
      {pulseKey && (
        <div
          className={`edge-pulse-container pulse-${pulseAccuracy}`}
          key={pulseKey}
        >
          <div className="edge top" />
          <div className="edge right" />
          <div className="edge bottom" />
          <div className="edge left" />
        </div>
      )}
      {!gameStarted && (
        <div className="start-overlay">
          {countdown === null ? (
            <button
              className="start-button"
              onMouseDown={(event) => {
                event.stopPropagation();
                startCountdown();
              }}
              type="button"
            >
              Start
            </button>
          ) : (
            <div className="countdown-card">
              <div className="countdown-label">Starting in</div>
              <div className="countdown-number">{countdown}</div>
            </div>
          )}
        </div>
      )}
      <div className="expected-pose-banner">
        {formattedExpectedPoseName}
      </div>
      <TimeBar progress={progress} />
    </div>
  );
}

export default App;
