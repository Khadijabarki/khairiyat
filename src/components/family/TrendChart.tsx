// A small line chart for one measure over the last 7 days (mood, sleep or pain).
// Three of these sit side by side ("small multiples") instead of one chart with
// two scales, because mood/sleep are 1-5 and pain is 0-10.
//
// Plain SVG, no chart library. Hovering (or tapping) a point shows its exact value.
// Colours were checked with the dataviz palette validator (colourblind-safe).

export type TrendPoint = { label: string; value: number | null };

type Props = {
  title: string; // e.g. "Mood"
  color: string; // series colour (used only for the line and dots, never for text)
  points: TrendPoint[]; // oldest first
  min: number;
  max: number;
  note: string; // what the scale means, e.g. "1 = very low, 5 = very good"
};

const W = 300;
const H = 120;
const PAD = { top: 14, right: 12, bottom: 22, left: 12 };

export default function TrendChart({ title, color, points, min, max, note }: Props) {
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length <= 1 ? innerW / 2 : (i * innerW) / (points.length - 1));
  const y = (v: number) => PAD.top + innerH - ((v - min) / (max - min)) * innerH;

  // Line segments only join days that both have a value (a missing day leaves a gap).
  const segments: string[] = [];
  points.forEach((p, i) => {
    const prev = points[i - 1];
    if (i > 0 && p.value !== null && prev?.value !== null && prev?.value !== undefined) {
      segments.push(`M${x(i - 1)},${y(prev.value)} L${x(i)},${y(p.value)}`);
    }
  });

  const latest = [...points].reverse().find((p) => p.value !== null);

  return (
    <figure className="rounded-2xl border border-stone-200 bg-white p-4">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="font-semibold text-stone-900">{title}</span>
        <span className="text-sm text-stone-600">
          Latest: <span className="font-semibold text-stone-900">{latest ? latest.value : "–"}</span>
        </span>
      </figcaption>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label={`${title}, last 7 days`}>
        {/* Recessive guide lines at the top and bottom of the scale */}
        {[min, max].map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="#e7e5e4" strokeWidth={1} />
            <text x={W - PAD.right} y={y(v) - 3} textAnchor="end" fontSize={9} fill="#78716c">
              {v}
            </text>
          </g>
        ))}

        {segments.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
        ))}

        {points.map((p, i) =>
          p.value === null ? null : (
            <g key={i}>
              {/* White ring keeps the dot readable where it touches the line */}
              <circle cx={x(i)} cy={y(p.value)} r={4.5} fill={color} stroke="#ffffff" strokeWidth={2} />
              {/* Larger invisible target, so the tooltip is easy to hit with a finger */}
              <circle cx={x(i)} cy={y(p.value)} r={12} fill="transparent">
                <title>{`${p.label}: ${title} ${p.value}`}</title>
              </circle>
            </g>
          ),
        )}

        {/* Day labels: first and last only, to keep it uncluttered */}
        {points.length > 0 && (
          <>
            <text x={x(0)} y={H - 6} fontSize={9} fill="#78716c">
              {points[0].label}
            </text>
            <text x={x(points.length - 1)} y={H - 6} fontSize={9} fill="#78716c" textAnchor="end">
              {points[points.length - 1].label}
            </text>
          </>
        )}
      </svg>
      <p className="mt-1 text-xs text-stone-500">{note}</p>
    </figure>
  );
}
