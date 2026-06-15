const RULES = [
  "A round closes when 300 unique users join within 24 hours, or when 24 hours pass — whichever comes first.",
  "If fewer than 300 join, the operational wallet supplements the pool to a 300-ticket equivalent. Supplementary tickets are never eligible to win.",
  "Only real participants can win. One wallet cannot win multiple prizes in the same round.",
  "Prize claims are one-time only and cannot be reclaimed.",
  "Results are designed to be on-chain verifiable when live, using VRF-compatible randomness.",
  "1 Ticket = $1 USD equivalent in $BLOBBIE. The token amount is derived from the oracle/configured price, never a fixed 1:1.",
];

export function DrawRules() {
  return (
    <div className="card p-6">
      <h3 className="text-lg font-bold text-white">Rules & Fairness</h3>
      <ul className="mt-4 space-y-3">
        {RULES.map((rule) => (
          <li key={rule} className="flex gap-3 text-sm text-slate-300">
            <span className="mt-0.5 text-neon-cyan">✓</span>
            <span>{rule}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
