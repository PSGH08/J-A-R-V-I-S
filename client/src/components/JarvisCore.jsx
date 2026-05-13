import { useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";

export default function JarvisCore({ state = "idle", size = "large" }) {
  const sizes = { large: "w-[600px] h-[600px]", small: "w-20 h-20" };  
  const isAwake = state === "awake" || state === "command";
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const timeRef = useRef(0);
  const speedRef = useRef(1);
  const targetSpeedRef = useRef(1);

  const color1 = isAwake ? [249, 115, 22] : [59, 130, 246];
  const color2 = isAwake ? [251, 146, 60] : [96, 165, 250];
  const color3 = isAwake ? [253, 186, 116] : [147, 197, 253];

  const geometry = useMemo(() => {
    const numPoints = 250;
    const points = [];
    for (let i = 0; i < numPoints; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      points.push({
        theta,
        phi,
        baseSpeed: 0.1 + Math.random() * 0.5,
        radius: 60 + Math.random() * 60,
        drift: Math.random() > 0.7 ? (Math.random() - 0.5) * 30 : 0,
      });
    }

    const rings = [];
    
    // Main rings with imperfection
    for (let i = 0; i < 50; i++) {
      const completeness = 0.4 + Math.random() * 0.6;
      const startOffset = Math.random() * Math.PI * 2;
      
      rings.push({
        tiltX: Math.random() * Math.PI,
        tiltY: Math.random() * Math.PI * 2,
        radius: 35 + Math.random() * 100,
        speed: 0.3 + Math.random() * 1.5,
        direction: Math.random() > 0.5 ? 1 : -1,
        segments: 40 + Math.floor(Math.random() * 60),
        opacity: 0.06 + Math.random() * 0.4,
        lineWidth: 0.3 + Math.random() * 1.2,
        completeness,
        startOffset,
        wobble: Math.random() > 0.6 ? (Math.random() - 0.5) * 0.3 : 0,
      });
    }

    // Inner denser rings
    for (let i = 0; i < 15; i++) {
      const completeness = 0.5 + Math.random() * 0.5;
      const startOffset = Math.random() * Math.PI * 2;
      
      rings.push({
        tiltX: Math.random() * Math.PI,
        tiltY: Math.random() * Math.PI * 2,
        radius: 15 + Math.random() * 40,
        speed: 0.5 + Math.random() * 2,
        direction: Math.random() > 0.5 ? 1 : -1,
        segments: 30 + Math.floor(Math.random() * 50),
        opacity: 0.1 + Math.random() * 0.5,
        lineWidth: 0.2 + Math.random() * 0.8,
        completeness,
        startOffset,
        wobble: Math.random() > 0.5 ? (Math.random() - 0.5) * 0.4 : 0,
      });
    }

    // Scattered arc fragments
    for (let i = 0; i < 20; i++) {
      rings.push({
        tiltX: Math.random() * Math.PI,
        tiltY: Math.random() * Math.PI * 2,
        radius: 50 + Math.random() * 80,
        speed: 0.2 + Math.random() * 1,
        direction: Math.random() > 0.5 ? 1 : -1,
        segments: 8 + Math.floor(Math.random() * 15),
        opacity: 0.15 + Math.random() * 0.5,
        lineWidth: 0.8 + Math.random() * 2,
        completeness: 0.15 + Math.random() * 0.25,
        startOffset: Math.random() * Math.PI * 2,
        wobble: Math.random() > 0.4 ? (Math.random() - 0.5) * 0.6 : 0,
      });
    }

    return { points, rings };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const parentSize = canvas.parentElement.offsetWidth;
    canvas.width = parentSize * dpr;
    canvas.height = parentSize * dpr;
    canvas.style.width = parentSize + "px";
    canvas.style.height = parentSize + "px";
    ctx.scale(dpr, dpr);

    const size = parentSize;
    const cx = size / 2;
    const cy = size / 2;

    targetSpeedRef.current = isAwake ? 3 : 1;

    const animate = () => {
      speedRef.current += (targetSpeedRef.current - speedRef.current) * 0.05;
      timeRef.current += 0.005;
      const t = timeRef.current;
      const speedMultiplier = speedRef.current;

      const globalRotX = t * 0.3 * speedMultiplier;
      const globalRotY = t * 0.4 * speedMultiplier;
      const globalRotZ = t * 0.2 * speedMultiplier;

      ctx.clearRect(0, 0, size, size);

      // Draw orbit rings with imperfections
      geometry.rings.forEach((ring) => {
        const segments = ring.segments;
        const scaledRadius = ring.radius * (size / 300);
        const totalAngle = Math.PI * 2 * ring.completeness;
        const wobbleAmp = ring.wobble * scaledRadius * 0.3;
        
        ctx.beginPath();
        let firstPoint = true;
        
        for (let i = 0; i <= segments; i++) {
          const progress = i / segments;
          const angle = ring.startOffset + progress * totalAngle + t * ring.speed * ring.direction * speedMultiplier;
          
          const wobbleOffset = Math.sin(progress * Math.PI * 8 + t * 3) * wobbleAmp;
          const currentRadius = scaledRadius + wobbleOffset;
          
          let x3d = Math.cos(angle) * currentRadius;
          let y3d = Math.sin(angle) * currentRadius;
          let z3d = 0;

          let y1 = y3d * Math.cos(ring.tiltX) - z3d * Math.sin(ring.tiltX);
          let z1 = y3d * Math.sin(ring.tiltX) + z3d * Math.cos(ring.tiltX);
          let x2 = x3d * Math.cos(ring.tiltY) + z1 * Math.sin(ring.tiltY);
          let z2 = -x3d * Math.sin(ring.tiltY) + z1 * Math.cos(ring.tiltY);
          let y2 = y1;

          let gy = y2 * Math.cos(globalRotX) - z2 * Math.sin(globalRotX);
          let gz = y2 * Math.sin(globalRotX) + z2 * Math.cos(globalRotX);
          let gx = x2 * Math.cos(globalRotY) + gz * Math.sin(globalRotY);
          gz = -x2 * Math.sin(globalRotY) + gz * Math.cos(globalRotY);
          let fx = gx * Math.cos(globalRotZ) - gy * Math.sin(globalRotZ);
          let fy = gx * Math.sin(globalRotZ) + gy * Math.cos(globalRotZ);

          const px = cx + fx;
          const py = cy + fy;

          if (firstPoint) {
            ctx.moveTo(px, py);
            firstPoint = false;
          } else {
            ctx.lineTo(px, py);
          }
        }
        
        if (ring.completeness > 0.95) {
          ctx.closePath();
        }
        
        ctx.strokeStyle = `rgba(${color2[0]}, ${color2[1]}, ${color2[2]}, ${ring.opacity * 0.6})`;
        ctx.lineWidth = ring.lineWidth * 0.5;
        ctx.stroke();

        ctx.strokeStyle = `rgba(${color1[0]}, ${color1[1]}, ${color1[2]}, ${ring.opacity * 0.15})`;
        ctx.lineWidth = ring.lineWidth * 1.5;
        ctx.stroke();
      });

      // Draw points
      const projectedPoints = geometry.points.map((p) => {
        const scaledRadius = (p.radius + p.drift * Math.sin(t * 2 + p.theta)) * (size / 300);
        const angle = p.theta + t * p.baseSpeed * speedMultiplier;
        let x3d = Math.cos(angle) * Math.sin(p.phi) * scaledRadius;
        let y3d = Math.sin(angle) * Math.sin(p.phi) * scaledRadius;
        let z3d = Math.cos(p.phi) * scaledRadius;
        
        let gy = y3d * Math.cos(globalRotX) - z3d * Math.sin(globalRotX);
        let gz = y3d * Math.sin(globalRotX) + z3d * Math.cos(globalRotX);
        let gx = x3d * Math.cos(globalRotY) + gz * Math.sin(globalRotY);
        gz = -x3d * Math.sin(globalRotY) + gz * Math.cos(globalRotY);
        let fx = gx * Math.cos(globalRotZ) - gy * Math.sin(globalRotZ);
        let fy = gx * Math.sin(globalRotZ) + gy * Math.cos(globalRotZ);
        let fz = gz;

        const scale = 1 + fz / (size * 0.5);
        return {
          x: cx + fx * scale,
          y: cy + fy * scale,
          z: fz,
          brightness: Math.max(0.05, 0.3 + (fz / (size * 0.35)) * 0.7),
        };
      });

      // Draw connections
      const maxDist = size * 0.18;
      const maxDistSq = maxDist * maxDist;
      
      for (let i = 0; i < projectedPoints.length; i += 3) {
        const p1 = projectedPoints[i];
        for (let j = i + 1; j < projectedPoints.length; j += 2) {
          const p2 = projectedPoints[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distSq = dx * dx + dy * dy;
          
          if (distSq < maxDistSq) {
            const dist = Math.sqrt(distSq);
            const alpha = (1 - dist / maxDist) * 0.15 * ((p1.brightness + p2.brightness) / 2);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${color3[0]}, ${color3[1]}, ${color3[2]}, ${alpha})`;
            ctx.lineWidth = 0.25;
            ctx.stroke();
          }
        }
      }

      // Draw dots
      projectedPoints.forEach((p1) => {
        const dotRadius = Math.max(0.15, 1.2 * p1.brightness);
        const glowRadius = Math.max(0.4, 2.5 * p1.brightness);
        const pointAlpha = Math.max(0, p1.brightness * (speedMultiplier > 1.5 ? 0.85 : 0.45));
        
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color2[0]}, ${color2[1]}, ${color2[2]}, ${pointAlpha})`;
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color1[0]}, ${color1[1]}, ${color1[2]}, ${pointAlpha * 0.2})`;
        ctx.fill();
      });

      // Subtle core
      const coreGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.06);
      coreGradient.addColorStop(0, `rgba(255, 255, 255, 0.6)`);
      coreGradient.addColorStop(0.2, `rgba(${color3[0]}, ${color3[1]}, ${color3[2]}, 0.4)`);
      coreGradient.addColorStop(0.6, `rgba(${color1[0]}, ${color1[1]}, ${color1[2]}, 0.15)`);
      coreGradient.addColorStop(1, `rgba(${color1[0]}, ${color1[1]}, ${color1[2]}, 0)`);
      
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.06, 0, Math.PI * 2);
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
          scale: isAwake ? [1, 1.15, 1] : [1, 1.05, 1], 
          opacity: isAwake ? [0.15, 0.4, 0.15] : [0.06, 0.14, 0.06] 
        }} 
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} 
        className="absolute w-full h-full rounded-full blur-3xl"
        style={{ background: `rgba(${color1[0]}, ${color1[1]}, ${color1[2]}, 0.2)` }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}