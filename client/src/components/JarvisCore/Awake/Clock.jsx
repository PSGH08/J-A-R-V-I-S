// Clock.jsx (Awake state - circular clock showing hour progress)
export default function Clock() {
  const now = new Date();
  const hours = now.getHours() % 12;
  const minutes = now.getMinutes();
  const totalHours = hours + minutes / 60;

  const radius = 120;
  const circumference = 2 * Math.PI * radius;

  // Calculate position on circle for the progress dot
  const progressAngle = (totalHours / 12) * 2 * Math.PI - Math.PI / 2;

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="relative h-[330px] w-[330px] rounded-full">
        <svg viewBox="0 0 330 330" className="h-full w-full">
          <defs>
            <linearGradient id="awakeClockGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="25%" stopColor="#fb923c" />
              <stop offset="50%" stopColor="#fdba74" />
              <stop offset="75%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
            <filter id="awakeClockGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Outer decorative ring */}
          <circle
            cx="165"
            cy="165"
            r="150"
            fill="none"
            stroke="rgba(251,146,60,0.08)"
            strokeWidth="1"
          />
          
          {/* Background track */}
          <circle
            cx="165"
            cy="165"
            r={radius}
            fill="none"
            stroke="rgba(249,115,22,0.08)"
            strokeWidth="8"
          />
          
          {/* Glow effect behind progress arc */}
          {totalHours > 0 && (
            <circle
              cx="165"
              cy="165"
              r={radius}
              fill="none"
              stroke="rgba(251,146,60,0.15)"
              strokeWidth="12"
              strokeDasharray={`${(totalHours / 12) * circumference} ${circumference}`}
              strokeLinecap="round"
              transform="rotate(-90 165 165)"
            />
          )}
          
          {/* Main progress arc showing elapsed hours */}
          {totalHours > 0 && (
            <circle
              cx="165"
              cy="165"
              r={radius}
              fill="none"
              stroke="url(#awakeClockGradient)"
              strokeWidth="8"
              strokeDasharray={`${(totalHours / 12) * circumference} ${circumference}`}
              strokeLinecap="round"
              transform="rotate(-90 165 165)"
              filter="url(#awakeClockGlow)"
            />
          )}
          
          {/* Leading progress indicator dot */}
          {totalHours > 0 && (
            <circle
              cx={165 + radius * Math.cos(progressAngle)}
              cy={165 + radius * Math.sin(progressAngle)}
              r="5"
              fill="#fb923c"
              filter="url(#awakeClockGlow)"
            />
          )}
          
          {/* Hour markers around the clock face */}
          {[...Array(12)].map((_, i) => {
            const angle = ((i * 30) - 90) * Math.PI / 180;
            const innerRadius = 112;
            const outerRadius = 127;
            const x1 = 165 + Math.cos(angle) * innerRadius;
            const y1 = 165 + Math.sin(angle) * innerRadius;
            const x2 = 165 + Math.cos(angle) * outerRadius;
            const y2 = 165 + Math.sin(angle) * outerRadius;
            const isFilled = i < totalHours;
            
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isFilled ? "#fb923c" : "rgba(249,115,22,0.2)"}
                strokeWidth={isFilled ? "2.5" : "1.5"}
                strokeLinecap="round"
                filter={isFilled ? "url(#awakeClockGlow)" : undefined}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}