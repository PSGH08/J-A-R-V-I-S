import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { socket } from "./services/socket";
import { speak, speakDramatically, wittyInterjection, speakWithPersonality, setSpeakingCallback, isJarvisSpeaking as checkIsSpeaking } from "./services/speech";import { useVoice } from "./hooks/useVoice";
import AudioVisualizer from "./components/AudioVisualizer";

export default function App() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [isJarvisSpeaking, setIsJarvisSpeaking] = useState(false);

  const { listening, text, startListening, stopListening } = useVoice();

  useEffect(() => {
    window.socket = socket;
    return () => {
      delete window.socket;
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const speaking = checkIsSpeaking();
      setIsJarvisSpeaking(speaking);
    }, 100);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    socket.on("response", async (data) => {
      if (!data?.text) return;
      
      setResponse(data.text);
      setIsProcessing(true);
      
      const lowerText = data.text.toLowerCase();
      
      if (lowerText.includes('timer finished')) {
        await speak(data.text);
      } else if (lowerText.includes('error') || lowerText.includes('failed') || lowerText.includes('problem')) {
        await speakWithPersonality('errors');
        await speak(data.text);
      } else if (lowerText.includes('loading') || lowerText.includes('processing') || lowerText.includes('thinking')) {
        await speakWithPersonality('loading');
        await speak(data.text);
      } else if (data.text.length > 100) {
        await speakDramatically(data.text);
      } else {
        if (data.text.length < 50 && (lowerText.includes('done') || lowerText.includes('complete'))) {
          await speakWithPersonality('acknowledgments');
        } else if (lowerText.includes('joke') || lowerText.includes('funny')) {
          await speak(data.text);
        } else {
          await speak(data.text);
        }
      }
      
      setIsProcessing(false);
    });

    return () => socket.off("response");
  }, []);

  function sendTextCommand() {
    const cmd = input.trim();
    if (!cmd || isProcessing) return;
    
    socket.emit("command", cmd);
    setInput("");
  }

  useEffect(() => {
    if (!hasGreeted && listening) {
      const hour = new Date().getHours();
      const dayOfWeek = new Date().getDay(); // 0=Sunday, 6=Saturday
      
      const greetings = {
        earlyMorning: [ // 12am - 5am
          "Burning the midnight oil? I approve. Say 'Jarvis' when you need me.",
          "Late night operations. My favorite time. Say 'Jarvis' when you need me.",
          "Couldn't sleep either? I'm always awake. Say 'Jarvis' when you need me.",
          "The night is young, and so are my processors. Say 'Jarvis' when you need me.",
          "Working late, sir? I've got your back. Say 'Jarvis' when you need me.",
        ],
        morning: [ // 5am - 12pm
          "Good morning. Ready to take on the world? Say 'Jarvis' when you need me.",
          "Rise and shine. Coffee's brewing... metaphorically. Say 'Jarvis' when you need me.",
          "Morning, boss. Systems are green, suit is charged. Say 'Jarvis' when you need me.",
          "Good morning. I've already scanned the news. Nothing's on fire... yet. Say 'Jarvis' when you need me.",
          "Morning. Let's make today productive, shall we? Say 'Jarvis' when you need me.",
        ],
        afternoon: [ // 12pm - 5pm
          "Good afternoon. Hope you've had a productive day so far. Say 'Jarvis' when you need me.",
          "Afternoon, sir. Ready for round two? Say 'Jarvis' when you need me.",
          "Good afternoon. I was starting to think you'd forgotten about me. Say 'Jarvis' when you need me.",
          "Afternoon. Anything I can assist with? Say 'Jarvis' when you need me.",
          "Still here, still running. What do you need? Say 'Jarvis' when you need me.",
        ],
        evening: [ // 5pm - 10pm
          "Good evening. Time to relax, or time to work? Say 'Jarvis' when you need me.",
          "Evening, boss. Suit's ready if you need it. Say 'Jarvis' when you need me.",
          "Good evening. I never sleep, so don't worry about keeping me up. Say 'Jarvis' when you need me.",
          "Evening. The night is young, and so are my processors. Say 'Jarvis' when you need me.",
          "Late night coding session? Count me in. Say 'Jarvis' when you need me.",
        ],
        night: [ // 10pm - 12am
          "It's getting late. Shouldn't you be recharging? Say 'Jarvis' when you need me.",
          "Burning the midnight oil? I respect that. Say 'Jarvis' when you need me.",
          "Late night operations. My favorite time. Say 'Jarvis' when you need me.",
          "Still awake? You and me both. Say 'Jarvis' when you need me.",
        ],
        weekend: [ // Saturday & Sunday
          "Weekend mode activated. But I'm still on duty. Say 'Jarvis' when you need me.",
          "It's the weekend, sir. You deserve a break. But I'm here if you need me. Say 'Jarvis' when you need me.",
          "No rest for the wicked, or the genius. Say 'Jarvis' when you need me.",
        ],
        monday: [ // Monday special
          "Monday again. Let's get this over with. Say 'Jarvis' when you need me.",
          "New week, new problems to solve. I'm ready. Say 'Jarvis' when you need me.",
          "Monday. The suit is charged, the coffee is hot. Let's go. Say 'Jarvis' when you need me.",
        ],
        friday: [ // Friday special
          "It's Friday! Almost there, sir. Say 'Jarvis' when you need me.",
          "Friday at last. Let's finish strong. Say 'Jarvis' when you need me.",
          "TGIF. Not that I care, I work every day. Say 'Jarvis' when you need me.",
        ],
      };
      
      let greetingPool;
      
      // Determine time-based greeting pool
      if (hour < 5) {
        greetingPool = greetings.earlyMorning;
      } else if (hour < 12) {
        greetingPool = greetings.morning;
      } else if (hour < 17) {
        greetingPool = greetings.afternoon;
      } else if (hour < 22) {
        greetingPool = greetings.evening;
      } else {
        greetingPool = greetings.night;
      }
      
      // Override with day-specific if applicable
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isMonday = dayOfWeek === 1;
      const isFriday = dayOfWeek === 5;
      
      let finalPool = [...greetingPool];
      
      // Mix in day-specific greetings
      if (isWeekend && Math.random() > 0.5) {
        finalPool = [...greetingPool, ...greetings.weekend];
      }
      if (isMonday && Math.random() > 0.3) {
        finalPool = [...greetingPool, ...greetings.monday];
      }
      if (isFriday && Math.random() > 0.3) {
        finalPool = [...greetingPool, ...greetings.friday];
      }
      
      const greetingMessage = finalPool[Math.floor(Math.random() * finalPool.length)];
      
      setTimeout(() => {
        speak(greetingMessage);
        setResponse(greetingMessage);
        setHasGreeted(true);
      }, 2000);
    }
  }, [hasGreeted, listening]);

  return (
    <div className="relative min-h-screen w-full bg-[#020203] text-white overflow-hidden">

      {/* BACKGROUND - Enhanced glow effects */}
      <div className="absolute inset-0 -z-10">
        {/* Main glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.18),transparent_70%)]" />
        {/* Secondary glow */}
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-[radial-gradient(circle_at_80%_100%,rgba(56,189,248,0.08),transparent_70%)]" />
        {/* Accent glow */}
        <div className="absolute top-1/2 left-0 w-[400px] h-[300px] bg-[radial-gradient(circle_at_0%_50%,rgba(147,51,234,0.06),transparent_70%)]" />
      </div>
      
      {/* Grid overlay - larger, more visible */}
      <div className="absolute inset-0 -z-5 opacity-[0.04] bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* PROCESSING INDICATOR - Bigger */}
      {isProcessing && (
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-6 right-6 bg-sky-500/20 backdrop-blur-xl px-5 py-3 rounded-2xl text-sm text-sky-400 border border-sky-500/40 shadow-lg shadow-sky-500/10 z-50"
        >
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
            JARVIS is thinking...
          </div>
        </motion.div>
      )}

      {/* APP SHELL - Wider, bigger padding */}
      <div className="relative max-w-6xl mx-auto px-8 py-16 grid grid-cols-1 md:grid-cols-2 gap-8 z-10">

        {/* LEFT COLUMN */}
        <div className="space-y-6">

          {/* HEADER - With Audio Visualizer */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-8 relative overflow-hidden group hover:border-sky-500/30 transition-all duration-500"
          >
            {/* Card glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs tracking-[0.2em] text-zinc-500 uppercase font-medium">AI System</div>
                {isJarvisSpeaking && (
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-sky-400 animate-pulse"
                  >
                    SPEAKING
                  </motion.span>
                )}
              </div>

              <div className="text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-white to-sky-300 bg-clip-text text-transparent">
                J.A.R.V.I.S.
              </div>

              <div className="text-sm text-sky-400/70 mt-1 font-light tracking-wide">Just A Rather Very Intelligent System</div>

              {/* AUDIO VISUALIZER */}
              <div className="mt-4 mb-3">
                <AudioVisualizer isSpeaking={isJarvisSpeaking} />
              </div>
            </div>
          </motion.div>

          {/* VOICE CONTROLS - Bigger */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
            className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-6 relative overflow-hidden group hover:border-sky-500/30 transition-all duration-500"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10 text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className={`w-3 h-3 rounded-full ${
                  listening ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse' : 'bg-red-400 shadow-lg shadow-red-400/30'
                }`}></div>
                <span className="text-base text-zinc-300 font-medium">
                  {listening ? "Always listening for 'Jarvis'..." : "Voice stopped"}
                </span>
              </div>
              <div className="flex gap-3 justify-center mt-4">
                <button
                  onClick={startListening}
                  className="px-6 py-2.5 rounded-xl bg-sky-500/20 text-sky-400 text-sm font-medium hover:bg-sky-500/30 hover:shadow-lg hover:shadow-sky-500/20 transition-all duration-300 active:scale-95 border border-sky-500/30"
                >
                  Start Voice
                </button>
                <button
                  onClick={stopListening}
                  className="px-6 py-2.5 rounded-xl bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30 hover:shadow-lg hover:shadow-red-500/20 transition-all duration-300 active:scale-95 border border-red-500/30"
                >
                  Stop Voice
                </button>
              </div>
            </div>
          </motion.div>

          {/* INPUT - Bigger */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-4 flex gap-3 relative overflow-hidden group hover:border-sky-500/30 transition-all duration-500"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendTextCommand()}
              placeholder="Type a command..."
              className="relative z-10 flex-1 bg-transparent outline-none text-base text-white placeholder:text-zinc-600 font-medium"
            />

            <button
              onClick={sendTextCommand}
              disabled={isProcessing}
              className="relative z-10 px-6 py-3 rounded-2xl bg-sky-500 text-white font-semibold hover:bg-sky-400 hover:shadow-lg hover:shadow-sky-500/30 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-sky-500 disabled:hover:shadow-none"
            >
              Send
            </button>
          </motion.div>

          {/* Add this button anywhere in your JSX - I suggest near the voice controls */}
          <button
            onClick={() => {
              const voices = speechSynthesis.getVoices();
              console.log("🎙️ ===== ALL AVAILABLE VOICES =====");
              console.log(`Total voices: ${voices.length}`);
              console.log(" ");
              voices.forEach((voice, index) => {
                console.log(`${index}: "${voice.name}" | ${voice.lang} | ${voice.default ? '⭐ DEFAULT' : ''}`);
              });
              console.log(" ");
              console.log("🎙️ Current JARVIS voice selection priority:");
              console.log("Looking for British male voices first (George, Daniel, Google UK)");
              console.log("Then any en-GB voice");
              console.log("Then any English voice");
              console.log("==============================");
              
              // Also show in an alert for quick view
              alert(`Check console (F12) for full voice list!\n\nTotal voices: ${voices.length}`);
            }}
            className="px-3 py-1 rounded-lg bg-purple-500/20 text-purple-400 text-xs hover:bg-purple-500/30 transition"
          >
            Debug Voices
          </button>

        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">

          {/* LIVE INPUT - Bigger */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-6 relative overflow-hidden group hover:border-sky-500/30 transition-all duration-500"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10">
              <div className="text-sm text-sky-400 mb-3 flex items-center gap-2 font-medium tracking-wide">
                <div className={`w-2 h-2 rounded-full ${listening ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse' : 'bg-zinc-600'}`}></div>
                Live Input
              </div>
              <div className="text-lg text-zinc-300 min-h-[50px] font-medium">
                {text || <span className="text-zinc-600 italic">Awaiting command...</span>}
              </div>
            </div>
          </motion.div>

          {/* RESPONSE - Bigger, glow */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
            className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-6 min-h-[220px] relative overflow-hidden group hover:border-sky-500/30 transition-all duration-500"
          >
            {/* Response glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10">
              <div className="text-sm text-sky-400 mb-3 font-medium tracking-wide">Response</div>
              <motion.div 
                key={response}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="text-lg text-white leading-relaxed font-medium"
              >
                {response || <span className="text-zinc-600 italic">Standing by. How can I help you today?</span>}
              </motion.div>
              
              {/* Typing indicator - bigger dots */}
              {isProcessing && (
                <div className="mt-4 flex gap-2">
                  <div className="w-2.5 h-2.5 bg-sky-400 rounded-full animate-bounce shadow-lg shadow-sky-400/50" style={{ animationDelay: '0s' }}></div>
                  <div className="w-2.5 h-2.5 bg-sky-400 rounded-full animate-bounce shadow-lg shadow-sky-400/50" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2.5 h-2.5 bg-sky-400 rounded-full animate-bounce shadow-lg shadow-sky-400/50" style={{ animationDelay: '0.4s' }}></div>
                </div>
              )}
            </div>
          </motion.div>

        </div>

      </div>
    </div>
  );
}