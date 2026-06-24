interface Props {
  capacity: number;
  refillPerSec: number;
}

export function Explainer({ capacity, refillPerSec }: Props) {
  return (
    <div className="panel explainer">
      <h2>New to rate limiting? Start here</h2>
      <p>
        Rate limiting caps how many requests a server will handle so a flood of traffic can&apos;t
        overwhelm it. Requests over the limit are politely turned away instead of crashing the system.
      </p>
      <div className="analogy">
        <strong>🪣 The bucket analogy</strong>
        <p>
          Picture a bucket that holds <b>{capacity} tokens</b> and refills <b>{refillPerSec} per
          second</b>. Every request spends one token. Send requests slowly and the bucket keeps up —
          send a flood and it empties, so extra requests get rejected with{' '}
          <b>HTTP 429 (&ldquo;Too Many Requests&rdquo;)</b> until it refills.
        </p>
      </div>
      <ul className="terms">
        <li>
          <b>token</b> = permission for one request
        </li>
        <li>
          <b>200</b> = allowed
        </li>
        <li>
          <b>429</b> = rejected (too many)
        </li>
        <li>
          <b>burst</b> = the {capacity} you can spend at once
        </li>
      </ul>
    </div>
  );
}
