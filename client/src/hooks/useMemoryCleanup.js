import { useEffect } from "react";

export function useMemoryCleanup() {
  useEffect(() => {
    // Every 30 minutes, force a mini cleanup
    const interval = setInterval(() => {
      // Clear any detached DOM nodes
      if (window.gc) window.gc();
      
      // Reset canvas contexts to release GPU memory
      const canvases = document.querySelectorAll("canvas");
      console.log(`Memory cleanup: ${canvases.length} canvases found`);
      canvases.forEach(canvas => {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Save current state
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          // Clear and restore (forces texture release)
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.putImageData(imageData, 0, 0);
        }
      });
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, []);
}