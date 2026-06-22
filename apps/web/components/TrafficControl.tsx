'use client';

interface Props {
  rate: number;
  running: boolean;
  refillPerSec: number;
  onRateChange: (rate: number) => void;
  onToggle: () => void;
}

export function TrafficControl({
  rate,
  running,
  refillPerSec,
  onRateChange,
  onToggle,
}: Props) {
  const overLimit = rate > refillPerSec;

  return (
    <div className="panel control">
      <h2>Traffic</h2>
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
        Sustained limit is <b>{refillPerSec}/s</b>. Push the rate above it and watch the bucket
        drain and requests turn red.{' '}
        {overLimit && running ? '— you are over the limit now.' : ''}
      </p>
    </div>
  );
}
