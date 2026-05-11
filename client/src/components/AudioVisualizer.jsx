import { useState, useEffect, useRef, useCallback } from "react";

export default function AudioVisualizer({ isSpeaking }) {
  const [bars, setBars] = useState([]);
  const animationRef = useRef(null);
  const isActiveRef = useRef(false);
  const isSpeakingRef = useRef(isSpeaking);
  
  // Keep ref in sync with prop
  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);
  
  const BAR_COUNT = 64;
  
  const animate = useCallback(() => {
    if (!isActiveRef.current) return;
    
    const now = Date.now();
    const speaking = isSpeakingRef.current; // Read from ref, not closure
    
    if (speaking) {
      setBars(
        Array.from({ length: BAR_COUNT }, (_, i) => {
          const position = i / BAR_COUNT;
          const lowFreq = Math.sin(now * 0.008 + position * 2) * 0.35 + 0.45;
          const midFreq = Math.sin(now * 0.015 + position * 5) * 0.3 + 0.4;
          const highFreq = Math.sin(now * 0.022 + position * 8) * 0.25 + 0.3;
          
          let baseHeight;
          if (position < 0.25) {
            baseHeight = lowFreq * 0.8 + midFreq * 0.2;
          } else if (position < 0.5) {
            baseHeight = midFreq * 0.7 + highFreq * 0.3;
          } else if (position < 0.75) {
            baseHeight = highFreq * 0.6 + midFreq * 0.4;
          } else {
            baseHeight = highFreq * 0.8 + midFreq * 0.2;
          }
          
          const noise = Math.sin(now * 0.03 + i * 1.7) * 0.25;
          const randomSpike = Math.random() < 0.08 ? Math.random() * 0.5 : 0;
          
          return {
            height: Math.min(1, Math.max(0.04, baseHeight + noise + randomSpike)),
          };
        })
      );
    } else {
      setBars(
        Array.from({ length: BAR_COUNT }, () => ({
          height: 0.03 + Math.random() * 0.02,
        }))
      );
    }
    
    animationRef.current = requestAnimationFrame(animate);
  }, []); // Empty dependency - never recreates the function
  
  useEffect(() => {
    isActiveRef.current = true;
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      isActiveRef.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);
  
  return (
    <div className="flex items-end justify-center h-20 w-full">
      {bars.map((bar, i) => (
        <div
          key={i}
          className="flex-1 mx-px rounded-t-sm"
          style={{
            height: `${bar.height * 100}%`,
            background: isSpeakingRef.current
              ? "linear-gradient(to top, rgba(56,189,248,0.3) 0%, rgba(56,189,248,0.7) 40%, rgba(56,189,248,1) 100%)"
              : "linear-gradient(to top, rgba(56,189,248,0.05), rgba(56,189,248,0.15))",
            boxShadow: isSpeakingRef.current
              ? `0 0 ${Math.max(2, bar.height * 8)}px rgba(56,189,248,0.5)`
              : "none",
            minHeight: "1px",
            maxWidth: "3px",
          }}
        />
      ))}
    </div>
  );
}