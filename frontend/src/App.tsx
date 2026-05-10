import { useState } from 'react';
import './App.css'
import TimeBar from './components/TimeBar';

function App() {
  const [progress, setProgress] = useState(0);

  return (
    <div className='bg-gray-700 h-screen'> {/* replace this with a live video stream */}
      <input type='range' min='0' max='1' step='0.01' value={progress} onChange={(e) => setProgress(parseFloat(e.target.value))} className='w-full' />
      <TimeBar progress={progress} />
    </div>
  )
}

export default App;
