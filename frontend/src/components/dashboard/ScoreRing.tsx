// Circular 0–100 gauge for the patient hero. The number is also spoken via the label.
export function ScoreRing({ value, label, size = 128 }: { value: number | null; label: string; size?: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const v = value === null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${value === null ? '—' : Math.round(v)} / 100`}>
      <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden>
        <defs>
          <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7be3c6" />
            <stop offset="100%" stopColor="#19c29a" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgb(255 255 255 / 0.14)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="url(#ring)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(v / 100) * c} ${c}`}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
        <span className="text-3xl font-bold tabular-nums leading-none">{value === null ? '—' : Math.round(v)}</span>
        <span className="mt-1 text-[0.6875rem] uppercase tracking-wider text-white/75">/ 100</span>
      </div>
    </div>
  );
}
