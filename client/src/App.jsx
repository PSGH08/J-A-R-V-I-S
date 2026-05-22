import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
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
  }, [state]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
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

      {isIdle && (
        <>
          <div className="flex justify-between mt-1"><span>Uptime</span><span>{formatUptime(stats.uptime)}</span></div>
          <div className="flex justify-between"><span>Network</span><span>{stats.network?.ping ? `${stats.network.ping}ms` : "Connected"}</span></div>
          <div className="flex justify-between"><span>Last Wake</span><span>{stats.lastWake || "Now"}</span></div>
          {stats.battery && <div className="flex justify-between"><span>Battery</span><span>{stats.battery}%</span></div>}
          <div className="flex justify-between">
            <span>Disk</span>
            <span>
              {stats.disk && Object.keys(stats.disk).length > 0 
                ? Object.entries(stats.disk).map(([drive, info]) => `${drive}: ${info.free}GB`).join(' | ')
                : "N/A"}
            </span>
          </div>
        </>
      )}

      {!isIdle && (
        <>
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

function AnimatedBackground({ state, showCamera }) {
  if (showCamera) return null;

  const isIdle = state === "idle";
  const hour = new Date().getHours();
  const hueShift = hour < 6 ? -8 : hour < 12 ? 0 : hour < 18 ? 8 : -4;

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
    return Array.from({ length: 12 }).map((_, i) => ({
      message: idleMessages[i % idleMessages.length],
      left: Math.random() < 0.5 ? 2 + Math.random() * 30 : 68 + Math.random() * 30,
      top: Math.random() < 0.5 ? 2 + Math.random() * 30 : 68 + Math.random() * 30,
      delay: Math.random() * 8, duration: 6 + Math.random() * 8,
      fontSize: 10 + Math.random() * 6, opacity: 0.15 + Math.random() * 0.2,
    }));
  }, [idleMessages]);

  const awakeItems = useMemo(() => {
    return Array.from({ length: 3 }).map((_, i) => ({
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

  const neuralNodes = useMemo(() => {
      // Create a connected network of nodes in corners, away from center
      const nodes = [];
      
      // Top left cluster - 3 nodes forming a triangle
      nodes.push({ x1: 8, y1: 10, x2: 18, y2: 8, delay: 0, duration: 2.5 });
      nodes.push({ x1: 18, y1: 8, x2: 22, y2: 18, delay: 0.8, duration: 2.5 });
      nodes.push({ x1: 22, y1: 18, x2: 8, y2: 10, delay: 1.6, duration: 2.5 });
      
      // Top right cluster - 3 nodes forming a triangle
      nodes.push({ x1: 78, y1: 8, x2: 88, y2: 6, delay: 0.3, duration: 3 });
      nodes.push({ x1: 88, y1: 6, x2: 92, y2: 16, delay: 1.1, duration: 3 });
      nodes.push({ x1: 92, y1: 16, x2: 78, y2: 8, delay: 1.9, duration: 3 });
      
      // Bottom left cluster - 3 nodes
      nodes.push({ x1: 6, y1: 78, x2: 16, y2: 82, delay: 0.5, duration: 2.8 });
      nodes.push({ x1: 16, y1: 82, x2: 10, y2: 92, delay: 1.3, duration: 2.8 });
      nodes.push({ x1: 10, y1: 92, x2: 6, y2: 78, delay: 2.1, duration: 2.8 });
      
      // Bottom right cluster - 3 nodes
      nodes.push({ x1: 82, y1: 80, x2: 92, y2: 78, delay: 0.7, duration: 3.2 });
      nodes.push({ x1: 92, y1: 78, x2: 90, y2: 90, delay: 1.5, duration: 3.2 });
      nodes.push({ x1: 90, y1: 90, x2: 82, y2: 80, delay: 2.3, duration: 3.2 });
      
      // Cross connections between clusters (top-left to top-right, etc.)
      nodes.push({ x1: 22, y1: 14, x2: 78, y2: 8, delay: 0.2, duration: 4 });
      nodes.push({ x1: 8, y1: 14, x2: 6, y2: 78, delay: 0.9, duration: 4 });
      nodes.push({ x1: 92, y1: 12, x2: 88, y2: 80, delay: 1.7, duration: 4 });
      nodes.push({ x1: 14, y1: 88, x2: 82, y2: 82, delay: 2.5, duration: 4 });
      
      return nodes;
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
          {/* Circuit board with core cutout - combined in one SVG with mask */}
          <svg className="absolute inset-0 opacity-[0.065]" width="100%" height="100%">
            <defs>
              <mask id="coreCutout">
                <rect width="100%" height="100%" fill="white" />
                <circle cx="50%" cy="50%" r="17%" fill="black" />
              </mask>
              
              <pattern id="circuit" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
                <path d="M0 100 L60 100 L70 80 L90 80 L100 100 L200 100" fill="none" stroke="#fb923c" strokeWidth="1.5" />
                <path d="M100 0 L100 60 L80 70 L80 130 L100 140 L100 200" fill="none" stroke="#fb923c" strokeWidth="1.5" />
                <path d="M0 40 L50 40 L55 50 L80 50" fill="none" stroke="#fb923c" strokeWidth="0.7" />
                <path d="M120 150 L150 150 L160 140 L200 140" fill="none" stroke="#fb923c" strokeWidth="0.7" />
                <path d="M0 160 L40 160 L45 170 L70 170" fill="none" stroke="#fb923c" strokeWidth="0.5" opacity="0.6" />
                <path d="M130 30 L170 30 L175 40 L200 40" fill="none" stroke="#fb923c" strokeWidth="0.5" opacity="0.6" />
                <path d="M40 0 L40 30 L50 40 L50 80" fill="none" stroke="#fb923c" strokeWidth="0.7" />
                <path d="M160 120 L160 150 L150 160 L150 200" fill="none" stroke="#fb923c" strokeWidth="0.7" />
                <path d="M20 60 L20 90 L30 100 L30 140" fill="none" stroke="#fb923c" strokeWidth="0.5" opacity="0.6" />
                <path d="M180 60 L180 80 L170 90 L170 120" fill="none" stroke="#fb923c" strokeWidth="0.5" opacity="0.6" />
                <path d="M60 20 L70 30 L80 30" fill="none" stroke="#fb923c" strokeWidth="0.4" opacity="0.5" />
                <path d="M120 170 L130 160 L140 160" fill="none" stroke="#fb923c" strokeWidth="0.4" opacity="0.5" />
                <circle cx="100" cy="100" r="3" fill="none" stroke="#fb923c" strokeWidth="1.5" />
                <circle cx="100" cy="100" r="1.5" fill="#fb923c" opacity="0.8" />
                <circle cx="60" cy="100" r="2.5" fill="none" stroke="#fb923c" strokeWidth="1" /><circle cx="60" cy="100" r="1.2" fill="#fb923c" opacity="0.6" />
                <circle cx="140" cy="100" r="2.5" fill="none" stroke="#fb923c" strokeWidth="1" /><circle cx="140" cy="100" r="1.2" fill="#fb923c" opacity="0.6" />
                <circle cx="100" cy="60" r="2.5" fill="none" stroke="#fb923c" strokeWidth="1" /><circle cx="100" cy="60" r="1.2" fill="#fb923c" opacity="0.6" />
                <circle cx="100" cy="140" r="2.5" fill="none" stroke="#fb923c" strokeWidth="1" /><circle cx="100" cy="140" r="1.2" fill="#fb923c" opacity="0.6" />
                <circle cx="50" cy="40" r="1.8" fill="none" stroke="#fb923c" strokeWidth="0.8" /><circle cx="50" cy="40" r="0.8" fill="#fb923c" opacity="0.5" />
                <circle cx="150" cy="160" r="1.8" fill="none" stroke="#fb923c" strokeWidth="0.8" /><circle cx="150" cy="160" r="0.8" fill="#fb923c" opacity="0.5" />
                <circle cx="40" cy="160" r="1.8" fill="none" stroke="#fb923c" strokeWidth="0.8" /><circle cx="40" cy="160" r="0.8" fill="#fb923c" opacity="0.5" />
                <circle cx="160" cy="30" r="1.8" fill="none" stroke="#fb923c" strokeWidth="0.8" /><circle cx="160" cy="30" r="0.8" fill="#fb923c" opacity="0.5" />
                <rect x="70" y="70" width="60" height="8" rx="1" fill="none" stroke="#fb923c" strokeWidth="0.6" opacity="0.5" />
                <rect x="70" y="82" width="60" height="8" rx="1" fill="none" stroke="#fb923c" strokeWidth="0.6" opacity="0.5" />
                <rect x="70" y="110" width="60" height="8" rx="1" fill="none" stroke="#fb923c" strokeWidth="0.6" opacity="0.5" />
                <rect x="70" y="122" width="60" height="8" rx="1" fill="none" stroke="#fb923c" strokeWidth="0.6" opacity="0.5" />
                <rect x="35" y="95" width="4" height="2" fill="#fb923c" opacity="0.4" /><rect x="42" y="95" width="4" height="2" fill="#fb923c" opacity="0.4" />
                <rect x="155" y="105" width="4" height="2" fill="#fb923c" opacity="0.4" /><rect x="162" y="105" width="4" height="2" fill="#fb923c" opacity="0.4" />
              </pattern>

              <pattern id="components" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
                <rect x="85" y="85" width="30" height="30" rx="2" fill="none" stroke="#fb923c" strokeWidth="1.2" />
                <rect x="85" y="85" width="30" height="30" rx="2" fill="#fb923c" opacity="0.08" />
                {[0,1,2,3,4].map(i => (<React.Fragment key={`pt-${i}`}><rect x={90+i*5} y="82" width="2" height="3" fill="#fb923c" opacity="0.7" /><rect x={90+i*5} y="115" width="2" height="3" fill="#fb923c" opacity="0.7" /></React.Fragment>))}
                {[0,1,2,3,4].map(i => (<React.Fragment key={`ps-${i}`}><rect x="82" y={90+i*5} width="3" height="2" fill="#fb923c" opacity="0.7" /><rect x="115" y={90+i*5} width="3" height="2" fill="#fb923c" opacity="0.7" /></React.Fragment>))}
                <circle cx="88" cy="88" r="2" fill="#fb923c" opacity="0.6" />
                <rect x="20" y="20" width="40" height="12" rx="1" fill="none" stroke="#fb923c" strokeWidth="0.8" />
                <rect x="20" y="20" width="40" height="12" rx="1" fill="#fb923c" opacity="0.05" />
                {[0,1,2,3,4,5,6,7].map(i => (<rect key={`rm-${i}`} x={22+i*5} y="19" width="1.5" height="2" fill="#fb923c" opacity="0.6" />))}
                {[0,1,2,3].map(i => (<rect key={`rc-${i}`} x={23+i*9} y="23" width="6" height="4" fill="none" stroke="#fb923c" strokeWidth="0.5" opacity="0.5" />))}
                <rect x="140" y="150" width="22" height="22" rx="1" fill="none" stroke="#fb923c" strokeWidth="1" />
                <rect x="140" y="150" width="22" height="22" rx="1" fill="#fb923c" opacity="0.06" />
                {[0,1,2,3].map(i => (<React.Fragment key={`gp-${i}`}><rect x={143+i*5} y="148" width="1.5" height="2" fill="#fb923c" opacity="0.6" /><rect x={143+i*5} y="172" width="1.5" height="2" fill="#fb923c" opacity="0.6" /></React.Fragment>))}
                <circle cx="55" cy="145" r="3" fill="none" stroke="#fb923c" strokeWidth="0.8" /><circle cx="55" cy="145" r="2" fill="#fb923c" opacity="0.3" />
                <circle cx="145" cy="55" r="3" fill="none" stroke="#fb923c" strokeWidth="0.8" /><circle cx="145" cy="55" r="2" fill="#fb923c" opacity="0.3" />
                <rect x="30" y="135" width="8" height="3" fill="none" stroke="#fb923c" strokeWidth="0.6" />
                <line x1="26" y1="136.5" x2="30" y2="136.5" stroke="#fb923c" strokeWidth="0.4" />
                <line x1="38" y1="136.5" x2="42" y2="136.5" stroke="#fb923c" strokeWidth="0.4" />
                <rect x="162" y="65" width="8" height="3" fill="none" stroke="#fb923c" strokeWidth="0.6" />
                <line x1="158" y1="66.5" x2="162" y2="66.5" stroke="#fb923c" strokeWidth="0.4" />
                <line x1="170" y1="66.5" x2="174" y2="66.5" stroke="#fb923c" strokeWidth="0.4" />
                <rect x="135" y="130" width="10" height="6" fill="none" stroke="#fb923c" strokeWidth="0.5" />
                {[0,1,2].map(i => (<line key={`co-${i}`} x1={136+i*3} y1="130" x2={136+i*3} y2="136" stroke="#fb923c" strokeWidth="0.3" opacity="0.5" />))}
                <circle cx="25" cy="60" r="1.5" fill="none" stroke="#fb923c" strokeWidth="0.6" />
                <circle cx="175" cy="140" r="1.5" fill="none" stroke="#fb923c" strokeWidth="0.6" />
                <circle cx="60" cy="25" r="1.5" fill="none" stroke="#fb923c" strokeWidth="0.6" />
                <circle cx="140" cy="175" r="1.5" fill="none" stroke="#fb923c" strokeWidth="0.6" />
                <path d="M60 32 L60 135 L38 136.5" fill="none" stroke="#fb923c" strokeWidth="0.4" opacity="0.5" />
                <path d="M140 55 L145 58 L145 65 L170 66.5" fill="none" stroke="#fb923c" strokeWidth="0.4" opacity="0.5" />
                <path d="M151 172 L151 180 L140 180 L140 175" fill="none" stroke="#fb923c" strokeWidth="0.4" opacity="0.5" />
              </pattern>

              <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="0.3" fill="#fb923c" opacity="0.15" />
              </pattern>
            </defs>
            
            <rect width="100%" height="100%" fill="url(#circuit)" mask="url(#coreCutout)" />
            <rect width="100%" height="100%" fill="url(#components)" mask="url(#coreCutout)" />
          </svg>

          {/* Commands */}
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

          {/* Corner brackets */}
          <motion.div className="absolute border-l-[3px] border-t-[3px] border-orange-400/40" style={{ left: "2%", top: "2%", width: "50px", height: "50px" }}
            animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div className="absolute border-r-[3px] border-b-[3px] border-orange-400/40" style={{ right: "2%", bottom: "2%", width: "50px", height: "50px" }}
            animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />

          {/* 2. Neural network - connected pulsing nodes via SVG */}
          <svg className="absolute inset-0" width="100%" height="100%">
            {neuralNodes.map((node, i) => (
              <React.Fragment key={`neural-svg-${i}`}>
                {/* Connecting line */}
                <motion.line
                  x1={`${node.x1}%`} y1={`${node.y1}%`}
                  x2={`${node.x2}%`} y2={`${node.y2}%`}
                  stroke="rgba(251,146,60,0.4)"
                  strokeWidth="1"
                  animate={{ opacity: [0.2, 0.6, 0.2] }}
                  transition={{ duration: node.duration + 1, repeat: Infinity, delay: node.delay }}
                />
                {/* Node 1 */}
                <motion.circle
                  cx={`${node.x1}%`} cy={`${node.y1}%`} r="3"
                  fill="rgba(251,146,60,0.7)"
                  animate={{ r: [3, 5, 3], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: node.duration, repeat: Infinity, delay: node.delay }}
                />
                {/* Node 2 */}
                <motion.circle
                  cx={`${node.x2}%`} cy={`${node.y2}%`} r="3"
                  fill="rgba(251,146,60,0.7)"
                  animate={{ r: [3, 5, 3], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: node.duration, repeat: Infinity, delay: node.delay + 0.3 }}
                />
              </React.Fragment>
            ))}
          </svg>

          {/* 3. Time-synced color indicator */}
          <motion.div className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] font-mono text-orange-400/30"
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            {hour < 6 ? "NIGHT MODE" : hour < 12 ? "MORNING CYCLE" : hour < 18 ? "DAY OPERATIONS" : "EVENING PROTOCOL"}
          </motion.div>

          {/* 5. Status indicators - bottom left */}
          <motion.div className="absolute bottom-3 left-3 flex gap-3 text-[9px] font-mono"
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400/80 animate-pulse" />
              <span className="text-green-400/60">ONLINE</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400/80" />
              <span className="text-green-400/60">SECURE</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400/80 animate-pulse" />
              <span className="text-yellow-400/60">ACTIVE</span>
            </span>
          </motion.div>
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

  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);

  const { listening, text } = useVoice();
  useMemoryCleanup();

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
      setCameraStream(stream);
      setShowCamera(true);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
    } catch (err) { console.error("Camera access denied:", err); }
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraStream) { cameraStream.getTracks().forEach(track => track.stop()); setCameraStream(null); }
    setShowCamera(false);
  }, [cameraStream]);

  useEffect(() => { const i = setInterval(() => setIsJarvisSpeaking(checkIsSpeaking()), 100); return () => clearInterval(i); }, []);

  useEffect(() => {
    let t;
    if (!isJarvisSpeaking && !isProcessing && showResponse) {
      const delay = Math.max(3000, (response?.length || 0) * 50);
      t = setTimeout(() => setShowResponse(false), delay);
    }
    return () => clearTimeout(t);
  }, [isJarvisSpeaking, isProcessing, showResponse, response]);

  useEffect(() => { window.socket = socket; return () => delete window.socket; }, []);

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
    socket.on("sleep", () => { setState("idle"); setHasBeenAwakened(false); setShowResponse(false); setResponse(""); stopCamera(); });
    socket.on("volume", (vol) => setVolume(vol));
    socket.on("systemStats", (stats) => setSystemStats(stats));
    socket.on("showCamera", () => { if (state === "awake") startCamera(); });
    socket.on("hideCamera", () => stopCamera());
    return () => {
      socket.off("response"); socket.off("sleep"); socket.off("volume"); socket.off("systemStats");
      socket.off("showCamera"); socket.off("hideCamera");
    };
  }, [startCamera, stopCamera, state]);

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
    <div className="relative min-h-screen w-full bg-[#020202] text-white overflow-hidden select-none">
      <AnimatedBackground state={state} showCamera={showCamera} />

      <AnimatePresence>
        {!showCamera && <SystemMonitor state={state} stats={systemStats} />}
      </AnimatePresence>

      <AnimatePresence>
        {isIdle && !showCamera && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.5, duration: 0.8 }} className="absolute top-8 left-0 right-0 flex justify-center">
            <div className="text-center">
              <h1 className="text-3xl font-light tracking-[0.3em] text-blue-400 mb-2 whitespace-nowrap">J.A.R.V.I.S</h1>
              <p className="text-xs text-blue-400/80 tracking-[0.2em] font-light whitespace-nowrap">Just A Rather Very Intelligent System</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showCamera && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          {isIdle ? (
            <motion.div key="idle" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
              <IdleJarvis />
            </motion.div>
          ) : (
            <motion.div key="awake" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
              <AwakeJarvis volume={volume} />
            </motion.div>
          )}
        </div>
      )}

      {showCamera && (
        <>
          <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 0.68 }} transition={{ duration: 0.5 }} className="absolute bottom-8 right-8 z-40" style={{ transformOrigin: 'bottom right' }}>
            <AwakeJarvis volume={volume} />
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.5 }} className="absolute inset-0 z-20 flex items-center justify-center">
            <div className="relative w-[90%] max-w-[1200px] aspect-video rounded-2xl overflow-hidden border border-orange-400/30" style={{ boxShadow: "inset 0 0 120px 60px rgba(0,0,0,0.8), 0 0 60px rgba(251,146,60,0.15)" }}>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover pointer-events-none" />
              <div className="absolute top-0 left-0 w-10 h-10 border-l-[3px] border-t-[3px] border-orange-400/40" />
              <div className="absolute top-0 right-0 w-10 h-10 border-r-[3px] border-t-[3px] border-orange-400/40" />
              <div className="absolute bottom-0 left-0 w-10 h-10 border-l-[3px] border-b-[3px] border-orange-400/40" />
              <div className="absolute bottom-0 right-0 w-10 h-10 border-r-[3px] border-b-[3px] border-orange-400/40" />
            </div>
          </motion.div>
        </>
      )}

      <div className="absolute top-[calc(50%+320px)] left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
        <AnimatePresence>
          {showResponse && !isProcessing && !showCamera && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }}
              className={`px-6 py-3 rounded-2xl border max-w-lg text-center backdrop-blur-sm ${isIdle ? "bg-blue-500/10 border-blue-400/20" : "bg-orange-500/10 border-orange-400/20"}`}>
              <p className={`text-sm font-light select-none ${isIdle ? "text-blue-300/90" : "text-orange-300/90"}`}>{response}</p>
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

      {!showResponse && !isProcessing && !showCamera && (
        <motion.div animate={{ opacity: [0.5, 0.9, 0.5] }} transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-16 left-1/2 -translate-x-1/2 text-xs tracking-[0.4em] whitespace-nowrap">
          {isIdle ? <span className="text-blue-400/70">LISTENING FOR WAKE WORD</span> : <span className="text-orange-400/70">LISTENING FOR COMMANDS</span>}
        </motion.div>
      )}
    </div>
  );
}