export function DigiRiseLogoMark({ size = 40 }: { size?: number }) {
  const h = Math.round(size * 0.85);
  return (
    <svg width={size} height={h} viewBox="0 0 52 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M5 3C2.8 3 1 4.8 1 7V37C1 39.2 2.8 41 5 41C6.3 41 7.5 40.4 8.3 39.4L23 24C24.3 22.5 24.3 21.5 23 20L8.3 4.6C7.5 3.6 6.3 3 5 3Z"
        fill="#00D4FF"
      />
      <path
        d="M19 3C16.8 3 15 4.8 15 7V37C15 39.2 16.8 41 19 41C20.3 41 21.5 40.4 22.3 39.4L37 24C38.3 22.5 38.3 21.5 37 20L22.3 4.6C21.5 3.6 20.3 3 19 3Z"
        fill="#7B3FFF"
      />
      <circle cx="46" cy="7" r="5" fill="#FF4800" />
    </svg>
  );
}

export function DigiRiseWordmark({ height = 24 }: { height?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <DigiRiseLogoMark size={Math.round(height * 1.2)} />
      <span
        style={{
          fontSize: height,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: '#1A1A2E',
          lineHeight: 1,
        }}
      >
        DigiRise
      </span>
    </div>
  );
}
