import { useEffect, useRef, useState } from "react";
import "./App.css";
import TimeBar from "./components/TimeBar";

function App() {
  const [progress, setProgress] = useState(0);
  const [enabled, setEnabled] = useState(true);
  const [speed, setSpeed] = useState(1);
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
      const x = (-4 * num) * (num - 1);
      setProgress(x);
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
