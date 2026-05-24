import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { socket } from "../services/socket";

export default function MusicWidget() {
  const [musicState, setMusicState] = useState(null);
  const [position, setPosition] = useState({ x: window.innerWidth - 320, y: window.innerHeight - 280 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    socket.on("musicState", (data) => {
      setMusicState(data);
    });

    return () => {
      socket.off("musicState");
    };
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (e.target.closest("button")) return;
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  }, [position]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setPosition({
        x: Math.max(0, Math.min(e.clientX - dragStart.current.x, window.innerWidth - 288)),
        y: Math.max(0, Math.min(e.clientY - dragStart.current.y, window.innerHeight - 250)),
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const formatTime = (seconds) => {
    if (!seconds || seconds === Infinity || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const handleCommand = (cmd) => {
    socket.emit("musicCommand", cmd);
  };

  // Show if playing or paused, hide only if fully stopped
  if (!musicState || !musicState.playing) return null;

  const progressPercent = musicState.duration > 0 
    ? ((musicState.elapsed || 0) / musicState.duration) * 100 
    : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        style={{
          position: "fixed",
          left: position.x,
          top: position.y,
          zIndex: 100,
          cursor: isDragging ? "grabbing" : "grab",
        }}
        onMouseDown={handleMouseDown}
        className="w-72 bg-black/85 backdrop-blur-md border border-orange-400/30 rounded-xl p-4 font-mono text-xs shadow-2xl select-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${musicState.paused ? 'bg-yellow-400' : 'bg-green-400 animate-pulse'}`} />
            <span className="text-orange-400/80 tracking-wider text-[10px]">
              {musicState.paused ? "PAUSED" : "NOW PLAYING"}
            </span>
          </div>
          <button
            onClick={() => handleCommand("stop")}
            className="text-orange-400/50 hover:text-orange-400 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Song name */}
        <div className="text-white/90 text-sm font-medium truncate mb-1">
          {musicState.song?.replace(".mp3", "") || "Unknown"}
        </div>
        <div className="text-orange-400/50 text-[10px] mb-3">
          {musicState.folder === "dads" ? "Dad's Playlist" : "Tony Stark Playlist"}
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-white/10 rounded-full mb-2 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full"
            animate={{ width: `${Math.min(progressPercent, 100)}%` }}
            transition={{ duration: 0.5, ease: "linear" }}
          />
        </div>

        {/* Time */}
        <div className="flex justify-between text-[10px] text-orange-400/40 mb-3">
          <span>{formatTime(musicState.elapsed || 0)}</span>
          <span>-{formatTime(musicState.remaining || musicState.duration || 0)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-5">
          <button
            onClick={() => handleCommand("previous")}
            className="text-orange-400/60 hover:text-orange-400 transition-colors p-1"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          <button
            onClick={() => handleCommand(musicState.paused ? "resume" : "pause")}
            className="w-10 h-10 rounded-full bg-orange-400/20 border border-orange-400/40 flex items-center justify-center hover:bg-orange-400/30 transition-colors"
          >
            {musicState.paused ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-orange-400">
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-orange-400">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            )}
          </button>

          <button
            onClick={() => handleCommand("next")}
            className="text-orange-400/60 hover:text-orange-400 transition-colors p-1"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
        </div>

        <div className="text-center text-[9px] text-orange-400/30 mt-2">
          Track {musicState.queuePosition || 1} of {musicState.queueTotal || "?"} • Shuffle
        </div>
      </motion.div>
    </AnimatePresence>
  );
}