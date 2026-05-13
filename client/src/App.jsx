import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { socket } from "./services/socket";
import { speak, speakDramatically, speakWithPersonality, isJarvisSpeaking as checkIsSpeaking } from "./services/speech";
import { useVoice } from "./hooks/useVoice";
import JarvisCore from "./components/JarvisCore";

function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden -z-5">
      <motion.div 
        animate={{ rotate: 360, scale: [1, 1.1, 1] }} 
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }} 
        className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full opacity-10" 
        style={{ 
          background: "radial-gradient(circle, rgba(249,115,22,0.4) 0%, transparent 70%)", 
          filter: "blur(60px)" 
        }} 
      />
      <motion.div 
        animate={{ rotate: -360, scale: [1, 1.2, 1] }} 
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }} 
        className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] rounded-full opacity-10" 
        style={{ 
          background: "radial-gradient(circle, rgba(251,146,60,0.4) 0%, transparent 70%)", 
          filter: "blur(60px)" 
        }} 
      />
      {Array.from({ length: 40 }).map((_, i) => (
        <motion.div 
          key={i} 
          className="absolute rounded-full" 
          style={{ 
            width: `${1 + Math.random() * 3}px`, 
            height: `${1 + Math.random() * 3}px`, 
            background: Math.random() > 0.5 ? "rgba(251,146,60,0.6)" : "rgba(253,186,116,0.4)", 
            left: `${Math.random() * 100}%`, 
            top: `${Math.random() * 100}%` 
          }} 
          animate={{ 
            y: [0, -20 - Math.random() * 40, 0], 
            x: [0, (Math.random() - 0.5) * 20, 0], 
            opacity: [0, 0.8, 0] 
          }} 
          transition={{ 
            duration: 3 + Math.random() * 4, 
            repeat: Infinity, 
            delay: Math.random() * 6, 
            ease: "easeInOut" 
          }} 
        />
      ))}
      <div 
        className="absolute inset-0 opacity-[0.015]" 
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5L55 20v30L30 65 5 50V20L30 5z' fill='none' stroke='white' stroke-width='0.5'/%3E%3C/svg%3E")`, 
          backgroundSize: "60px 60px" 
        }} 
      />
    </div>
  );
}

export default function App() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [isJarvisSpeaking, setIsJarvisSpeaking] = useState(false);
  const [mode, setMode] = useState("idle");
  const [wakeWordDetected, setWakeWordDetected] = useState(false);

  const { listening, text } = useVoice();

  // Check speaking status
  useEffect(() => { 
    const i = setInterval(() => setIsJarvisSpeaking(checkIsSpeaking()), 100); 
    return () => clearInterval(i); 
  }, []);

  // Reset to idle after response
  useEffect(() => { 
    let t; 
    if (!isJarvisSpeaking && !isProcessing && mode === "responding") { 
      t = setTimeout(() => { 
        setMode("idle"); 
        setResponse(""); 
        setWakeWordDetected(false);
      }, Math.max(4000, (response?.length || 0) * 60)); 
    } 
    return () => clearTimeout(t); 
  }, [isJarvisSpeaking, isProcessing, mode, response]);

  // Socket setup
  useEffect(() => { 
    window.socket = socket; 
    return () => delete window.socket; 
  }, []);

  // Handle socket responses
  useEffect(() => { 
    socket.on("response", async (d) => { 
      if (!d?.text) return; 
      setResponse(d.text); 
      setIsProcessing(true); 
      setMode("responding"); 
      const lt = d.text.toLowerCase(); 
      if (lt.includes("timer finished")) await speak(d.text); 
      else if (lt.includes("error")) { 
        await speakWithPersonality("errors"); 
        await speak(d.text); 
      } else if (d.text.length > 100) await speakDramatically(d.text); 
      else await speak(d.text); 
      setIsProcessing(false); 
    }); 
    return () => socket.off("response"); 
  }, []);
  
  // Send text command
  function sendTextCommand() { 
    const c = input.trim(); 
    if (!c || isProcessing) return; 
    socket.emit("command", c); 
    setInput(""); 
    setMode("active"); 
    setWakeWordDetected(true);
  }

  // Handle voice input - only activate on wake word
  useEffect(() => { 
    if (text && !isProcessing && !isJarvisSpeaking) {
      // Check if the text contains the wake word "Jarvis" (case insensitive)
      const containsWakeWord = /jarvis/i.test(text);
      
      if (containsWakeWord) {
        setWakeWordDetected(true);
        setMode("active");
        // Extract command after wake word if present
        const command = text.replace(/jarvis/i, "").trim();
        if (command) {
          socket.emit("command", command);
        }
      }
      // If no wake word detected, stay in idle mode
    }
  }, [text, isProcessing, isJarvisSpeaking]);

  // Greeting logic
  useEffect(() => { 
    if (!hasGreeted && listening) { 
      const h = new Date().getHours(); 
      let g = "Good evening. Say Jarvis when you need me."; 
      if (h < 12) g = "Good morning. Say Jarvis when you need me."; 
      else if (h < 17) g = "Good afternoon. Say Jarvis when you need me."; 
      setTimeout(() => { 
        speak(g); 
        setResponse(g); 
        setHasGreeted(true); 
        setMode("responding"); 
      }, 1500); 
    } 
  }, [hasGreeted, listening]);

  return (
    <div className="relative min-h-screen w-full bg-[#0a0a0a] text-white overflow-hidden">
      <AnimatedBackground />

      {/* Idle mode - shows input field */}
      <AnimatePresence>
        {mode === "idle" && (
          <motion.div 
            key="idle" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 z-50"
          >
            <div className="absolute top-[15%] left-1/2 -translate-x-1/2 text-center">
              <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-white to-orange-300 bg-clip-text text-transparent">
                J.A.R.V.I.S.
              </h1>
              <p className="text-sm text-orange-400/60 mt-2 tracking-widest">
                Just A Rather Very Intelligent System
              </p>
            </div>
            <div className="absolute bottom-[12%] left-1/2 -translate-x-1/2 w-full max-w-md px-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-3 flex gap-2">
                <input 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  onKeyDown={(e) => e.key === "Enter" && sendTextCommand()} 
                  placeholder="Type a command..." 
                  className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-zinc-600" 
                />
                <button 
                  onClick={sendTextCommand} 
                  className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-400 transition active:scale-95"
                >
                  Send
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active/Responding mode - shows response */}
      <AnimatePresence>
        {(mode === "active" || mode === "responding") && (
          <motion.div 
            key="active" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 flex items-center justify-center z-50 px-6"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              transition={{ duration: 0.4 }} 
              className="w-full max-w-3xl rounded-3xl border border-orange-500/10 bg-black/40 backdrop-blur-2xl p-8 min-h-[250px] max-h-[60vh] overflow-y-auto"
            >
              <div className="text-xs text-orange-400 mb-4 tracking-widest uppercase">
                {isProcessing ? "Processing..." : isJarvisSpeaking ? "Speaking..." : "Response"}
              </div>
              <div className="text-xl text-white leading-relaxed font-light">
                {response || (
                  <span className="text-zinc-500 italic">
                    {isProcessing ? "Thinking..." : "Listening..."}
                  </span>
                )}
              </div>
              {isProcessing && !response && (
                <div className="mt-4 flex gap-2">
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Jarvis Core - animates between center and top */}
      <motion.div 
        animate={{ 
          x: mode === "idle" ? 0 : "calc(50vw - 5rem)", 
          y: mode === "idle" ? 0 : "calc(50vh - 5rem)", 
          scale: mode === "idle" ? 1 : 0.25 
        }} 
        transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }} 
        className="fixed top-1/2 left-1/2 z-10 pointer-events-none" 
        style={{ marginTop: "-9rem", marginLeft: "-9rem" }}
      >
        <JarvisCore isSpeaking={isJarvisSpeaking} size="large" />
      </motion.div>

      {/* Processing indicator */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 10 }} 
            className="fixed top-6 left-1/2 -translate-x-1/2 bg-orange-500/20 backdrop-blur-xl px-5 py-2 rounded-full text-sm text-orange-400 border border-orange-500/30 z-50"
          >
            JARVIS is thinking...
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}