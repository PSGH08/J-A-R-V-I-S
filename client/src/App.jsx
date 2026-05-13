import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { socket } from "./services/socket";
import { speak, speakDramatically, speakWithPersonality, isJarvisSpeaking as checkIsSpeaking } from "./services/speech";
import { useVoice } from "./hooks/useVoice";
import JarvisCore from "./components/JarvisCore";

function AnimatedBackground({ state }) {
  const isIdle = state === "idle";
  
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Floating particles */}
      {Array.from({ length: !isIdle ? 60 : 30 }).map((_, i) => (
        <motion.div 
          key={i} 
          className="absolute rounded-full" 
          style={{ 
            width: `${1 + Math.random() * 3}px`, 
            height: `${1 + Math.random() * 3}px`, 
            background: !isIdle 
              ? (Math.random() > 0.5 ? "rgba(251,146,60,0.85)" : "rgba(253,186,116,0.65)")
              : (Math.random() > 0.5 ? "rgba(96,165,250,0.85)" : "rgba(147,197,253,0.65)"),
            left: `${Math.random() * 100}%`, 
            top: `${Math.random() * 100}%` 
          }} 
          animate={{ 
            y: [0, -20 - Math.random() * 40, 0], 
            x: [0, (Math.random() - 0.5) * 20, 0], 
            opacity: [0, !isIdle ? 0.9 : 0.6, 0] 
          }} 
          transition={{ 
            duration: !isIdle ? 2 + Math.random() * 3 : 3 + Math.random() * 4, 
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
  const [response, setResponse] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [isJarvisSpeaking, setIsJarvisSpeaking] = useState(false);
  const [state, setState] = useState("idle");
  const [showResponse, setShowResponse] = useState(false);
  const [hasBeenAwakened, setHasBeenAwakened] = useState(false);

  const { listening, text } = useVoice();

  // Check speaking status
  useEffect(() => { 
    const i = setInterval(() => setIsJarvisSpeaking(checkIsSpeaking()), 100); 
    return () => clearInterval(i); 
  }, []);

  // Hide response text after speaking finishes
  useEffect(() => { 
    let t; 
    if (!isJarvisSpeaking && !isProcessing && showResponse) {
      const delay = Math.max(3000, (response?.length || 0) * 50);
      t = setTimeout(() => {
        setShowResponse(false);
      }, delay);
    }
    return () => clearTimeout(t); 
  }, [isJarvisSpeaking, isProcessing, showResponse, response]);

  // Socket setup
  useEffect(() => { 
    window.socket = socket; 
    return () => delete window.socket; 
  }, []);

  // Handle socket responses - ONLY from backend
  useEffect(() => { 
    socket.on("response", async (d) => { 
      if (!d?.text) return; 
      setResponse(d.text); 
      setShowResponse(true);
      setIsProcessing(true);
      
      const lt = d.text.toLowerCase(); 
      if (lt.includes("timer finished")) await speak(d.text); 
      else if (lt.includes("error")) { 
        await speakWithPersonality("errors"); 
        await speak(d.text); 
      } else if (d.text.length > 100) await speakDramatically(d.text); 
      else await speak(d.text); 
      
      setIsProcessing(false);
    }); 

    socket.on("sleep", () => {
      setState("idle");
      setHasBeenAwakened(false);
      setShowResponse(false);
      setResponse("");
    });

    return () => {
      socket.off("response");
      socket.off("sleep");
    }; 
  }, []);

  // Handle voice input - SAME LOGIC AS ORIGINAL CODE
  useEffect(() => { 
    if (text && !isProcessing && !isJarvisSpeaking) {
      const containsWakeWord = /jarvis/i.test(text);
      
      if (containsWakeWord) {
        // First wake word - transition to awake
        if (!hasBeenAwakened) {
          setHasBeenAwakened(true);
          setState("awake");
        }
        
        // Extract command after wake word if present
        const command = text.replace(/jarvis/i, "").trim();
        if (command) {
          socket.emit("command", command);
        }
      }
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
        setResponse(g);
        setShowResponse(true);
        speak(g); 
        setHasGreeted(true); 
      }, 1500); 
    } 
  }, [hasGreeted, listening]);

  return (
    <div className="relative min-h-screen w-full bg-[#050505] text-white overflow-hidden">
      <AnimatedBackground state={state} />

      {/* Core - dead center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <motion.div
          key={state}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        >
          <JarvisCore state={state} size="large" />
        </motion.div>
      </div>

      {/* Text area */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">        
        {/* Title - only in idle, now at top */}
        <AnimatePresence>
          {state === "idle" && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-center"
            >
              <h1 className="text-3xl font-light tracking-[0.3em] text-blue-400/100 mb-2 whitespace-nowrap">
                J.A.R.V.I.S
              </h1>
              <p className="text-xs text-blue-400/100 tracking-[0.2em] font-light whitespace-nowrap">
                Just A Rather Very Intelligent System
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Response area - below core */}
      <div className="absolute top-[calc(50%+300px)] left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
        {/* Response text */}
        <AnimatePresence>
          {showResponse && !isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className={`px-6 py-3 rounded-2xl border max-w-lg text-center backdrop-blur-sm ${
                state === "idle" 
                  ? "bg-blue-500/10 border-blue-400/20 text-blue-300/80" 
                  : "bg-orange-500/10 border-orange-400/20 text-orange-300/80"
              }`}
            >
              <p className={`text-sm font-light ${
                state === "idle" ? "text-blue-300/90" : "text-orange-300/90"
              }`}>
                {response}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Processing dots */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex gap-2"
            >
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Bottom indicator */}
      {!showResponse && !isProcessing && (
        <motion.div
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 text-xs tracking-widest whitespace-nowrap"
        >
          {state === "idle" ? (
            <span className="text-blue-400/80">
              {listening ? "LISTENING FOR WAKE WORD..." : "LISTENING FOR WAKE WORD..."}
            </span>
          ) : (
            <span className="text-orange-400/80">
              LISTENING FOR COMMANDS
            </span>
          )}
        </motion.div>
      )}
    </div>
  );
}