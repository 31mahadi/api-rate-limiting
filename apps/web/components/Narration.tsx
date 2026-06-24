interface Props {
  running: boolean;
  rate: number;
  refillPerSec: number;
  remaining: number;
}

// Plain-English description of what's happening right now — the main teaching device.
export function Narration({ running, rate, refillPerSec, remaining }: Props) {
  let tone = 'info';
  let text =
    'Pick a scenario below (or press Start) to send requests to the server and watch what happens.';

  if (running && rate <= refillPerSec) {
    tone = 'ok';
    text = `You're sending ~${rate} request${rate === 1 ? '' : 's'}/sec — within the server's limit of ${refillPerSec}/sec, so every request is allowed (200 OK).`;
  } else if (running && remaining >= 1) {
    tone = 'warn';
    text = `You're sending ~${rate}/sec, faster than the ${refillPerSec}/sec limit. The bucket of spare tokens is draining…`;
  } else if (running) {
    tone = 'danger';
    text = `Bucket empty! Requests beyond ${refillPerSec}/sec are now rejected with “429 Too Many Requests” until tokens refill.`;
  }

  return (
    <div className={`narration ${tone}`}>
      <span className="narration-dot" />
      <span>{text}</span>
    </div>
  );
}
