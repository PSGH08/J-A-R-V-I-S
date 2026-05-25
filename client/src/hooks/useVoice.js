import { useState, useEffect, useRef } from 'react';
import { isJarvisSpeaking } from '../services/speech';

export function useVoice() {
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const recognitionRef = useRef(null);
  const shouldBeListeningRef = useRef(false);
  const restartTimeoutRef = useRef(null);

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
      console.log("Voice recognition started");
      setListening(true);
    };

    recognition.onresult = (event) => {
      // Ignore results when JARVIS is speaking
      if (isJarvisSpeaking()) {
        console.log("Ignoring voice input - JARVIS is speaking");
        return;
      }
      
      let interim = "";
      let final = "";
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      
      const finalText = final || interim;
      if (finalText && !isJarvisSpeaking()) {
        console.log(`Heard: "${finalText}"`);
        setText(finalText);
        
        // Send EVERYTHING to socket - backend will handle wake word
        if (final && window.socket) {
          console.log(`Sending to backend: "${finalText}"`);
          window.socket.emit("command", finalText);
          setText(""); // Clear after sending
        }
      }
    };

    recognition.onerror = (event) => {
      console.error("Recognition error:", event.error);
      if (event.error === 'no-speech' && isJarvisSpeaking()) {
        return;
      }
      if (event.error !== 'aborted') {
        setListening(false);
        // Try to restart if we should still be listening
        if (shouldBeListeningRef.current && !isJarvisSpeaking()) {
          setTimeout(() => {
            if (shouldBeListeningRef.current && !isJarvisSpeaking()) {
              try {
                recognition.start();
              } catch (err) {
                console.error("Failed to restart after error:", err);
              }
            }
          }, 1000);
        }
      }
    };

    recognition.onend = () => {
      console.log("Voice recognition ended");
      
      // Clear any pending restart
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      
      // Always restart if we should be listening
      if (shouldBeListeningRef.current) {
        // If JARVIS is speaking, wait for it to finish
        if (isJarvisSpeaking()) {
          console.log("Waiting for JARVIS to finish speaking before restarting...");
          const checkInterval = setInterval(() => {
            if (!isJarvisSpeaking() && shouldBeListeningRef.current) {
              clearInterval(checkInterval);
              restartTimeoutRef.current = setTimeout(() => {
                try {
                  recognition.start();
                } catch (err) {
                  console.error("Failed to restart:", err);
                }
              }, 500);
            }
          }, 200);
        } else {
          // Restart immediately
          restartTimeoutRef.current = setTimeout(() => {
            try {
              if (shouldBeListeningRef.current) {
                recognition.start();
              }
            } catch (err) {
              console.error("Failed to restart:", err);
            }
          }, 500);
        }
      }
    };

    recognitionRef.current = recognition;

    setTimeout(() => {
      if (recognitionRef.current && !isJarvisSpeaking()) {
        recognitionRef.current.start();
        shouldBeListeningRef.current = true;
        console.log("Auto-starting voice recognition...");
      }
    }, 1000);

    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          // Ignore
        }
      }
    };
  }, []);

  // Monitor JARVIS speaking state
  useEffect(() => {
    if (!recognitionRef.current) return;
    
    const checkSpeakingState = setInterval(() => {
      const isSpeaking = isJarvisSpeaking();
      const recognition = recognitionRef.current;
      
      if (isSpeaking && shouldBeListeningRef.current) {
        // JARVIS is speaking - stop recognition temporarily
        try {
          if (recognition && listening) {
            recognition.stop();
            console.log("Paused microphone - JARVIS is speaking");
          }
        } catch (err) {
          // Ignore errors
        }
      }
    }, 100);
    
    return () => clearInterval(checkSpeakingState);
  }, [listening]);

  const startListening = () => {
    if (!recognitionRef.current) return;
    
    shouldBeListeningRef.current = true;
    
    // If JARVIS is speaking, wait for it to finish
    if (isJarvisSpeaking()) {
      console.log("Waiting for JARVIS to finish speaking before starting...");
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
      console.log("Started listening for commands");
    } catch (err) {
      console.error("Failed to start recognition:", err);
      // If already started, that's fine
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
      } catch (err) {
        console.error("Failed to stop recognition:", err);
      }
    }
    setListening(false);
    setText("");
    console.log("Stopped listening");
  };

  return { listening, text, startListening, stopListening };
}