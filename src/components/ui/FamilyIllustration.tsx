// An original picture drawn in code: three generations together at home, with a Khairiyat
// call arriving. Sharp on every screen, and never a photo of a real person.
export default function FamilyIllustration({ className = "h-auto w-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 560 440" className={className} aria-hidden>
      {/* backdrop */}
      <ellipse cx="280" cy="232" rx="272" ry="200" fill="#e3ecdf" />
      <circle cx="458" cy="86" r="34" fill="#f4d58d" />
      <path d="M118 190 280 74l162 116v196H118z" fill="#fffaf0" />
      <path d="M96 202 280 68l184 134" fill="none" stroke="#235339" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="252" y="122" width="56" height="44" rx="12" fill="#bdd8c5" />
      <path d="M280 122v44M252 144h56" stroke="#fffaf0" strokeWidth="4" />

      {/* sofa */}
      <rect x="104" y="268" width="352" height="104" rx="34" fill="#a9bfa4" />
      <rect x="86" y="304" width="44" height="86" rx="20" fill="#8fa98a" />
      <rect x="430" y="304" width="44" height="86" rx="20" fill="#8fa98a" />

      {/* grandmother with a dupatta */}
      <path d="M150 252c-6-44 20-76 48-76s54 30 48 78c-4 28-8 46-2 66h-94c8-22 4-42 0-68Z" fill="#6f9f80" />
      <circle cx="198" cy="222" r="30" fill="#d9a77f" />
      <path d="M167 218c2-26 16-37 31-37s30 12 31 37c-10-17-20-23-31-23s-21 7-31 23Z" fill="#e8e6dd" />
      <path d="M142 384c0-70 22-108 56-108s56 38 56 108Z" fill="#2d6746" />
      <path d="M186 226q4 4 8 0M204 226q4 4 8 0M189 238q9 8 18 0" stroke="#4a2f22" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* grandfather with cap, glasses and beard */}
      <circle cx="362" cy="218" r="31" fill="#cf9a72" />
      <path d="M332 207c0-24 14-35 30-35s30 11 30 35c-18-8-42-8-60 0Z" fill="#fffaf0" stroke="#cbcab6" strokeWidth="2" />
      <path d="M338 230c4 30 14 40 24 40s20-10 24-40c-10 12-38 12-48 0Z" fill="#e8e6dd" />
      <circle cx="350" cy="219" r="9" fill="none" stroke="#3c4237" strokeWidth="3" />
      <circle cx="375" cy="219" r="9" fill="none" stroke="#3c4237" strokeWidth="3" />
      <path d="M359 219h7M354 242q8 6 16 0" stroke="#3c4237" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M304 384c0-72 24-122 58-122s58 50 58 122Z" fill="#e7dcc0" />
      <path d="M362 270v70" stroke="#b9a981" strokeWidth="4" strokeLinecap="round" />

      {/* daughter */}
      <path d="M252 282c-4-36 10-62 30-62s36 24 32 62c-2 14 2 26 6 34h-72c4-10 6-20 4-34Z" fill="#3c4237" />
      <circle cx="283" cy="258" r="24" fill="#e2b38c" />
      <path d="M259 254c2-20 12-28 24-28s23 8 24 28c-8-12-15-16-24-16s-17 5-24 16Z" fill="#3c4237" />
      <path d="M238 394c2-66 18-98 45-98s43 32 45 98Z" fill="#c9784f" />
      <path d="M275 262h1M291 262h1" stroke="#3c2418" strokeWidth="5" strokeLinecap="round" />
      <path d="M275 271q8 7 16 0" stroke="#3c2418" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* child */}
      <circle cx="232" cy="328" r="19" fill="#e2b38c" />
      <path d="M213 325c0-17 9-24 19-24s20 7 19 24c-7-9-12-11-19-11s-12 2-19 11Z" fill="#4a2f22" />
      <path d="M204 394c1-32 11-47 28-47s27 15 28 47Z" fill="#e9b949" />
      <path d="M225 331h1M238 331h1" stroke="#3c2418" strokeWidth="4" strokeLinecap="round" />
      <path d="M226 338q6 5 12 0" stroke="#3c2418" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* the daily call */}
      <rect x="438" y="196" width="74" height="126" rx="16" fill="#1c422e" />
      <rect x="446" y="208" width="58" height="96" rx="8" fill="#f0f6f1" />
      <circle cx="475" cy="246" r="20" fill="#2d6746" />
      <path d="M468 239h5l3 7-4 2a18 18 0 0 0 7 7l2-4 7 3v5c0 2-2 3-4 3-9-1-18-10-19-19 0-2 1-4 3-4Z" fill="#fffaf0" />
      <text x="475" y="290" textAnchor="middle" fontSize="16" fill="#1c422e" fontFamily="var(--font-nastaliq), serif">خیریت</text>
      <path d="M520 222q16 18 0 38M532 210q30 32 0 62" stroke="#5d9a73" strokeWidth="5" fill="none" strokeLinecap="round" />

      {/* hearts, plant and floor */}
      <path d="M122 120c-12-14-33-2-25 14 6 11 25 22 25 22s19-11 25-22c8-16-13-28-25-14Z" fill="#c9784f" />
      <path d="M322 196c-6-8-18-1-14 7 3 6 14 12 14 12s11-6 14-12c4-8-8-15-14-7Z" fill="#c9784f" />
      <path d="M60 394c-4-44 12-74 42-86 8 40-8 70-42 86Z" fill="#3d7d57" />
      <path d="M62 394c-30-12-42-38-36-70 26 12 40 36 36 70Z" fill="#8fbc9d" />
      <path d="M34 396h492" stroke="#8fa98a" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}
