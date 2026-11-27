// A family member's picture. Without an uploaded photo it shows an elegant default:
// their initial on a soft background (never a stock photo of a stranger).

const TONES = {
  female: "from-[#dfe9da] to-[#b9cfb4] text-[#163525]",
  male: "from-[#e4e7d6] to-[#c3caa9] text-[#163525]",
} as const;

const SIZES = {
  md: "size-14 text-2xl",
  lg: "size-20 text-3xl",
  xl: "size-24 text-4xl",
} as const;

type Props = {
  name: string;
  gender: "female" | "male";
  photoUrl?: string | null;
  size?: keyof typeof SIZES;
};

export default function Avatar({ name, gender, photoUrl, size = "md" }: Props) {
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? "?";
  const frame = `${SIZES[size]} shrink-0 rounded-full ring-4 ring-white shadow-soft`;
  if (photoUrl) {
    // A private photo served by our own route; the browser must not re-host or optimise it.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photoUrl} alt={name} className={`${frame} object-cover`} />;
  }
  return (
    <span role="img" aria-label={name} className={`${frame} flex items-center justify-center bg-gradient-to-br font-display font-semibold ${TONES[gender]}`}>
      {initial}
    </span>
  );
}
