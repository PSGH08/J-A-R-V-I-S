// useMemoryCleanup.js
// Periodic memory cleanup hook to prevent memory leaks in long-running sessions
import { useEffect } from "react";

export function useMemoryCleanup() {
  useEffect(() => {
    const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

    const interval = setInterval(() => {
      // Attempt browser garbage collection if available
      if (window.gc) window.gc();
      
      // Reset canvas contexts to release GPU memory
      const canvases = document.querySelectorAll("canvas");
      canvases.forEach(canvas => {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Save and restore canvas state to force texture release
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.putImageData(imageData, 0, 0);
        }
      });
    }, CLEANUP_INTERVAL);

    return () => clearInterval(interval);
  }, []);
}