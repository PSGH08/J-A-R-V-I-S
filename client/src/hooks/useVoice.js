// client/src/hooks/useVoice.js
import { useState, useEffect, useRef } from 'react';
import { isJarvisSpeaking } from '../services/speech';

export function useVoice() {
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const recognitionRef = useRef(null);
  const shouldBeListeningRef = useRef(false);
  const restartTimeoutRef = useRef(null);
  
  // Dynamic VAD state
  const speechBufferRef = useRef("");
  const isSpeakingRef = useRef(false);
  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  // Voice activity detection thresholds
  const ENERGY_THRESHOLD = 0.008; // Adjust this for sensitivity
  const MIN_SPEECH_DURATION = 300; // Minimum ms of speech to consider valid
  const MAX_SILENCE_DURATION = 800; // Max ms of silence before considering speech ended
  
  let speechStartTime = 0;
  let silenceStartTime = 0;
  let isCurrentlySpeaking = false;

  // Dynamic energy calculation from microphone
  async function setupAudioAnalysis() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      sourceRef.current.connect(analyserRef.current);
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      const analyzeAudio = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteTimeDomainData(dataArray);
        
        // Calculate RMS energy
        let rms = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const v = (dataArray[i] - 128) / 128;
          rms += v * v;
        }
        rms = Math.sqrt(rms / dataArray.length);
        
        // Dynamic threshold adjustment based on background noise
        const dynamicThreshold = ENERGY_THRESHOLD;
        
        const now = Date.now();
        
        if (rms > dynamicThreshold && !isCurrentlySpeaking) {
          // Speech STARTED
          isCurrentlySpeaking = true;
          speechStartTime = now;
          silenceStartTime = 0;
          console.log("🎤 SPEECH STARTED - energy:", rms.toFixed(4));
          
          // Resume recognition if paused
          if (recognitionRef.current && listening) {
            try {
              // Recognition should already be running
            } catch (err) {}
          }
        } 
        else if (rms <= dynamicThreshold && isCurrentlySpeaking) {
          // Possible speech ENDED - start silence timer
          if (silenceStartTime === 0) {
            silenceStartTime = now;
          } else if (now - silenceStartTime > MAX_SILENCE_DURATION) {
            // Speech definitely ended
            isCurrentlySpeaking = false;
            const speechDuration = now - speechStartTime;
            
            if (speechDuration >= MIN_SPEECH_DURATION) {
              console.log("🔇 SPEECH ENDED - duration:", speechDuration, "ms");
              console.log("📦 Processing buffered speech:", speechBufferRef.current);
              
              // Process the accumulated speech
              if (speechBufferRef.current.trim() && !isJarvisSpeaking()) {
                const finalCommand = speechBufferRef.current.trim();
                console.log(`🎤 Final command: "${finalCommand}"`);
                setText(finalCommand);
                
                if (window.socket) {
                  window.socket.emit("command", finalCommand);
                  setText("");
                }
                speechBufferRef.current = "";
              }
            } else {
              console.log("⚠️ Speech too short, ignoring");
              speechBufferRef.current = "";
            }
            
            silenceStartTime = 0;
          }
        }
        
        animationFrameRef.current = requestAnimationFrame(analyzeAudio);
      };
      
      analyzeAudio();
      console.log("🎙️ Dynamic voice activity detection active");
      
    } catch (err) {
      console.error("Failed to setup audio analysis:", err);
    }
  }

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn("Speech recognition not supported");
      return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // Don't use continuous - we'll control when to listen
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log("🎙️ Speech recognition started");
      setListening(true);
    };

    recognition.onresult = (event) => {
      if (isJarvisSpeaking()) {
        console.log("Ignoring - JARVIS is speaking");
        return;
      }
      
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      
      if (transcript) {
        console.log(`📝 Recognized: "${transcript}"`);
        // Accumulate into buffer
        if (speechBufferRef.current) {
          speechBufferRef.current += " " + transcript;
        } else {
          speechBufferRef.current = transcript;
        }
        console.log(`📦 Buffer: "${speechBufferRef.current}"`);
      }
    };

    recognition.onerror = (event) => {
      console.error("Recognition error:", event.error);
      if (event.error === 'no-speech') {
        // No speech detected by Web Speech API, but our VAD might have detected
        console.log("No speech recognized by API");
      }
    };

    recognition.onend = () => {
      console.log("🎙️ Speech recognition ended");
      
      // Auto-restart if we should be listening and not speaking
      if (shouldBeListeningRef.current && !isJarvisSpeaking() && !isCurrentlySpeaking) {
        setTimeout(() => {
          if (shouldBeListeningRef.current && !isJarvisSpeaking()) {
            try {
              recognition.start();
              console.log("🔄 Restarted speech recognition");
            } catch (err) {
              console.error("Failed to restart:", err);
            }
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;

    // Setup dynamic VAD
    setupAudioAnalysis();

    // Start recognition
    setTimeout(() => {
      if (recognitionRef.current && !isJarvisSpeaking()) {
        recognitionRef.current.start();
        shouldBeListeningRef.current = true;
        console.log("Auto-starting speech recognition...");
      }
    }, 1000);

    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {}
      }
    };
  }, []);

  // Monitor JARVIS speaking state
  useEffect(() => {
    if (!recognitionRef.current) return;
    
    const checkSpeakingState = setInterval(() => {
      const isSpeaking = isJarvisSpeaking();
      
      if (isSpeaking && shouldBeListeningRef.current) {
        // JARVIS is speaking - pause recognition
        try {
          if (recognitionRef.current && listening) {
            recognitionRef.current.stop();
            console.log("Paused - JARVIS is speaking");
          }
        } catch (err) {}
      } else if (!isSpeaking && !listening && shouldBeListeningRef.current) {
        // JARVIS finished speaking - restart recognition
        try {
          recognitionRef.current.start();
          console.log("Restarted - JARVIS finished speaking");
        } catch (err) {}
      }
    }, 500);
    
    return () => clearInterval(checkSpeakingState);
  }, [listening]);

  const startListening = () => {
    if (!recognitionRef.current) return;
    shouldBeListeningRef.current = true;
    speechBufferRef.current = "";
    isCurrentlySpeaking = false;
    
    try {
      recognitionRef.current.start();
      setListening(true);
      console.log("Started listening");
    } catch (err) {
      console.error("Failed to start:", err);
    }
  };

  const stopListening = () => {
    shouldBeListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {}
    }
    setListening(false);
    speechBufferRef.current = "";
    console.log("Stopped listening");
  };

  return { listening, text, startListening, stopListening };
}