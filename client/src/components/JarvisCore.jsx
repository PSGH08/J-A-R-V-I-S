import { motion } from "framer-motion";

export default function JarvisCore({ state = "idle", size = "large" }) {
  const sizes = { large: "w-72 h-72", small: "w-20 h-20" };
  const isAwake = state === "awake" || state === "command";
  
  // Color based on state
  const primaryColor = isAwake ? "rgba(249,115,22" : "rgba(59,130,246";
  const secondaryColor = isAwake ? "rgba(251,146,60" : "rgba(96,165,250";
  const tertiaryColor = isAwake ? "rgba(253,186,116" : "rgba(147,197,253";
  
  return (
    <div className={`relative flex items-center justify-center ${sizes[size]}`}>
      {/* Outer glow */}
      <motion.div 
        animate={{ 
          scale: state === "awake" ? [1, 1.2, 1] : [1, 1.05, 1], 
          opacity: state === "awake" ? [0.3, 0.6, 0.3] : [0.1, 0.2, 0.1] 
        }} 
        transition={{ 
          duration: state === "awake" ? 1.5 : 3, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }} 
        className="absolute w-full h-full rounded-full blur-3xl"
        style={{ background: `${primaryColor}, 0.2)` }}
      />
      
      {/* Layer 1 - Outer ring */}
      <motion.div 
        animate={{ rotate: 360 }} 
        transition={{ 
          duration: state === "awake" ? 12 : 25, 
          repeat: Infinity, 
          ease: "linear" 
        }} 
        className="absolute w-[95%] h-[95%] rounded-full" 
        style={{ 
          background: `conic-gradient(from 0deg, transparent 0deg, ${primaryColor}, 0.4) 10deg, transparent 20deg, transparent 40deg, ${primaryColor}, 0.3) 50deg, transparent 60deg, ${primaryColor}, 0.2) 70deg, transparent 80deg, transparent 120deg, ${primaryColor}, 0.4) 130deg, transparent 140deg, transparent 160deg, ${primaryColor}, 0.3) 170deg, transparent 180deg, transparent 200deg, ${primaryColor}, 0.2) 210deg, transparent 220deg, transparent 240deg, ${primaryColor}, 0.3) 250deg, transparent 260deg, transparent 280deg, ${primaryColor}, 0.2) 290deg, transparent 300deg, transparent 320deg, ${primaryColor}, 0.4) 330deg, transparent 340deg, transparent 360deg)`, 
          mask: "radial-gradient(circle, transparent 60%, black 61%, black 75%, transparent 76%)", 
          WebkitMask: "radial-gradient(circle, transparent 60%, black 61%, black 75%, transparent 76%)" 
        }} 
      />
      
      {/* Layer 2 - Middle ring */}
      <motion.div 
        animate={{ rotate: -360 }} 
        transition={{ 
          duration: state === "awake" ? 9 : 18, 
          repeat: Infinity, 
          ease: "linear" 
        }} 
        className="absolute w-[78%] h-[78%] rounded-full" 
        style={{ 
          background: `conic-gradient(from 45deg, transparent 0deg, ${secondaryColor}, 0.5) 15deg, transparent 25deg, transparent 50deg, ${secondaryColor}, 0.3) 60deg, transparent 70deg, transparent 100deg, ${secondaryColor}, 0.4) 110deg, transparent 120deg, transparent 150deg, ${secondaryColor}, 0.3) 160deg, transparent 170deg, transparent 200deg, ${secondaryColor}, 0.5) 210deg, transparent 220deg, transparent 250deg, ${secondaryColor}, 0.3) 260deg, transparent 270deg, transparent 300deg, ${secondaryColor}, 0.4) 310deg, transparent 320deg, transparent 350deg, ${secondaryColor}, 0.3) 355deg, transparent 360deg)`, 
          mask: "radial-gradient(circle, transparent 55%, black 56%, black 70%, transparent 71%)", 
          WebkitMask: "radial-gradient(circle, transparent 55%, black 56%, black 70%, transparent 71%)" 
        }} 
      />
      
      {/* Layer 3 - Inner ring */}
      <motion.div 
        animate={{ rotate: 360 }} 
        transition={{ 
          duration: state === "awake" ? 6 : 12, 
          repeat: Infinity, 
          ease: "linear" 
        }} 
        className="absolute w-[60%] h-[60%] rounded-full" 
        style={{ 
          background: `conic-gradient(from 90deg, transparent 0deg, ${tertiaryColor}, 0.6) 8deg, transparent 18deg, transparent 35deg, ${tertiaryColor}, 0.4) 42deg, transparent 52deg, transparent 70deg, ${tertiaryColor}, 0.5) 78deg, transparent 88deg, transparent 110deg, ${tertiaryColor}, 0.4) 118deg, transparent 128deg, transparent 150deg, ${tertiaryColor}, 0.6) 158deg, transparent 168deg, transparent 190deg, ${tertiaryColor}, 0.3) 198deg, transparent 208deg, transparent 230deg, ${tertiaryColor}, 0.5) 238deg, transparent 248deg, transparent 270deg, ${tertiaryColor}, 0.4) 278deg, transparent 288deg, transparent 310deg, ${tertiaryColor}, 0.5) 318deg, transparent 328deg, transparent 350deg, ${tertiaryColor}, 0.3) 355deg, transparent 360deg)`, 
          mask: "radial-gradient(circle, transparent 48%, black 49%, black 64%, transparent 65%)", 
          WebkitMask: "radial-gradient(circle, transparent 48%, black 49%, black 64%, transparent 65%)" 
        }} 
      />
      
      {/* Layer 4 - Thin ring */}
      <motion.div 
        animate={{ rotate: -360 }} 
        transition={{ 
          duration: state === "awake" ? 4 : 8, 
          repeat: Infinity, 
          ease: "linear" 
        }} 
        className="absolute w-[42%] h-[42%] rounded-full"
        style={{ 
          border: `2px solid ${primaryColor}, 0.3)`,
          mask: "radial-gradient(circle, transparent 55%, black 56%, black 90%, transparent 91%)", 
          WebkitMask: "radial-gradient(circle, transparent 55%, black 56%, black 90%, transparent 91%)" 
        }} 
      />
      
      {/* Central core */}
      <motion.div 
        animate={{ 
          scale: state === "awake" ? [1, 1.1, 1] : [1, 1.05, 1], 
          boxShadow: state === "awake"
            ? [
                `0 0 30px ${primaryColor}, 0.6), 0 0 60px ${primaryColor}, 0.4)`,
                `0 0 50px ${primaryColor}, 0.8), 0 0 100px ${primaryColor}, 0.5)`,
                `0 0 30px ${primaryColor}, 0.6), 0 0 60px ${primaryColor}, 0.4)`
              ]
            : [`0 0 20px ${primaryColor}, 0.3), 0 0 40px ${primaryColor}, 0.2)`]
        }} 
        transition={{ 
          duration: state === "awake" ? 0.6 : 2, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }} 
        className="w-[12%] h-[12%] rounded-full" 
        style={{ 
          background: `radial-gradient(circle, rgba(255,255,255,0.9) 0%, ${tertiaryColor}, 0.8) 30%, ${primaryColor}, 0.6) 100%)` 
        }} 
      />
      
      {/* Central bright dot */}
      <motion.div 
        animate={{ 
          scale: state === "awake" ? [1, 1.8, 1] : [1, 1.2, 1], 
          opacity: state === "awake" ? [1, 0.6, 1] : [0.7, 0.4, 0.7] 
        }} 
        transition={{ 
          duration: state === "awake" ? 0.4 : 1.5, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }} 
        className="absolute w-[3%] h-[3%] rounded-full bg-white" 
        style={{ boxShadow: "0 0 10px rgba(255,255,255,0.8)" }} 
      />
      
      {/* Energy particles */}
      {isAwake && (
        <>
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full"
              style={{ background: primaryColor.replace('rgba', 'rgb') }}
              animate={{
                x: [0, Math.cos(i * Math.PI / 4) * 60],
                y: [0, Math.sin(i * Math.PI / 4) * 60],
                opacity: [1, 0],
                scale: [1, 0]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeOut"
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}