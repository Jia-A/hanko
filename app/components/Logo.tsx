// The hanko mark: the kanji 印 ("seal") inside an accent square.
// Used in the navbar and as the basis for the favicon.
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      className={className}
      role="img"
      aria-label="hanko"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="28" height="28" rx="1" fill="var(--accent, #c6442b)" />
      <text
        x="14"
        y="15"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="18"
        fontWeight="700"
        fill="#ffffff"
        fontFamily="'Noto Serif JP', serif"
      >
        印
      </text>
    </svg>
  );
}
