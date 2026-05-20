// OuterRim.jsx (Awake)
export default function OuterRim({ size = 520 }) {
  const cx = size / 2;
  const cy = size / 2;
  const layers = [
    { radius: 200, strokeWidth: 2, dashArray: "100 20", color: "rgba(251,146,60,0.9)", duration: "3s", delay: "0s" },
    { radius: 195, strokeWidth: 1.5, dashArray: "80 30", color: "rgba(249,115,22,0.7)", duration: "4s", delay: "0.5s" },
    { radius: 190, strokeWidth: 1.2, dashArray: "120 25", color: "rgba(234,88,12,0.6)", duration: "3.5s", delay: "1s" },
  ];

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {layers.map((layer, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={layer.radius}
            fill="none"
            stroke={layer.color}
            strokeWidth={layer.strokeWidth}
            strokeDasharray={layer.dashArray}
            strokeLinecap="round"
            style={{
              animation: `spin ${layer.duration} linear infinite, pulse ${layer.duration} ease-in-out infinite`,
              animationDelay: layer.delay,
              transformOrigin: `${cx}px ${cy}px`,
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