import { useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";

export default function JarvisCore({ state = "idle", size = "large" }) {
  const sizes = { large: "w-[450px] h-[450px]", small: "w-20 h-20" };  const isAwake = state === "awake" || state === "command";
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const timeRef = useRef(0);
  const speedRef = useRef(1);
  const targetSpeedRef = useRef(1);

  const color1 = isAwake ? [249, 115, 22] : [59, 130, 246];
  const color2 = isAwake ? [251, 146, 60] : [96, 165, 250];
  const color3 = isAwake ? [253, 186, 116] : [147, 197, 253];

  // Generate geometry ONCE - never regenerates on state change
  const geometry = useMemo(() => {
    const numPoints = 200;
    const points = [];
    for (let i = 0; i < numPoints; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      points.push({
        theta,
        phi,
        baseSpeed: 0.1 + Math.random() * 0.5,
        radius: 80 + Math.random() * 40, // Will scale by canvas size later
      });
    }

    const numRings = 30;
    const rings = [];
    for (let i = 0; i < numRings; i++) {
      rings.push({
        tiltX: Math.random() * Math.PI,
        tiltY: Math.random() * Math.PI * 2,
        radius: 40 + Math.random() * 90,
        speed: 0.3 + Math.random() * 1.2,
        direction: Math.random() > 0.5 ? 1 : -1,
        segments: 60 + Math.floor(Math.random() * 40),
        opacity: 0.08 + Math.random() * 0.35,
      });
    }

    return { points, rings };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    const dpr = window.devicePixelRatio || 1;
    const parentSize = canvas.parentElement.offsetWidth;
    canvas.width = parentSize * dpr;
    canvas.height = parentSize * dpr;
    canvas.style.width = parentSize + "px";
    canvas.style.height = parentSize + "px";
    ctx.scale(dpr, dpr);

    const size = parentSize;
    const cx = size / 2;
    const cy = size / 2;

    // Update target speed based on state
    targetSpeedRef.current = isAwake ? 3 : 1;

    const animate = () => {
      // Smoothly transition speed
      speedRef.current += (targetSpeedRef.current - speedRef.current) * 0.05;
      timeRef.current += 0.005;
      const t = timeRef.current;
      const speedMultiplier = speedRef.current;

      ctx.clearRect(0, 0, size, size);

      // Draw orbit rings
      geometry.rings.forEach((ring) => {
        const segments = ring.segments;
        const scaledRadius = ring.radius * (size / 300);
        ctx.beginPath();
        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2 + t * ring.speed * ring.direction * speedMultiplier;
          const x3d = Math.cos(angle) * scaledRadius;
          const y3d = Math.sin(angle) * scaledRadius;
          const z3d = 0;

          const y1 = y3d * Math.cos(ring.tiltX) - z3d * Math.sin(ring.tiltX);
          const z1 = y3d * Math.sin(ring.tiltX) + z3d * Math.cos(ring.tiltX);
          const x2 = x3d * Math.cos(ring.tiltY) + z1 * Math.sin(ring.tiltY);

          const px = cx + x2;
          const py = cy + y1;

          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(${color2[0]}, ${color2[1]}, ${color2[2]}, ${ring.opacity * 0.6})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();

        ctx.strokeStyle = `rgba(${color1[0]}, ${color1[1]}, ${color1[2]}, ${ring.opacity * 0.2})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Draw points
      const projectedPoints = geometry.points.map((p) => {
        const scaledRadius = p.radius * (size / 300);
        const angle = p.theta + t * p.baseSpeed * speedMultiplier;
        const x3d = Math.cos(angle) * Math.sin(p.phi) * scaledRadius;
        const y3d = Math.sin(angle) * Math.sin(p.phi) * scaledRadius;
        const z3d = Math.cos(p.phi) * scaledRadius;
        
        const scale = 1 + z3d / (size * 0.5);
        return {
          x: cx + x3d * scale,
          y: cy + y3d * scale,
          z: z3d,
          brightness: Math.max(0.05, 0.3 + (z3d / (size * 0.35)) * 0.7),
        };
      });

      // Draw connections
      projectedPoints.forEach((p1, i) => {
        projectedPoints.slice(i + 1).forEach((p2) => {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < size * 0.22) {
            const alpha = Math.max(0, (1 - dist / (size * 0.22)) * 0.25 * ((p1.brightness + p2.brightness) / 2));
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${color3[0]}, ${color3[1]}, ${color3[2]}, ${alpha})`;
            ctx.lineWidth = 0.3;
            ctx.stroke();
          }
        });

        const dotRadius = Math.max(0.2, 1.5 * p1.brightness);
        const glowRadius = Math.max(0.5, 3 * p1.brightness);
        const pointAlpha = Math.max(0, p1.brightness * (speedMultiplier > 1.5 ? 0.9 : 0.5));
        
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color2[0]}, ${color2[1]}, ${color2[2]}, ${pointAlpha})`;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color1[0]}, ${color1[1]}, ${color1[2]}, ${pointAlpha * 0.25})`;
        ctx.fill();
      });

      // Core glow
      const coreGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.12);
      coreGradient.addColorStop(0, `rgba(255, 255, 255, 1)`);
      coreGradient.addColorStop(0.3, `rgba(${color3[0]}, ${color3[1]}, ${color3[2]}, 0.9)`);
      coreGradient.addColorStop(0.7, `rgba(${color1[0]}, ${color1[1]}, ${color1[2]}, 0.4)`);
      coreGradient.addColorStop(1, `rgba(${color1[0]}, ${color1[1]}, ${color1[2]}, 0)`);
      
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.fill();

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isAwake, color1, color2, color3, geometry]);

  return (
    <div className={`relative flex items-center justify-center ${sizes[size]}`}>
      <motion.div 
        animate={{ 
          scale: isAwake ? [1, 1.2, 1] : [1, 1.08, 1], 
          opacity: isAwake ? [0.2, 0.5, 0.2] : [0.08, 0.18, 0.08] 
        }} 
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} 
        className="absolute w-full h-full rounded-full blur-3xl"
        style={{ background: `rgba(${color1[0]}, ${color1[1]}, ${color1[2]}, 0.2)` }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}