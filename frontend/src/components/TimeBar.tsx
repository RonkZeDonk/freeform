// circle in the centre of the div and two circles at equal distance move to the centre on input 0-1
const EDGE_PADDING_PX = 8;

function TimeBar({ progress }: { progress: number }) {
  const leftOrbPosition = `calc(${EDGE_PADDING_PX}px + ${progress * 50}% - ${progress * (EDGE_PADDING_PX + 32)}px)`;
  const rightOrbPosition = `calc(100% - ${64 + EDGE_PADDING_PX}px - ${progress * 50}% + ${progress * (EDGE_PADDING_PX + 32)}px)`;

  return (
    <div className="timebar-shell">
      <div className="timebar-track">
        <div className="timebar-rail" />
        <div className="timebar-target timebar-target--center" />
        <div className="timebar-target timebar-target--left" />
        <div className="timebar-target timebar-target--right" />

        <div className="timebar-orb" style={{ left: leftOrbPosition }} />
        <div className="timebar-orb" style={{ left: rightOrbPosition }} />
      </div>
    </div>
  )
};

export default TimeBar;
