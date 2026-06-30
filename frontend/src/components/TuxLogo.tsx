export default function TuxLogo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Body */}
      <ellipse cx="50" cy="58" rx="32" ry="38" fill="#1a1a2e" />
      {/* Belly */}
      <ellipse cx="50" cy="62" rx="22" ry="28" fill="#f5f5f5" />
      {/* Head */}
      <circle cx="50" cy="28" r="20" fill="#1a1a2e" />
      {/* Left eye */}
      <circle cx="43" cy="24" r="4" fill="white" />
      <circle cx="44" cy="23" r="2" fill="#1a1a2e" />
      {/* Right eye */}
      <circle cx="57" cy="24" r="4" fill="white" />
      <circle cx="56" cy="23" r="2" fill="#1a1a2e" />
      {/* Beak */}
      <path d="M46 30 L50 36 L54 30 Z" fill="#E95420" />
      {/* Left wing */}
      <ellipse cx="22" cy="55" rx="10" ry="22" fill="#1a1a2e" transform="rotate(-15 22 55)" />
      {/* Right wing */}
      <ellipse cx="78" cy="55" rx="10" ry="22" fill="#1a1a2e" transform="rotate(15 78 55)" />
      {/* Left foot */}
      <ellipse cx="38" cy="94" rx="10" ry="4" fill="#E95420" />
      {/* Right foot */}
      <ellipse cx="62" cy="94" rx="10" ry="4" fill="#E95420" />
    </svg>
  )
}
