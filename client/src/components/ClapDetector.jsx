// client/src/components/ClapDetector.jsx
import { useEffect, useRef, useCallback } from "react";
import { socket } from "../services/socket";

export default function ClapDetector() {
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);
  
  const CLAP_THRESHOLD = 0.7;
  const CLAP_MIN_FREQUENCY = 800;
  const CLAP_MAX_FREQUENCY = 5000;
  const COOLDOWN_MS = 300;
  const CLAP_TIMEOUT = 1000;

  const clapState = useRef({
    lastSpikeTime: 0,
    clapCount: 0,
    lastClapTime: 0
  });

  const detectClap = useCallback((dataArray, sampleRate) => {
    const now = Date.now();
    const state = clapState.current;
    
    if (now - state.lastClapTime > CLAP_TIMEOUT) {
      state.clapCount = 0;
    }
    
    if (now - state.lastSpikeTime < COOLDOWN_MS) return;
    
    const binSize = sampleRate / dataArray.length;
    const startBin = Math.floor(CLAP_MIN_FREQUENCY / binSize);
    const endBin = Math.floor(CLAP_MAX_FREQUENCY / binSize);
    
    let energy = 0;
    for (let i = startBin; i <= endBin && i < dataArray.length; i++) {
      energy += dataArray[i] / 255;
    }
    energy /= (endBin - startBin + 1);
    
    if (energy > CLAP_THRESHOLD) {
      state.lastSpikeTime = now;
      state.clapCount++;
      state.lastClapTime = now;
      
      console.log(`👏 Clap ${state.clapCount}! Energy: ${energy.toFixed(3)}`);
      
      if (state.clapCount >= 2) {
        state.clapCount = 0;
        console.log("👏👏 DOUBLE CLAP! Waking Jarvis...");
        socket.emit("clapWakeUp");
      }
    }
  }, []);

  const startListening = useCallback(async () => {
    try {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        await audioContextRef.current.close();
      }
      
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      
      streamRef.current = stream;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.2;
      
      source.connect(analyserRef.current);
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const checkAudio = () => {
        analyserRef.current.getByteFrequencyData(dataArray);
        detectClap(dataArray, audioContextRef.current.sampleRate);
        animationFrameRef.current = requestAnimationFrame(checkAudio);
      };
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      checkAudio();
      console.log("👂 Clap detection active - double clap to wake Jarvis");
    } catch (err) {
      console.error("Microphone error:", err);
      setTimeout(startListening, 3000);
    }
  }, [detectClap]);

  useEffect(() => {
    startListening();
    
    const resumeAudio = () => {
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
    };
    
    document.addEventListener('click', resumeAudio);
    document.addEventListener('keydown', resumeAudio);
    document.addEventListener('touchstart', resumeAudio);
    
    return () => {
      document.removeEventListener('click', resumeAudio);
      document.removeEventListener('keydown', resumeAudio);
      document.removeEventListener('touchstart', resumeAudio);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [startListening]);

  return null;
}