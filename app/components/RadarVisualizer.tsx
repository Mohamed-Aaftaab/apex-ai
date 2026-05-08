"use client";

import React, { useEffect, useRef, useState } from 'react';
import styles from './RadarVisualizer.module.css';

interface RadarProps {
  isLocked: boolean;
  onTargetFound: () => void;
}

export default function RadarVisualizer({ isLocked, onTargetFound }: RadarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let currentAngle = angle;

    // Generate some random blips representing on-chain entities
    const blips = Array.from({ length: 15 }).map(() => ({
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1,
      opacity: 0,
      isTarget: false,
    }));

    // Make one of them the target
    blips[5].isTarget = true;
    const targetBlip = blips[5];

    const drawRadar = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) / 2 - 10;

      ctx.clearRect(0, 0, width, height);

      // Draw grid
      ctx.strokeStyle = 'rgba(0, 255, 128, 0.1)';
      ctx.lineWidth = 1;
      
      // Circles
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, (radius / 4) * i, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - radius);
      ctx.lineTo(centerX, centerY + radius);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(centerX - radius, centerY);
      ctx.lineTo(centerX + radius, centerY);
      ctx.stroke();

      // Sweeper
      if (!isLocked) {
        currentAngle += 0.02;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + 0.5);
        ctx.lineTo(centerX, centerY);
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, 'rgba(0, 255, 128, 0.5)');
        gradient.addColorStop(1, 'rgba(0, 255, 128, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Draw Blips
      blips.forEach((blip) => {
        const blipX = centerX + blip.x * radius * 0.8;
        const blipY = centerY + blip.y * radius * 0.8;

        // Blip fade out logic if not locked
        if (!isLocked) {
          const blipAngle = Math.atan2(blip.y, blip.x);
          let angleDiff = currentAngle % (2 * Math.PI) - blipAngle;
          if (angleDiff < 0) angleDiff += 2 * Math.PI;

          if (angleDiff < 0.5) {
            blip.opacity = 1;
          } else {
            blip.opacity = Math.max(0, blip.opacity - 0.02);
          }
        } else {
          // If locked, hide normal blips, show only target
          blip.opacity = blip.isTarget ? 1 : Math.max(0, blip.opacity - 0.1);
        }

        if (blip.opacity > 0) {
          ctx.beginPath();
          ctx.arc(blipX, blipY, 4, 0, 2 * Math.PI);
          ctx.fillStyle = blip.isTarget && isLocked ? `rgba(255, 51, 102, ${blip.opacity})` : `rgba(0, 255, 128, ${blip.opacity})`;
          ctx.fill();
          
          if (blip.isTarget && isLocked) {
            ctx.strokeStyle = `rgba(255, 51, 102, 0.8)`;
            ctx.beginPath();
            ctx.arc(blipX, blipY, 12 + Math.sin(Date.now() / 100) * 4, 0, 2 * Math.PI);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(blipX - 20, blipY);
            ctx.lineTo(blipX + 20, blipY);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(blipX, blipY - 20);
            ctx.lineTo(blipX, blipY + 20);
            ctx.stroke();
          }
        }
      });

      // Simulation of finding a target
      if (!isLocked && Math.random() < 0.002) {
        onTargetFound();
      }

      animationFrameId = requestAnimationFrame(drawRadar);
    };

    drawRadar();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isLocked, onTargetFound]);

  return (
    <div className={`panel ${styles.radarContainer}`}>
      <div className={styles.header}>
        <h2 className="glow-text">APEX TACTICAL RADAR</h2>
        <span className={isLocked ? styles.statusLocked : styles.statusScanning}>
          {isLocked ? "TARGET LOCKED" : "SCANNING MANTLE NETWORK..."}
        </span>
      </div>
      <div className={styles.canvasWrapper}>
        <canvas ref={canvasRef} width={400} height={400} className={styles.canvas} />
      </div>
    </div>
  );
}
