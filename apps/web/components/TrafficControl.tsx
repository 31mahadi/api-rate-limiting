'use client';

interface Props {
  rate: number;
  running: boolean;
  refillPerSec: number;
  onRateChange: (rate: number) => void;
  onToggle: () => void;
  onScenario: (rate: number) => void;
}

export function TrafficControl({
  rate,
  running,
  refillPerSec,
  onRateChange,
  onToggle,
  onScenario,
}: Props) {
  return (
    <div className="panel control">
      <h2>Traffic</h2>
      <p className="caption">Try a scenario — or set your own rate with the slider.</p>

      <div className="scenarios">
        <button className="scenario" onClick={() => onScenario(3)}>
          😌 Calm
          <br />3/s · under limit
        </button>
        <button className="scenario spike" onClick={() => onScenario(40)}>
          🌊 Spike
          <br />40/s · over limit
        </button>
      </div>

      <label htmlFor="rate">Request rate</label>
      <div className="rate">
        {rate}
        <small> req/s</small>
      </div>
      <input
        id="rate"
        type="range"
        min={0}
        max={50}
        value={rate}
        onChange={(e) => onRateChange(Number(e.target.value))}
      />
      <button className={`toggle${running ? ' stop' : ''}`} onClick={onToggle}>
        {running ? 'Stop traffic' : 'Start traffic'}
      </button>
      <p className="hint" style={{ marginTop: 14 }}>
        The server allows <b>{refillPerSec}/s</b>. Below that, everything passes; above it, the bucket
        drains and extra requests turn red.
      </p>
    </div>
  );
}
