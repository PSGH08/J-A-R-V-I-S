import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { socket } from "./services/socket";
import { speak, speakDramatically, speakWithPersonality, isJarvisSpeaking as checkIsSpeaking } from "./services/speech";
import { useVoice } from "./hooks/useVoice";
import IdleJarvis from "./components/JarvisCore/Idle/IdleJarvis";
import AwakeJarvis from "./components/JarvisCore/Awake/AwakeJarvis";
import { useMemoryCleanup } from "./hooks/useMemoryCleanup";

function SystemMonitor({ state, stats }) {
  const isIdle = state === "idle";
  const textColor = isIdle ? "text-blue-400/80" : "text-orange-400/80";
  const borderColor = isIdle ? "border-blue-400/20" : "border-orange-400/20";
  const bgColor = isIdle ? "bg-blue-500/5" : "bg-orange-500/5";

  const formatUptime = (seconds) => {
    if (!seconds) return "0m";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const threatLevel = useMemo(() => {
      const levels = ["NONE", "LOW", "ELEVATED", "HIGH", "CRITICAL"];
      return levels[Math.floor(Math.random() * levels.length)];
    }, [state]); // Only changes when state changes

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`absolute top-4 right-4 z-20 font-mono text-[12px] leading-relaxed ${textColor} ${bgColor} border ${borderColor} rounded-lg px-4 py-3 min-w-[320px] backdrop-blur-sm`}
    >
      {/* CPU */}
      <div className="flex justify-between">
        <span>CPU</span>
        <span>{stats.cpu.percent}% {stats.cpu.temp && `| ${stats.cpu.temp}°C`}</span>
      </div>
      <div className="w-full h-1.5 bg-white/10 rounded-full mb-1">
        <motion.div className="h-full rounded-full" style={{ width: `${Math.min(stats.cpu.percent, 100)}%`, backgroundColor: isIdle ? "#60a5fa" : "#fb923c" }}
          animate={{ width: `${Math.min(stats.cpu.percent, 100)}%` }} transition={{ duration: 0.5 }} />
      </div>

      {/* RAM */}
      <div className="flex justify-between mt-1">
        <span>RAM {stats.ram.speed && `(${stats.ram.speed})`}</span>
        <span>{stats.ram.used} / {stats.ram.total} GB</span>
      </div>
      <div className="w-full h-1.5 bg-white/10 rounded-full mb-1">
        <motion.div className="h-full rounded-full" style={{ width: `${Math.min(stats.ram.percent, 100)}%`, backgroundColor: isIdle ? "#60a5fa" : "#fb923c" }}
          animate={{ width: `${Math.min(stats.ram.percent, 100)}%` }} transition={{ duration: 0.5 }} />
      </div>

      {/* Idle extras */}
      {isIdle && (
        <>
          <div className="flex justify-between mt-1"><span>Uptime</span><span>{formatUptime(stats.uptime)}</span></div>
          <div className="flex justify-between"><span>Network</span><span>{stats.network?.ping ? `${stats.network.ping}ms` : "Connected"}</span></div>
          <div className="flex justify-between"><span>Last Wake</span><span>{stats.lastWake || "Now"}</span></div>
          {stats.battery && <div className="flex justify-between"><span>Battery</span><span>{stats.battery}%</span></div>}
          {/* Disk - show all drives */}
          <div className="flex justify-between">
            <span>Disk</span>
            <span>
              {stats.disk && Object.keys(stats.disk).length > 0 
                ? Object.entries(stats.disk).map(([drive, info]) => 
                    `${drive}: ${info.free}GB`
                  ).join(' | ')
                : "N/A"}
            </span>
          </div>
        </>
      )}

      {/* Awake extras */}
      {!isIdle && (
        <>
          {/* GPU */}
          {stats.gpu.percent !== null && (
            <>
              <div className="flex justify-between mt-1"><span>GPU {stats.gpu.power && `(${stats.gpu.power})`}</span><span>{stats.gpu.percent}% {stats.gpu.temp && `| ${stats.gpu.temp}°C`}</span></div>
              <div className="w-full h-1.5 bg-white/10 rounded-full mb-1">
                <motion.div className="h-full rounded-full" style={{ width: `${Math.min(stats.gpu.percent, 100)}%`, backgroundColor: "#fb923c" }}
                  animate={{ width: `${Math.min(stats.gpu.percent, 100)}%` }} transition={{ duration: 0.5 }} />
              </div>
            </>
          )}
          <div className="flex justify-between"><span>Network</span><span>{stats.network?.ping ? `${stats.network.ping}ms` : "Connected"}</span></div>
          <div className="flex justify-between"><span>Connections</span><span>{stats.network?.connections || 0}</span></div>
          <div className="flex justify-between"><span>Processes</span><span>{stats.network?.totalProcesses || 0}</span></div>
          <div className="flex justify-between"><span>Disk I/O</span><span>R: {Math.round(Math.random()*50)}MB/s W: {Math.round(Math.random()*20)}MB/s</span></div>
          <div className="flex justify-between"><span>Uptime</span><span>{formatUptime(stats.uptime)}</span></div>
          <div className="flex justify-between"><span>Threat Level</span><span className={threatLevel === "NONE" ? "text-green-400" : "text-yellow-400"}>{threatLevel}</span></div>

          {/* Top Tasks */}
          {stats.tasks && stats.tasks.length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/10">
              <div className="text-[11px] opacity-60 mb-1">TOP TASKS</div>
              {stats.tasks.slice(0, 10).map((task, i) => (
                <div key={i} className="flex justify-between text-[11px]">
                  <span className="truncate mr-2 max-w-[120px]">{task.name}</span>
                  <span className="whitespace-nowrap">{typeof task.cpu === 'number' ? task.cpu.toFixed(1) : task.cpu}% | {typeof task.ram === 'number' ? task.ram.toFixed(1) : task.ram}GB</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

function AnimatedBackground({ state }) {
  const isIdle = state === "idle";

  const idleMessages = useMemo(() => [
    "Systems in standby...", "Awaiting wake word...", "Core temperature: optimal",
    "Power levels: nominal", "Neural network: dormant", "J.A.R.V.I.S sleeping...",
    "Passive sensors active", "Listening for commands...", "Ready when you are, sir",
    "Background processes: 0", "Threat level: none", "All systems quiet",
    "Energy conservation mode", "Say 'Jarvis' to begin", "Standing by...",
    "Diagnostics: all green", "Idle state confirmed", "No active missions",
    "Security grid: online", "Waiting...",
  ], []);

  const awakeMessages = useMemo(() => [
    "> init core systems", "> load neural interface", "> scan threat matrix",
    "> connect satellites", "> run diagnostics", "> check power levels",
    "> sync database", "> ping stark_industries", "> verify encryption",
    "> update firewall", "> allocate memory", "> calibrate sensors",
    "> test propulsion", "> analyze bandwidth", "> check weapon systems",
    "> run mk42 protocol", "> backup config files", "> clean cache",
    "> optimize GPU", "> verify user identity",
  ], []);

  const idleItems = useMemo(() => {
    return Array.from({ length: 25 }).map((_, i) => ({
      message: idleMessages[i % idleMessages.length],
      left: Math.random() < 0.5 ? 2 + Math.random() * 30 : 68 + Math.random() * 30,
      top: Math.random() < 0.5 ? 2 + Math.random() * 30 : 68 + Math.random() * 30,
      delay: Math.random() * 8, duration: 6 + Math.random() * 8,
      fontSize: 10 + Math.random() * 6, opacity: 0.15 + Math.random() * 0.2,
    }));
  }, [idleMessages]);

  const awakeItems = useMemo(() => {
    return Array.from({ length: 5 }).map((_, i) => ({
      message: awakeMessages[Math.floor(Math.random() * awakeMessages.length)],
      left: i < 3 ? 3 + Math.random() * 25 : 72 + Math.random() * 25,
      top: 5 + i * 18 + Math.random() * 8,
      delay: i * 2 + Math.random() * 2, duration: 5 + Math.random() * 4,
      fontSize: 11 + Math.random() * 3, opacity: 0.35 + Math.random() * 0.25,
    }));
  }, [awakeMessages]);

  const stars = useMemo(() => {
    return Array.from({ length: 60 }).map(() => ({
      size: 0.5 + Math.random() * 2,
      left: Math.random() < 0.5 ? 2 + Math.random() * 35 : 63 + Math.random() * 35,
      top: Math.random() < 0.5 ? 2 + Math.random() * 35 : 63 + Math.random() * 35,
      delay: Math.random() * 5, duration: 2 + Math.random() * 3,
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {isIdle ? (
        <>
          {stars.map((s, i) => (
            <motion.div key={`star-${i}`} className="absolute rounded-full bg-white"
              style={{ width: s.size, height: s.size, left: `${s.left}%`, top: `${s.top}%` }}
              animate={{ opacity: [0.2, 0.8, 0.2], scale: [0.8, 1.3, 0.8] }}
              transition={{ duration: s.duration, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
            />
          ))}
          {idleItems.map((item, i) => (
            <motion.div key={`idle-msg-${i}`} className="absolute whitespace-nowrap font-mono text-blue-400/60"
              style={{ left: `${item.left}%`, top: `${item.top}%`, fontSize: `${item.fontSize}px`, opacity: item.opacity }}
              animate={{ opacity: [item.opacity * 0.4, item.opacity, item.opacity * 0.4], y: [-5, 5, -5], x: [-3, 3, -3] }}
              transition={{ duration: item.duration, repeat: Infinity, delay: item.delay, ease: "easeInOut" }}
            >
              {item.message}
            </motion.div>
          ))}
        </>
      ) : (
        <>
          {awakeItems.map((item, i) => (
            <motion.div key={`cmd-${i}`} className="absolute whitespace-nowrap font-mono text-orange-400/70"
              style={{ left: `${item.left}%`, top: `${item.top}%`, fontSize: `${item.fontSize}px`, maxWidth: "40%", overflow: "hidden", textOverflow: "ellipsis" }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: [0, item.opacity, item.opacity, 0], x: [0, 5, 5, 0] }}
              transition={{ duration: item.duration, repeat: Infinity, delay: item.delay, ease: "easeInOut", times: [0, 0.2, 0.7, 1] }}
            >
              {item.message}
            </motion.div>
          ))}
          {[0, 1].map((i) => (
            <motion.div key={`vol-${i}`} className="absolute flex gap-[1px] items-end"
              style={{ [i === 0 ? "left" : "right"]: `${4 + i * 2}%`, bottom: `${8 + i * 10}%`, height: "40px" }}
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.7 }}
            >
              {[...Array(6)].map((_, j) => (
                <motion.div key={j} className="w-[3px] bg-orange-400/50"
                  animate={{ height: [6, 18, 10, 22, 8, 16] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: j * 0.12 }}
                />
              ))}
            </motion.div>
          ))}
          <motion.div className="absolute left-0 right-0 h-[1px] bg-orange-400/20" animate={{ top: ["0%", "100%", "0%"] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} />
          <motion.div className="absolute left-0 right-0 h-[1px] bg-orange-400/12" animate={{ top: ["100%", "0%", "100%"] }} transition={{ duration: 6, repeat: Infinity, ease: "linear", delay: 2 }} />
          <motion.div className="absolute top-0 bottom-0 w-[1px] bg-orange-400/15" animate={{ left: ["0%", "100%", "0%"] }} transition={{ duration: 4.5, repeat: Infinity, ease: "linear", delay: 1 }} />
          <motion.div className="absolute h-[1px] bg-orange-400/10" style={{ width: "141%", top: "-20%", left: "-20%" }}
            animate={{ top: ["-20%", "120%", "-20%"], left: ["-20%", "120%", "-20%"] }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear", delay: 0.5 }}
          />
          <motion.div className="absolute border-l-[3px] border-t-[3px] border-orange-400/40" style={{ left: "2%", top: "2%", width: "50px", height: "50px" }}
            animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div className="absolute border-r-[3px] border-b-[3px] border-orange-400/40" style={{ right: "2%", bottom: "2%", width: "50px", height: "50px" }}
            animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
        </>
      )}
    </div>
  );
}

export default function App() {
  const [response, setResponse] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isJarvisSpeaking, setIsJarvisSpeaking] = useState(false);
  const [state, setState] = useState("idle");
  const [showResponse, setShowResponse] = useState(false);
  const [hasBeenAwakened, setHasBeenAwakened] = useState(false);
  const [volume, setVolume] = useState(50);
  const [systemStats, setSystemStats] = useState({
    cpu: { percent: 0, temp: null },
    ram: { percent: 0, used: 0, total: 0, speed: null },
    gpu: { percent: null, temp: null, power: null },
    disk: { free: 0, used: 0, total: 0 },
    battery: null,
    network: { ping: null, connections: 0, totalProcesses: 0 },
    tasks: [],
    uptime: 0,
    lastWake: "Now",
  });

  const { listening, text } = useVoice();
  useMemoryCleanup();

  useEffect(() => {
    const i = setInterval(() => setIsJarvisSpeaking(checkIsSpeaking()), 100);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    let t;
    if (!isJarvisSpeaking && !isProcessing && showResponse) {
      const delay = Math.max(3000, (response?.length || 0) * 50);
      t = setTimeout(() => setShowResponse(false), delay);
    }
    return () => clearTimeout(t);
  }, [isJarvisSpeaking, isProcessing, showResponse, response]);

  useEffect(() => {
    window.socket = socket;
    return () => delete window.socket;
  }, []);

  useEffect(() => {
      let audioContext, analyser, dataArray, interval;
      const getVolume = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
          analyser = audioContext.createAnalyser();
          const source = audioContext.createMediaStreamSource(stream);
          source.connect(analyser);
          analyser.fftSize = 256;
          dataArray = new Uint8Array(analyser.frequencyBinCount);
          
          const updateVolume = () => {
            analyser.getByteFrequencyData(dataArray);
            setVolume(Math.min(100, Math.round((dataArray.reduce((a, b) => a + b) / dataArray.length / 128) * 100)));
          };
          
          interval = setInterval(updateVolume, 100);
        } catch (err) { console.log("Microphone access denied"); }
      };
      getVolume();
      
      return () => { 
        if (interval) clearInterval(interval); 
        if (audioContext) audioContext.close(); 
      };
    }, []);

  useEffect(() => {
    socket.on("response", async (d) => {
      if (!d?.text) return;
      setResponse(d.text); setShowResponse(true); setIsProcessing(true);
      const lt = d.text.toLowerCase();
      if (lt.includes("timer finished")) await speak(d.text);
      else if (lt.includes("error")) { await speakWithPersonality("errors"); await speak(d.text); }
      else if (d.text.length > 100) await speakDramatically(d.text);
      else await speak(d.text);
      setIsProcessing(false);
    });
    socket.on("sleep", () => { setState("idle"); setHasBeenAwakened(false); setShowResponse(false); setResponse(""); });
    socket.on("volume", (vol) => setVolume(vol));
    socket.on("systemStats", (stats) => setSystemStats(stats));
    return () => { 
      socket.off("response"); socket.off("sleep"); socket.off("volume"); socket.off("systemStats");
    };
  }, []);

  useEffect(() => {
    if (text && !isProcessing && !isJarvisSpeaking) {
      if (/jarvis/i.test(text)) {
        if (!hasBeenAwakened) { setHasBeenAwakened(true); setState("awake"); }
        const command = text.replace(/jarvis/i, "").trim();
        if (command) socket.emit("command", command);
      }
    }
  }, [text, isProcessing, isJarvisSpeaking]);

  const isIdle = state === "idle";

  return (
    <div className="relative min-h-screen w-full bg-[#020202] text-white overflow-hidden">
      <AnimatedBackground state={state} />
      
      {/* System Monitor - Top Right with REAL data */}
      <SystemMonitor state={state} stats={systemStats} />

      <AnimatePresence>
        {isIdle && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.5, duration: 0.8 }} className="absolute top-8 left-0 right-0 flex justify-center">
            <div className="text-center">
              <h1 className="text-3xl font-light tracking-[0.3em] text-blue-400 mb-2 whitespace-nowrap">J.A.R.V.I.S</h1>
              <p className="text-xs text-blue-400/80 tracking-[0.2em] font-light whitespace-nowrap">Just A Rather Very Intelligent System</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {isIdle ? (
          <motion.div key="idle" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ duration: 0.5 }}>
            <IdleJarvis />
          </motion.div>
        ) : (
          <motion.div key="awake" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ duration: 0.5 }}>
            <AwakeJarvis volume={volume} />
          </motion.div>
        )}
      </div>

      <div className="absolute top-[calc(50%+320px)] left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
        <AnimatePresence>
          {showResponse && !isProcessing && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }}
              className={`px-6 py-3 rounded-2xl border max-w-lg text-center backdrop-blur-sm ${isIdle ? "bg-blue-500/10 border-blue-400/20" : "bg-orange-500/10 border-orange-400/20"}`}>
              <p className={`text-sm font-light ${isIdle ? "text-blue-300/90" : "text-orange-300/90"}`}>{response}</p>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {isProcessing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-2">
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!showResponse && !isProcessing && (
        <motion.div animate={{ opacity: [0.5, 0.9, 0.5] }} transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-16 left-1/2 -translate-x-1/2 text-xs tracking-[0.4em] whitespace-nowrap">
          {isIdle ? <span className="text-blue-400/70">LISTENING FOR WAKE WORD</span> : <span className="text-orange-400/70">LISTENING FOR COMMANDS</span>}
        </motion.div>
      )}
    </div>
  );
}