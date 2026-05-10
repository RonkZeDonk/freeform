// circle in the centre of the div and two circles at equal distance move to the centre on input 0-1
function TimeBar({ progress }: { progress: number }) {
  return (
    <div className='absolute bottom-0 h-32 w-full' style={{background: 'linear-gradient(0deg,rgba(34, 193, 195, 1) 0%, rgba(253, 187, 45, 0) 100%)'}}>
      <div className='absolute left-1/2 w-16 h-16 border-5 border-white rounded-full' />
      <div className='absolute w-16 h-16 left-0 rounded-full border-5 border-white' />
      <div className='absolute w-16 h-16 right-0 rounded-full border-5 border-white' />

      <div className='absolute w-16 h-16 bg-white rounded-full' style={{ left: `calc(${progress * 50}%)` }} />
      <div className='absolute w-16 h-16 bg-white rounded-full' style={{ left: `calc(100% - ${progress * 50}% - ${1-progress} * 64px)` }} />
    </div>
  )
};

export default TimeBar;
