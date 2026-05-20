// OuterRim.jsx (Idle)
export default function OuterRim({ size = 520 }) {
  const cx = size / 2;
  const cy = size / 2;
  const layers = [
    { offset: 0, strokeWidth: 3, dashArray: "100 20", color: "rgba(14,165,233,0.35)", duration: "3s", delay: "0s", rotate: 0 },
    { offset: 4, strokeWidth: 2, dashArray: "80 30", color: "rgba(2,132,199,0.3)", duration: "4s", delay: "0.5s", rotate: 30 },
    { offset: 8, strokeWidth: 1.5, dashArray: "120 25", color: "rgba(56,189,248,0.4)", duration: "3.5s", delay: "1s", rotate: -15 },
    { offset: 12, strokeWidth: 1, dashArray: "60 40", color: "rgba(3,105,161,0.25)", duration: "5s", delay: "1.5s", rotate: 45 },
    { offset: 16, strokeWidth: 2.5, dashArray: "90 35", color: "rgba(14,165,233,0.28)", duration: "4.5s", delay: "0.3s", rotate: -30 },
    { offset: 20, strokeWidth: 0.8, dashArray: "140 15", color: "rgba(125,211,252,0.45)", duration: "3s", delay: "1.2s", rotate: 15 },
    { offset: 24, strokeWidth: 4, dashArray: "70 50", color: "rgba(2,132,199,0.2)", duration: "6s", delay: "0.8s", rotate: 60 },
  ];

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {layers.map((layer, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={160 - layer.offset}
            fill="none"
            stroke={layer.color}
            strokeWidth={layer.strokeWidth}
            strokeDasharray={layer.dashArray}
            strokeLinecap="round"
            style={{
              animation: `spin ${layer.duration} linear infinite, pulse ${layer.duration} ease-in-out infinite`,
              animationDelay: layer.delay,
              transformOrigin: `${cx}px ${cy}px`,
              transform: `rotate(${layer.rotate}deg)`,
            }}
          />
        ))}
        <defs>
          <style>
            {`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              @keyframes pulse {
                0%, 100% { opacity: 0.6; }
                50% { opacity: 1; }
              }
            `}
          </style>
        </defs>
      </svg>
    </div>
  );
}