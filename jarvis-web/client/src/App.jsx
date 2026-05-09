import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { socket } from "./services/socket";
import { speak, speakDramatically, wittyInterjection, speakWithPersonality } from "./services/speech";
import { useVoice } from "./hooks/useVoice";

export default function App() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false); // Track if greeted already

  const { listening, text, startListening, stopListening } = useVoice(); // Add wakeWordHeard

  // Expose socket globally for voice recognition
  useEffect(() => {
    window.socket = socket;
    return () => {
      delete window.socket;
    };
  }, []);

  useEffect(() => {
    socket.on("response", async (data) => {
      if (!data?.text) return;
      
      setResponse(data.text);
      setIsProcessing(true);
      
      // Add JARVIS personality to responses
      const lowerText = data.text.toLowerCase();
      
      // Check if it's a timer completion
      if (lowerText.includes('timer finished')) {
        await speak(data.text);
      }
      // Check if it's an error message
      else if (lowerText.includes('error') || lowerText.includes('failed') || lowerText.includes('problem')) {
        await speakWithPersonality('errors');
        await speak(data.text);
      } 
      // Check if it's a loading/processing state
      else if (lowerText.includes('loading') || lowerText.includes('processing') || lowerText.includes('thinking')) {
        await speakWithPersonality('loading');
        await speak(data.text);
      }
      // Long responses - speak dramatically with pauses
      else if (data.text.length > 100) {
        await speakDramatically(data.text);
      }
      // Normal response with personality
      else {
        // Use acknowledge for command confirmations
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

  // Single greeting when voice is ready
  useEffect(() => {
    if (!hasGreeted && listening) {
      const hour = new Date().getHours();
      let greetingMessage = "";
      
      if (hour < 12) {
        greetingMessage = "Good morning. Say 'Jarvis' when you need me.";
      } else if (hour < 18) {
        greetingMessage = "Good afternoon. Say 'Jarvis' when you need me.";
      } else {
        greetingMessage = "Good evening. Say 'Jarvis' when you need me.";
      }
      
      setTimeout(() => {
        speak(greetingMessage);
        setResponse(greetingMessage);
        setHasGreeted(true);
      }, 2000);
    }
  }, [hasGreeted, listening]);

  return (
    <div className="relative min-h-screen w-full bg-[#050507] text-white overflow-hidden">

      {/* BACKGROUND */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_60%)]" />
      <div className="absolute inset-0 -z-10 opacity-[0.05] bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:48px_48px]" />

      {/* PROCESSING INDICATOR */}
      {isProcessing && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-4 right-4 bg-sky-500/20 backdrop-blur-xl px-4 py-2 rounded-full text-xs text-sky-400 border border-sky-500/30"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse"></div>
            JARVIS is thinking...
          </div>
        </motion.div>
      )}

      {/* APP SHELL */}
      <div className="relative max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-2 gap-6 z-10">

        {/* LEFT */}
        <div className="space-y-5">

          {/* HEADER */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6"
          >
            <div className="text-xs text-zinc-400">AI SYSTEM</div>

            <div className="text-3xl font-semibold tracking-tight mt-1">
              J.A.R.V.I.S.
            </div>

            <div className="text-xs text-sky-400/70 mt-1">Just A Rather Very Intelligent System</div>

            <div className="mt-3 text-sm text-zinc-400">
              Status:
              <span className={listening ? "text-emerald-400 ml-2" : isProcessing ? "text-sky-400 ml-2" : "text-zinc-500 ml-2"}>
                {listening ? "Listening" : isProcessing ? "Processing" : "Idle"}
              </span>
            </div>
          </motion.div>

          {/* VOICE CONTROLS */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4"
          >
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${listening ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></div>
                <span className="text-sm text-zinc-300">
                  {listening ? "Always listening for 'Jarvis'..." : "Voice stopped"}
                </span>
              </div>
              <div className="flex gap-2 justify-center mt-2">
                <button
                  onClick={startListening}
                  className="px-4 py-1 rounded-lg bg-sky-500/20 text-sky-400 text-xs hover:bg-sky-500/30 transition"
                >
                  Start Voice
                </button>
                <button
                  onClick={stopListening}
                  className="px-4 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30 transition"
                >
                  Stop Voice
                </button>
              </div>
            </div>
          </motion.div>

          {/* INPUT */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-3 flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendTextCommand()}
              placeholder="Type a command..."
              className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-zinc-500"
            />

            <button
              onClick={sendTextCommand}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl bg-sky-500 text-white font-medium hover:bg-sky-400 transition active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </motion.div>

        </div>

        {/* RIGHT */}
        <div className="space-y-5">

          {/* LIVE INPUT */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5"
          >
            <div className="text-xs text-sky-400 mb-2 flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${listening ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`}></div>
              Live Input
            </div>
            <div className="text-sm text-zinc-300 min-h-[40px]">
              {text || "Awaiting command..."}
            </div>
          </motion.div>

          {/* RESPONSE */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 min-h-[180px]"
          >
            <div className="text-xs text-sky-400 mb-2">Response</div>
            <motion.div 
              key={response}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="text-sm text-white leading-relaxed"
            >
              {response || "Standing by. How can I help you today?"}
            </motion.div>
            
            {/* Typing indicator for responses */}
            {isProcessing && (
              <div className="mt-3 flex gap-1">
                <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            )}
          </motion.div>

        </div>

      </div>
    </div>
  );
}