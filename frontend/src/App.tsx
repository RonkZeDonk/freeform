import { useEffect, useState } from "react";
import "./App.css";
import TimeBar from "./components/TimeBar";

function App() {
  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8001");

    socket.onmessage = (ev) => {
      console.log(ev);
    }

    return () => {socket.close()};
  }, []);

  const [progress, setProgress] = useState(0);
  // TODO set progress with socket

  return (
    <div className="bg-gray-700 h-screen">
      <img
        src={"http://localhost:8000/video_feed"}
        className="mx-auto h-full"
      />
      <TimeBar progress={progress} />
    </div>
  );
}

export default App;
