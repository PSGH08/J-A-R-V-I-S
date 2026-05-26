// DOR.jsx (Sleep state - blue themed animated decorative rings)
export default function DOR({ size = 520 }) {
  const cx = size / 2;
  const cy = size / 2;
  
  // Concentric ring layers with their visual properties
  const layers = [
    { radius: 130, strokeWidth: 0.8, dashArray: "60 25", color: "rgba(56,189,248,0.25)", duration: "3s", delay: "0s" },
    { radius: 125, strokeWidth: 0.6, dashArray: "80 20", color: "rgba(14,165,233,0.2)", duration: "4s", delay: "0.7s" },
    { radius: 120, strokeWidth: 1, dashArray: "50 30", color: "rgba(2,132,199,0.18)", duration: "3.5s", delay: "1.4s" },
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
                0%, 100% { opacity: 0.5; }
                50% { opacity: 1; }
              }
            `}
          </style>
        </defs>
      </svg>
    </div>
  );
}