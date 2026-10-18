export default function SeigaihaPattern({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      preserveAspectRatio="none"
    >
      <defs>
        <pattern
          id="seigaiha"
          x="0"
          y="0"
          width="56"
          height="28"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 28 A28 28 0 0 1 28 0 A28 28 0 0 1 56 28"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
          <path
            d="M-14 28 A28 28 0 0 1 14 0 A28 28 0 0 1 42 28"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
          <path
            d="M14 28 A28 28 0 0 1 42 0 A28 28 0 0 1 70 28"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#seigaiha)" />
    </svg>
  );
}
