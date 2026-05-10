import { useState } from "react";
import "./App.css";
import TimeBar from "./components/TimeBar";
import sampleVideo from "./sample-5s.mp4";

function App() {
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
