import { motion } from "framer-motion";

export default function JarvisCore({ isSpeaking, size = "large" }) {
  const sizes = { large: "w-72 h-72", small: "w-20 h-20" };
  
  return (
    <div className={`relative flex items-center justify-center ${sizes[size]}`}>
      <motion.div 
        animate={{ 
          scale: isSpeaking ? [1, 1.3, 1] : [1, 1.1, 1], 
          opacity: isSpeaking ? [0.3, 0.6, 0.3] : [0.15, 0.25, 0.15] 
        }} 
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} 
        className="absolute w-full h-full rounded-full bg-orange-500/20 blur-3xl" 
      />
      <motion.div 
        animate={{ rotate: 360 }} 
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }} 
        className="absolute w-[95%] h-[95%] rounded-full" 
        style={{ 
          background: "conic-gradient(from 0deg, transparent 0deg, rgba(249,115,22,0.4) 10deg, transparent 20deg, transparent 40deg, rgba(249,115,22,0.3) 50deg, transparent 60deg, rgba(249,115,22,0.2) 70deg, transparent 80deg, transparent 120deg, rgba(249,115,22,0.4) 130deg, transparent 140deg, transparent 160deg, rgba(249,115,22,0.3) 170deg, transparent 180deg, transparent 200deg, rgba(249,115,22,0.2) 210deg, transparent 220deg, transparent 240deg, rgba(249,115,22,0.3) 250deg, transparent 260deg, transparent 280deg, rgba(249,115,22,0.2) 290deg, transparent 300deg, transparent 320deg, rgba(249,115,22,0.4) 330deg, transparent 340deg, transparent 360deg)", 
          mask: "radial-gradient(circle, transparent 60%, black 61%, black 75%, transparent 76%)", 
          WebkitMask: "radial-gradient(circle, transparent 60%, black 61%, black 75%, transparent 76%)" 
        }} 
      />
      <motion.div 
        animate={{ rotate: -360 }} 
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }} 
        className="absolute w-[78%] h-[78%] rounded-full" 
        style={{ 
          background: "conic-gradient(from 45deg, transparent 0deg, rgba(251,146,60,0.5) 15deg, transparent 25deg, transparent 50deg, rgba(251,146,60,0.3) 60deg, transparent 70deg, transparent 100deg, rgba(251,146,60,0.4) 110deg, transparent 120deg, transparent 150deg, rgba(251,146,60,0.3) 160deg, transparent 170deg, transparent 200deg, rgba(251,146,60,0.5) 210deg, transparent 220deg, transparent 250deg, rgba(251,146,60,0.3) 260deg, transparent 270deg, transparent 300deg, rgba(251,146,60,0.4) 310deg, transparent 320deg, transparent 350deg, rgba(251,146,60,0.3) 355deg, transparent 360deg)", 
          mask: "radial-gradient(circle, transparent 55%, black 56%, black 70%, transparent 71%)", 
          WebkitMask: "radial-gradient(circle, transparent 55%, black 56%, black 70%, transparent 71%)" 
        }} 
      />
      <motion.div 
        animate={{ rotate: 360 }} 
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }} 
        className="absolute w-[60%] h-[60%] rounded-full" 
        style={{ 
          background: "conic-gradient(from 90deg, transparent 0deg, rgba(253,186,116,0.6) 8deg, transparent 18deg, transparent 35deg, rgba(253,186,116,0.4) 42deg, transparent 52deg, transparent 70deg, rgba(253,186,116,0.5) 78deg, transparent 88deg, transparent 110deg, rgba(253,186,116,0.4) 118deg, transparent 128deg, transparent 150deg, rgba(253,186,116,0.6) 158deg, transparent 168deg, transparent 190deg, rgba(253,186,116,0.3) 198deg, transparent 208deg, transparent 230deg, rgba(253,186,116,0.5) 238deg, transparent 248deg, transparent 270deg, rgba(253,186,116,0.4) 278deg, transparent 288deg, transparent 310deg, rgba(253,186,116,0.5) 318deg, transparent 328deg, transparent 350deg, rgba(253,186,116,0.3) 355deg, transparent 360deg)", 
          mask: "radial-gradient(circle, transparent 48%, black 49%, black 64%, transparent 65%)", 
          WebkitMask: "radial-gradient(circle, transparent 48%, black 49%, black 64%, transparent 65%)" 
        }} 
      />
      <motion.div 
        animate={{ rotate: -360 }} 
        transition={{ duration: 7, repeat: Infinity, ease: "linear" }} 
        className="absolute w-[42%] h-[42%] rounded-full border-2 border-orange-400/30" 
        style={{ 
          mask: "radial-gradient(circle, transparent 55%, black 56%, black 90%, transparent 91%)", 
          WebkitMask: "radial-gradient(circle, transparent 55%, black 56%, black 90%, transparent 91%)" 
        }} 
      />
      <motion.div 
        animate={{ 
          scale: isSpeaking ? [1, 1.1, 1] : [1, 1.05, 1], 
          boxShadow: isSpeaking 
            ? ["0 0 30px rgba(251,146,60,0.6), 0 0 60px rgba(249,115,22,0.4)", "0 0 50px rgba(251,146,60,0.8), 0 0 100px rgba(249,115,22,0.5)", "0 0 30px rgba(251,146,60,0.6), 0 0 60px rgba(249,115,22,0.4)"] 
            : ["0 0 20px rgba(251,146,60,0.3), 0 0 40px rgba(249,115,22,0.2)"] 
        }} 
        transition={{ duration: isSpeaking ? 0.6 : 2, repeat: Infinity, ease: "easeInOut" }} 
        className="w-[12%] h-[12%] rounded-full" 
        style={{ 
          background: "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(253,186,116,0.8) 30%, rgba(249,115,22,0.6) 100%)" 
        }} 
      />
      <motion.div 
        animate={{ 
          scale: isSpeaking ? [1, 1.5, 1] : [1, 1.2, 1], 
          opacity: isSpeaking ? [1, 0.6, 1] : [0.7, 0.4, 0.7] 
        }} 
        transition={{ duration: isSpeaking ? 0.4 : 1.5, repeat: Infinity, ease: "easeInOut" }} 
        className="absolute w-[3%] h-[3%] rounded-full bg-white" 
        style={{ boxShadow: "0 0 10px rgba(255,255,255,0.8)" }} 
      />
    </div>
  );
}