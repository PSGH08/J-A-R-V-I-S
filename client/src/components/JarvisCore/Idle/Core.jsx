// Core.jsx (Idle) - Blue version
import { motion } from "framer-motion";

export default function Core() {
  return (
    <motion.div
      animate={{
        scale: [1, 1.03, 1],
      }}
      transition={{
        scale: {
          duration: 4,
          repeat: Infinity,
        },
      }}
      className="relative flex h-[200px] w-[200px] items-center justify-center rounded-full overflow-visible"
    >
      {/* breathing outer glow layer 1 */}
      <motion.div
        animate={{
          opacity: [0.15, 0.4, 0.15],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -inset-8 rounded-full bg-sky-500/30 blur-2xl"
      />

      {/* breathing outer glow layer 2 */}
      <motion.div
        animate={{
          opacity: [0.1, 0.3, 0.1],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0,
        }}
        className="absolute -inset-4 rounded-full bg-blue-400/25 blur-xl"
      />

      {/* shell with breathing shadow */}
      <motion.div
        animate={{
          boxShadow: [
            "0 0 40px rgba(14,165,233,0.4)",
            "0 0 80px rgba(14,165,233,0.7)",
            "0 0 40px rgba(14,165,233,0.4)",
          ],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0,
        }}
        className="absolute inset-0 rounded-full border border-white/30"
      />

      {/* Core inner ring with SVG */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg width="190" height="190" viewBox="0 0 190 190">
          <defs>
            <radialGradient id="blueGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(14,165,233,0.3)" />
              <stop offset="50%" stopColor="rgba(56,189,248,0.15)" />
              <stop offset="100%" stopColor="rgba(2,132,199,0.05)" />
            </radialGradient>
          </defs>
          {/* Glow fill */}
          <circle cx="95" cy="95" r="88" fill="url(#blueGlow)" />
          {/* Rotating dashed rings */}
          {[0, 3, 6].map((offset, i) => (
            <circle
              key={i}
              cx="95"
              cy="95"
              r={83 + offset}
              fill="none"
              stroke={`rgba(${14 + i * 20},${165 + i * 20},${233 + i * 10},${0.4 - i * 0.1})`}
              strokeWidth={2 - i * 0.4}
              strokeDasharray={`${60 + i * 20} ${30 - i * 5}`}
              strokeLinecap="round"
              style={{
                animation: `spin ${4 + i}s linear infinite`,
                transformOrigin: "95px 95px",
              }}
            />
          ))}
          {/* Inner bright ring */}
          <circle
            cx="95"
            cy="95"
            r="72"
            fill="none"
            stroke="rgba(56,189,248,0.5)"
            strokeWidth="1.5"
            className="animate-pulse"
          />
          <style>
            {`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}
          </style>
        </svg>
      </div>

      <h1 className="z-10 text-white text-center" style={{ 
        fontWeight: 900, 
        fontSize: '15px',
        letterSpacing: '0.25em',
        lineHeight: 1,
        transform: 'scaleY(2.4)',
        textIndent: '0.25em',
        paddingLeft: '0.15em',
      }}>
        J.A.R.V.I.S
      </h1>
    </motion.div>
  );
}