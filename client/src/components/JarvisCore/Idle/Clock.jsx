// Clock.jsx (Sleep state - blue theme clock showing hour progress)
export default function Clock() {
  const now = new Date();
  const hours = now.getHours() % 12;
  const minutes = now.getMinutes();
  const totalHours = hours + minutes / 60;

  const radius = 140;
  const circumference = 2 * Math.PI * radius;
  const center = 180;
  
  // Calculate position on circle for the progress dot
  const progressAngle = (totalHours / 12) * 2 * Math.PI - Math.PI / 2;

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="relative h-[300px] w-[340px] rounded-full">
        <svg viewBox="0 0 360 360" className="h-full w-full">
          <defs>
            <linearGradient id="clockGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0369a1" />
              <stop offset="25%" stopColor="#0ea5e9" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="75%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
            <filter id="clockGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer decorative ring */}
          <circle
            cx={center}
            cy={center}
            r="155"
            fill="none"
            stroke="rgba(56,189,248,0.08)"
            strokeWidth="1"
          />
          
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(14,165,233,0.08)"
            strokeWidth="8"
          />
          
          {/* Glow effect behind progress arc */}
          {totalHours > 0 && (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="rgba(56,189,248,0.15)"
              strokeWidth="12"
              strokeDasharray={`${(totalHours / 12) * circumference} ${circumference}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${center} ${center})`}
            />
          )}
          
          {/* Main progress arc showing elapsed hours */}
          {totalHours > 0 && (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="url(#clockGradient)"
              strokeWidth="8"
              strokeDasharray={`${(totalHours / 12) * circumference} ${circumference}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${center} ${center})`}
              filter="url(#clockGlow)"
            />
          )}
          
          {/* Leading progress indicator dot */}
          {totalHours > 0 && (
            <circle
              cx={center + radius * Math.cos(progressAngle)}
              cy={center + radius * Math.sin(progressAngle)}
              r="6"
              fill="#38bdf8"
              filter="url(#clockGlow)"
            />
          )}
          
          {/* Hour markers around the clock face */}
          {[...Array(12)].map((_, i) => {
            const angle = ((i * 30) - 90) * Math.PI / 180;
            const innerRadius = 130;
            const outerRadius = 145;
            const x1 = center + Math.cos(angle) * innerRadius;
            const y1 = center + Math.sin(angle) * innerRadius;
            const x2 = center + Math.cos(angle) * outerRadius;
            const y2 = center + Math.sin(angle) * outerRadius;
            const isFilled = i < totalHours;
            
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isFilled ? "#38bdf8" : "rgba(14,165,233,0.2)"}
                strokeWidth={isFilled ? "2.5" : "1.5"}
                strokeLinecap="round"
                filter={isFilled ? "url(#clockGlow)" : undefined}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}