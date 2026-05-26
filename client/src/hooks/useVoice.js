// useVoice.js
// Voice recognition hook with JARVIS speaking awareness and speech buffering
import { useState, useEffect, useRef } from 'react';
import { isJarvisSpeaking } from '../services/speech';

export function useVoice() {
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const recognitionRef = useRef(null);
  const shouldBeListeningRef = useRef(false);
  const restartTimeoutRef = useRef(null);
  const speechBufferRef = useRef("");
  const processingTimeoutRef = useRef(null);
  
  const SILENCE_DELAY = 1500;
  const RESTART_DELAY = 500;
  const SPEAKING_CHECK_INTERVAL = 100;

  // Processes buffered speech and emits command via socket
  const processCommand = (command) => {
    if (!command || isJarvisSpeaking()) return;
    
    console.log(`🎤 Sending command: "${command}"`);
    setText(command);
    if (window.socket) {
      window.socket.emit("command", command);
      setText("");
    }
    speechBufferRef.current = "";
  };

  // Attempts to restart speech recognition with error handling
  const attemptRestart = (recognition) => {
    if (!shouldBeListeningRef.current || isJarvisSpeaking()) return;
    
    try {
      recognition.start();
    } catch (err) {
      console.error("Failed to restart recognition:", err);
    }
  };

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn("Speech recognition not supported");
      return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log("🎤 Voice recognition started");
      setListening(true);
    };

    // Collects final speech results and buffers them before sending
    recognition.onresult = (event) => {
      if (isJarvisSpeaking()) return;
      
      let newText = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          newText += event.results[i][0].transcript + " ";
          console.log(`✅ Final: "${event.results[i][0].transcript}"`);
        }
      }
      
      if (newText) {
        speechBufferRef.current += newText;
        
        if (processingTimeoutRef.current) {
          clearTimeout(processingTimeoutRef.current);
        }
        
        // Wait for silence before processing the command
        processingTimeoutRef.current = setTimeout(() => {
          if (speechBufferRef.current.trim() && !isJarvisSpeaking()) {
            processCommand(speechBufferRef.current.trim());
          }
        }, SILENCE_DELAY);
      }
    };

    recognition.onerror = (event) => {
      console.error("Recognition error:", event.error);
      if (event.error === 'no-speech') return;
      
      if (event.error !== 'aborted') {
        setListening(false);
        if (shouldBeListeningRef.current && !isJarvisSpeaking()) {
          setTimeout(() => {
            if (shouldBeListeningRef.current && !isJarvisSpeaking()) {
              attemptRestart(recognition);
            }
          }, 1000);
        }
      }
    };

    // Handles recognition end - processes remaining buffer and restarts if needed
    recognition.onend = () => {
      console.log("Voice recognition ended");
      
      // Process any remaining buffered speech
      if (speechBufferRef.current.trim() && !isJarvisSpeaking()) {
        processCommand(speechBufferRef.current.trim());
      }
      
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      
      if (shouldBeListeningRef.current) {
        if (isJarvisSpeaking()) {
          console.log("Waiting for JARVIS to finish...");
          const checkInterval = setInterval(() => {
            if (!isJarvisSpeaking() && shouldBeListeningRef.current) {
              clearInterval(checkInterval);
              restartTimeoutRef.current = setTimeout(() => {
                attemptRestart(recognition);
              }, RESTART_DELAY);
            }
          }, 200);
        } else {
          restartTimeoutRef.current = setTimeout(() => {
            if (shouldBeListeningRef.current) {
              attemptRestart(recognition);
            }
          }, RESTART_DELAY);
        }
      }
    };

    recognitionRef.current = recognition;

    // Auto-start recognition after initial delay
    setTimeout(() => {
      if (recognitionRef.current && !isJarvisSpeaking()) {
        recognitionRef.current.start();
        shouldBeListeningRef.current = true;
        console.log("Auto-starting voice recognition...");
      }
    }, 1000);

    return () => {
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {}
      }
    };
  }, []);

  // Monitor JARVIS speaking state and pause recognition when speaking
  useEffect(() => {
    if (!recognitionRef.current) return;
    
    const checkSpeakingState = setInterval(() => {
      const isSpeaking = isJarvisSpeaking();
      const recognition = recognitionRef.current;
      
      if (isSpeaking && shouldBeListeningRef.current && recognition && listening) {
        try {
          recognition.stop();
          console.log("Paused - JARVIS is speaking");
        } catch (err) {}
      }
    }, SPEAKING_CHECK_INTERVAL);
    
    return () => clearInterval(checkSpeakingState);
  }, [listening]);

  const startListening = () => {
    if (!recognitionRef.current) return;
    shouldBeListeningRef.current = true;
    speechBufferRef.current = "";
    
    if (isJarvisSpeaking()) {
      console.log("Waiting for JARVIS to finish...");
      const waitInterval = setInterval(() => {
        if (!isJarvisSpeaking()) {
          clearInterval(waitInterval);
          startListening();
        }
      }, 500);
      return;
    }
    
    try {
      recognitionRef.current.start();
      setListening(true);
      setText("");
      console.log("Started listening");
    } catch (err) {
      console.error("Failed to start:", err);
      if (err.error !== 'invalid-state') {
        setListening(false);
        shouldBeListeningRef.current = false;
      }
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
    setText("");
    speechBufferRef.current = "";
    console.log("Stopped listening");
  };

  return { listening, text, startListening, stopListening };
}