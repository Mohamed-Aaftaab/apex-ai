"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import styles from './MarketVisualizer.module.css';
import { fetchKlines, createKlineWebSocket, type OHLC } from '../lib/bybitApi';

interface MarketVisualizerProps {
  isLocked?: boolean;
}

type DataSource = 'LIVE' | 'SIMULATED' | 'CONNECTING';

export default function MarketVisualizer({ isLocked = false }: MarketVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [dataPoints, setDataPoints] = useState<OHLC[]>([]);
  const [dataSource, setDataSource] = useState<DataSource>('CONNECTING');
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const MAX_POINTS = 50;

  // ── Generate fallback simulated data ──────────────────────────────────
  const generateSimulatedData = useCallback((): OHLC[] => {
    let price = 0.8; // approximate MNT price
    return Array(MAX_POINTS).fill(0).map((_, i) => {
      const open = price;
      const close = open + (Math.random() - 0.5) * 0.02;
      const high = Math.max(open, close) + Math.random() * 0.01;
      const low = Math.min(open, close) - Math.random() * 0.01;
      price = close;
      return { open, high, low, close, volume: Math.random() * 100000, timestamp: Date.now() - (MAX_POINTS - i) * 60000 };
    });
  }, []);

  // ── Fetch real data + setup WebSocket ──────────────────────────────────
  useEffect(() => {
    let wsCleanup: (() => void) | null = null;
    let simulationInterval: ReturnType<typeof setInterval> | null = null;
    let mounted = true;

    async function initRealData() {
      try {
        const klines = await fetchKlines('MNTUSDT', '1', MAX_POINTS);

        if (!mounted) return;

        setDataPoints(klines);
        setCurrentPrice(klines[klines.length - 1].close);
        setDataSource('LIVE');

        // Start WebSocket for live updates
        wsCleanup = createKlineWebSocket(
          'MNTUSDT',
          '1',
          (candle, isClosed) => {
            if (!mounted) return;

            setCurrentPrice(candle.close);

            if (isClosed) {
              // Candle closed — append new candle and shift window
              setDataPoints(prev => {
                const newArr = [...prev.slice(1), candle];
                return newArr;
              });
            } else {
              // Candle still open — update the last candle in-place
              setDataPoints(prev => {
                if (prev.length === 0) return prev;
                const updated = [...prev];
                updated[updated.length - 1] = candle;
                return updated;
              });
            }
          },
          () => {
            // WebSocket error — keep existing data, mark as connection issue
            if (mounted) {
              console.warn('Binance WebSocket error — using last known data');
            }
          }
        );
      } catch (err) {
        // Binance API failed — fall back to simulated data
        console.warn('Binance API unavailable, using simulated data:', err);
        if (!mounted) return;

        const simData = generateSimulatedData();
        setDataPoints(simData);
        setCurrentPrice(simData[simData.length - 1].close);
        setDataSource('SIMULATED');

        // Continue simulating
        simulationInterval = setInterval(() => {
          setDataPoints(prev => {
            const last = prev[prev.length - 1];
            const open = last.close;
            const close = open + (Math.random() - 0.5) * 0.02;
            const high = Math.max(open, close) + Math.random() * 0.01;
            const low = Math.min(open, close) - Math.random() * 0.01;
            const newCandle: OHLC = { open, high, low, close, volume: Math.random() * 100000, timestamp: Date.now() };
            setCurrentPrice(close);
            return [...prev.slice(1), newCandle];
          });
        }, 1000);
      }
    }

    initRealData();

    return () => {
      mounted = false;
      wsCleanup?.();
      if (simulationInterval) clearInterval(simulationInterval);
    };
  }, [generateSimulatedData]);

  // ── Linear Regression helper ───────────────────────────────────────────
  function linearRegression(values: number[]): { slope: number; intercept: number } {
    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumXX += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
  }

  function standardDeviation(values: number[]): number {
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    return Math.sqrt(variance);
  }

  // ── Canvas draw loop ───────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dataPoints.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let predictionProgress = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const padding = 20;

      // Auto-scale chart
      const min = Math.min(...dataPoints.map(d => d.low));
      const max = Math.max(...dataPoints.map(d => d.high));
      const range = max - min || 1;

      // Reserve 250px on the right side for prediction drawing
      const chartWidth = width - padding * 2 - 250;
      const pointSpacing = chartWidth / MAX_POINTS;
      const candleWidth = Math.max(pointSpacing * 0.6, 2);

      // Draw Grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const y = padding + (height - padding * 2) * (i / 4);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();

        // Price labels on the right
        const priceAtLevel = max - (range * (i / 4));
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(priceAtLevel.toFixed(4), width - 5, y + 3);
      }

      // Draw Candlesticks
      let lastX = 0;
      let lastCloseY = 0;

      dataPoints.forEach((candle, i) => {
        const x = padding + i * pointSpacing;

        const normOpen = (candle.open - min) / range;
        const normClose = (candle.close - min) / range;
        const normHigh = (candle.high - min) / range;
        const normLow = (candle.low - min) / range;

        const yOpen = height - padding - (normOpen * (height - padding * 2));
        const yClose = height - padding - (normClose * (height - padding * 2));
        const yHigh = height - padding - (normHigh * (height - padding * 2));
        const yLow = height - padding - (normLow * (height - padding * 2));

        const isBullish = candle.close >= candle.open;
        const color = isBullish ? '#00ff80' : '#ff3366';

        // Draw Wick
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.moveTo(x, yHigh);
        ctx.lineTo(x, yLow);
        ctx.stroke();

        // Draw Body
        const bodyY = Math.min(yOpen, yClose);
        const bodyHeight = Math.max(Math.abs(yClose - yOpen), 2);

        ctx.fillStyle = color;
        ctx.shadowBlur = 5;
        ctx.shadowColor = color;
        ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight);
        ctx.shadowBlur = 0;

        lastX = x;
        lastCloseY = yClose;
      });

      // Draw current price dot
      ctx.beginPath();
      ctx.arc(lastX, lastCloseY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();

      // ── DATA-DRIVEN AI PREDICTION PATHS ────────────────────────────────
      if (isLocked) {
        predictionProgress += 0.03;

        // Compute linear regression on last 15 candle closes
        const recentCloses = dataPoints.slice(-15).map(d => d.close);
        const { slope } = linearRegression(recentCloses);
        const sigma = standardDeviation(recentCloses);

        // Normalize slope and sigma to pixel space
        const pixelPerUnit = (height - padding * 2) / range;
        const slopePixels = -slope * pixelPerUnit; // negative because canvas Y is inverted
        const sigmaPixels = sigma * pixelPerUnit * 1.5; // 1.5σ bands

        // Project 15 candles forward (~180px)
        const projectionLength = 180;

        const drawProjection = (
          yOffset: number,
          color: string,
          speed: number,
          label: string
        ) => {
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.shadowBlur = 15;
          ctx.shadowColor = color;
          ctx.setLineDash([6, 4]);

          const progress = Math.min(predictionProgress * speed, 1);
          const targetX = lastX + projectionLength * progress;
          const targetY = lastCloseY + (slopePixels * 15 + yOffset) * progress;

          ctx.moveTo(lastX, lastCloseY);

          // Smooth bezier curve following the trend
          const cp1x = lastX + (targetX - lastX) * 0.4;
          const cp1y = lastCloseY + (targetY - lastCloseY) * 0.1;
          const cp2x = lastX + (targetX - lastX) * 0.7;
          const cp2y = targetY;

          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, targetX, targetY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Draw endpoint node
          if (progress >= 1) {
            ctx.beginPath();
            ctx.arc(targetX, targetY, 4, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();

            ctx.font = '800 10px monospace';
            ctx.shadowBlur = 0;
            ctx.textAlign = 'left';
            ctx.fillStyle = color; // RESTORE BRAND COLOR
            ctx.fillText(label, targetX + 25, targetY + 4); // FINAL OFFSET (+25 is perfect)
          }
        };

        // Three paths: bullish (regression + σ up), neutral (regression), bearish (regression - σ down)
        drawProjection(-sigmaPixels, '#00ff80', 0.8, '+ BULL');
        drawProjection(0, 'rgba(255,255,255,0.4)', 0.6, '→ TREND');
        drawProjection(sigmaPixels, '#ff3366', 0.9, '- BEAR');

        // Info label showing computed values
        ctx.fillStyle = '#00ff80';
        ctx.font = '11px monospace';
        ctx.shadowBlur = 0;
        ctx.textAlign = 'left';
        ctx.fillText(
          `TREND PROJECTION (σ = ${sigma.toFixed(5)}, slope = ${(slope * 100).toFixed(3)}%)`,
          padding + 10,
          padding + 15 // Anchor to the top of the grid
        );
      } else {
        predictionProgress = 0;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [dataPoints, isLocked]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          MNT/USDT
          <span className={`${styles.badge} ${dataSource === 'LIVE' ? styles.badgeLive : dataSource === 'SIMULATED' ? styles.badgeSim : styles.badgeConn}`}>
            {dataSource === 'LIVE' ? '● LIVE' : dataSource === 'SIMULATED' ? '◌ SIMULATED' : '⟳ CONNECTING'}
          </span>
        </div>
        <div className={styles.status}>
          {currentPrice > 0 && (
            <span className={styles.price}>${currentPrice.toFixed(4)}</span>
          )}
          {isLocked ? <span className={styles.locked}>CALCULATING STRIKE</span> : <span className={styles.scanning}>SCANNING MARKETS</span>}
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        className={styles.canvas}
      />
    </div>
  );
}
