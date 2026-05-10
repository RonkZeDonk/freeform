import { useState } from 'react';
import './App.css'
import TimeBar from './components/TimeBar';
import sampleVideo from './sample-5s.mp4';

function App() {
  const [progress, setProgress] = useState(0);
  // TODO set progress with socket

  return (
    <div className='bg-gray-700 h-screen'>
      <video src={sampleVideo} autoPlay loop muted className='w-full h-full absolute' />
      <TimeBar progress={progress} />
    </div>
  )
}

export default App;
