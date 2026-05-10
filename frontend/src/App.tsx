import { useEffect, useRef, useState } from "react";
import "./App.css";
import TimeBar from "./components/TimeBar";

function App() {
  const [progress, setProgress] = useState(0);
  const [enabled, setEnabled] = useState(true);
  const [speed, setSpeed] = useState(0.333);
  // TODO set progress with socket

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8001");

    socket.onmessage = (ev) => {
      // console.log(ev);
    }

    return () => {socket.close()};
  }, []);

	const loopId = useRef(0);
	const previousTime = useRef(0);
  const previousPhase = useRef<number | null>(null);

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

    const startTime = Date.now();
    const loop = () => {
      const elapsed = (previousTime.current + (Date.now() - startTime) * speed) / 1000;
      const num = elapsed - Math.floor(elapsed);
      let effectiveNum = num;

      const prev = previousPhase.current;
      const crossedTargets =
        prev === null
          ? []
          : [0, 0.5, 1].filter((target) => crossedPhaseTarget(prev, num, target));
      const shouldPause = crossedTargets.length > 0;

      if (shouldPause) {
        effectiveNum = crossedTargets.reduce((best, target) =>
          circularDistance(num, target) < circularDistance(num, best) ? target : best
        );
      }

      const x = (-4 * effectiveNum) * (effectiveNum - 1);
      previousPhase.current = effectiveNum === 1 ? 0 : effectiveNum;
      setProgress(x);

      if (shouldPause) {
        setEnabled(false);
        return;
      }

      loopId.current = requestAnimationFrame(loop);
    }

    loopId.current = requestAnimationFrame(loop);
    
    return () => {
      cancelAnimationFrame(loopId.current);
      previousTime.current += (Date.now() - startTime) * speed;
    };
	}, [enabled, speed]);

  return (
    <div className="bg-gray-700 h-screen" onMouseDown={(e) => setEnabled((o) => !o)}>
      <img
        src={"http://localhost:8000/video_feed"}
        className="mx-auto h-full"
      />
      <TimeBar progress={progress} />
    </div>
  );
}

export default App;
