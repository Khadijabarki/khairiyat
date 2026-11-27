// An original, hand-drawn picture of family care: two generations under one roof.
// Drawn in code, so it is sharp on every screen and never a photo of a real person.
export default function FamilyIllustration({ className = "w-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 260" className={className} aria-hidden>
      <circle cx="160" cy="130" r="122" fill="#e3ecdf" />
      <circle cx="248" cy="62" r="22" fill="#f4d58d" />
      {/* the home */}
      <path d="M70 122 160 56l90 66v96H70z" fill="#fffdf7" />
      <path d="M56 128 160 50l104 78" fill="none" stroke="#235339" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="196" y="140" width="34" height="34" rx="8" fill="#bdd8c5" />
      {/* an elder, with a shawl */}
      <circle cx="122" cy="138" r="21" fill="#d9a77f" />
      <path d="M99 140c-2-22 12-35 25-35s27 12 23 37c-6-15-14-22-25-22s-18 7-23 20Z" fill="#8fbc9d" />
      <path d="M86 218c2-36 16-55 37-55s35 19 37 55Z" fill="#2d6746" />
      {/* a younger relative */}
      <circle cx="188" cy="162" r="17" fill="#e2b38c" />
      <path d="M170 160c0-16 9-24 19-24 12 0 20 9 18 24-6-9-12-12-19-12s-13 3-18 12Z" fill="#3c4237" />
      <path d="M158 218c2-26 13-39 30-39s29 13 31 39Z" fill="#c9784f" />
      {/* a heart between them */}
      <path d="M160 108c-9-10-24-2-18 10 4 8 18 17 18 17s14-9 18-17c6-12-9-20-18-10Z" fill="#c9784f" />
      {/* leaves */}
      <path d="M44 218c-2-26 8-42 26-48 4 22-5 40-26 48Z" fill="#5d9a73" />
      <path d="M278 218c4-20-4-35-20-42-5 18 1 33 20 42Z" fill="#8fbc9d" />
      <path d="M32 220h256" stroke="#a9bfa4" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}
