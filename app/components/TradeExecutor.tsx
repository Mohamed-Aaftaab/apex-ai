"use client";

import React from 'react';
import styles from './TradeExecutor.module.css';
import { Target, Activity, Shield, ExternalLink } from 'lucide-react';
import type { BotDetection, EngineStats } from '../lib/types';

interface TradeExecutorProps {
  balance: number;
  detections: BotDetection[];
  engineStats: EngineStats;
  registryCount: number;
  riskThreshold: number;
  onRiskChange: (val: number) => void;
  isAutoPilot: boolean;
  onAutoPilotToggle: () => void;
}

export default function TradeExecutor({ 
  balance, 
  detections, 
  engineStats, 
  registryCount,
  riskThreshold,
  onRiskChange,
  isAutoPilot,
  onAutoPilotToggle
}: TradeExecutorProps) {
  return (
    <div className={styles.executorContainer}>
      <div className={styles.header}>
        <h2>DETECTION ENGINE</h2>
        <div className={styles.autopilotToggle} onClick={onAutoPilotToggle}>
          <span className={styles.toggleLabel}>AUTOPILOT</span>
          <div className={`${styles.switch} ${isAutoPilot ? styles.switchOn : ''}`}>
            <div className={styles.knob}></div>
          </div>
        </div>
      </div>

      <div className={styles.riskSelector}>
        <span className={styles.riskLabel}>SENSITIVITY LEVEL</span>
        <div className={styles.riskButtons}>
          {[75, 50, 25].map(val => (
            <button 
              key={val}
              className={`${styles.riskBtn} ${riskThreshold === val ? styles.activeRisk : ''}`}
              onClick={() => onRiskChange(val)}
            >
              {val}% {val === 75 ? '🛡️' : val === 50 ? '⚖️' : '🔥'}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <Shield className={styles.icon} size={18} />
          <div className={styles.metricInfo}>
            <span className={styles.label}>WALLET (MNT)</span>
            <span className={styles.value}>{balance.toFixed(4)}</span>
          </div>
        </div>
        <div className={styles.metricCard}>
          <Activity className={styles.iconInfo} size={18} />
          <div className={styles.metricInfo}>
            <span className={styles.label}>TXS SCANNED</span>
            <span className={styles.value}>{engineStats.totalTxScanned}</span>
          </div>
        </div>
        <div className={styles.metricCard}>
          <Target className={styles.icon} size={18} />
          <div className={styles.metricInfo}>
            <span className={styles.label}>ON-CHAIN (SESSION / REGISTRY)</span>
            <span className={`${styles.value} ${styles.positive}`}>
              {engineStats.onChainLogged} <span style={{ opacity: 0.5 }}>/</span> {registryCount}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.subHeaderWrapper}>
        <h3 className={styles.subHeader}>
          <Target size={14} /> RECENT DETECTIONS
        </h3>
      </div>

      <div className={styles.tradeList}>
        {detections.length === 0 ? (
          <div className={styles.emptyState}>Waiting for detections...</div>
        ) : (
          detections.map((detection, index) => (
            <div key={`${detection.txHash}-${index}`} className={styles.tradeItem}>
              <div className={styles.itemHeader}>
                <span className={styles.blockNum}>#{detection.blockNumber}</span>
                <span className={styles.patternLabel}>{detection.pattern}</span>
                <span className={`${styles.confBadge} ${detection.confidence >= 70 ? styles.confHigh : styles.confLow}`}>
                  {detection.confidence}%
                </span>
              </div>
              
              <div className={styles.itemAddress}>
                {detection.botAddress}
              </div>

              <div className={styles.itemFooter}>
                <div className={styles.heuristics}>
                  {detection.heuristics.filter(h => h.triggered).map(h => (
                    <span key={h.name} className={styles.hTag}>{h.name}</span>
                  ))}
                </div>
                <a
                  href={detection.mantlescanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.verifyBtn}
                >
                  VERIFY <ExternalLink size={10} />
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
