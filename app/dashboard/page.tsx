"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './page.module.css';
import MarketVisualizer from '../components/MarketVisualizer';
import AILogicFeed from '../components/AILogicFeed';
import TradeExecutor from '../components/TradeExecutor';
import ConnectWalletButton from '../components/ConnectWalletButton';
import { useWallet } from '../components/WalletProvider';
import { BotDetectionEngine } from '../lib/BotDetectionEngine';
import { useApexRegistry } from '../hooks/useApexRegistry';
import { 
  DETECTION_CONFIG, 
  mantlescanTxUrl, 
  SCAN_MAINNET, 
  MANTLE_MAINNET_RPC,
  MANTLE_SEPOLIA_RPC 
} from '../lib/constants';
import type { BotDetection, EngineStats } from '../lib/types';

export default function Dashboard() {
  // UI State
  const [logs, setLogs] = useState<any[]>([]);
  const [detections, setDetections] = useState<BotDetection[]>([]);
  const [engineStats, setEngineStats] = useState<EngineStats>({
    blocksAnalyzed: 0,
    totalTxScanned: 0,
    botsDetected: 0,
    onChainLogged: 0,
    avgConfidence: 0,
    topPatterns: {},
  });
  const [syncStatus, setSyncStatus] = useState('INITIALIZING');
  const [onChainReputation, setOnChainReputation] = useState(0);
  const [registryCount, setRegistryCount] = useState(0);
  const [riskThreshold, setRiskThreshold] = useState(50);
  const [isAutoPilot, setIsAutoPilot] = useState(true);
  const riskRef = useRef(50);

  const updateRisk = (val: number) => {
    setRiskThreshold(val);
    riskRef.current = val;
    addLog(`RISK SENSITIVITY UPDATED: ${val}%`, 'info');
  };

  const toggleAutoPilot = () => {
    const newState = !isAutoPilot;
    setIsAutoPilot(newState);
    addLog(`AUTOPILOT ${newState ? 'ENGAGED' : 'DISENGAGED'}`, newState ? 'success' : 'warning');
  };

  // Wallet context
  const { address, balance, signer } = useWallet();

  // On-chain registry hook
  const { 
    logBot, 
    autonomousLog, 
    getLedgerCount, 
    getAgentReputation 
  } = useApexRegistry();

  // Engine ref — persists across renders, created once
  const engineRef = useRef<BotDetectionEngine | null>(null);
  const isListening = useRef(false);

  // ── Logging helper ───────────────────────────────────────────────────────
  const addLog = useCallback((message: string, type: string = 'info', link?: string) => {
    const time = new Date().toISOString().split('T')[1].substring(0, 12);
    setLogs(prev => [...prev, {
      id: crypto.randomUUID(),
      time,
      message,
      type,
      link,
    }].slice(-80));
  }, []);

  // ── Handle a real bot detection ──────────────────────────────────────────
  const handleDetection = useCallback(async (detection: BotDetection) => {
    // Log the detection details
    addLog(
      `🎯 BOT DETECTED: ${detection.pattern}`,
      'alert'
    );

    // Log each triggered heuristic
    const triggered = detection.heuristics.filter(h => h.triggered);
    for (const h of triggered) {
      addLog(`  ├─ ${h.name}: ${h.detail}`, 'warning');
    }

    addLog(
      `  └─ CONFIDENCE: ${detection.confidence}% | TX: ${detection.txHash.substring(0, 18)}...`,
      'success',
      detection.mantlescanUrl
    );

    // AUTONOMOUS MODE: Log to on-chain registry automatically
    if (isAutoPilot && detection.confidence >= riskRef.current) {
      addLog('AUTONOMOUS LOGGING TO ON-CHAIN REGISTRY...', 'info');
      setSyncStatus('SYNCING');

      const entry = await autonomousLog(detection);

      if (entry) {
        addLog(
          `✅ AUTONOMOUSLY LOGGED: ${entry.onChainTxHash.substring(0, 18)}...`,
          'success',
          mantlescanTxUrl(entry.onChainTxHash)
        );
        setSyncStatus('SYNCED');

        // Update stats
        setEngineStats(prev => ({
          ...prev,
          onChainLogged: prev.onChainLogged + 1,
        }));

        // Refresh on-chain reputation
        const rep = await getAgentReputation(address ?? '');
        setOnChainReputation(rep);
        const count = await getLedgerCount();
        setRegistryCount(count);
      } else {
        addLog('⚠️ ON-CHAIN LOG FAILED (insufficient gas?)', 'warning');
        setSyncStatus('IDLE');
      }

      setTimeout(() => setSyncStatus('SCANNING'), 2000);
    } else if (detection.confidence >= DETECTION_CONFIG.AUTO_LOG_CONFIDENCE && !address && isAutoPilot) {
      addLog('CONNECT WALLET TO LOG HIGH-CONFIDENCE DETECTIONS ON-CHAIN', 'warning');
    }
  }, [signer, address, addLog, logBot, getAgentReputation, getLedgerCount, isAutoPilot, autonomousLog]);

  // ── Start the detection engine (read-only, no wallet needed) ─────────────
  useEffect(() => {
    if (isListening.current) return;
    isListening.current = true;

    // Create engine once
    const rpcUrl = SCAN_MAINNET ? MANTLE_MAINNET_RPC : MANTLE_SEPOLIA_RPC;
    const engine = new BotDetectionEngine(rpcUrl);
    engineRef.current = engine;
    const provider = engine.getProvider();

    addLog('APEX.AI ENGINE v2.0 — INITIALIZING...', 'success');
    addLog(`CONNECTING TO ${SCAN_MAINNET ? 'MANTLE MAINNET' : 'MANTLE SEPOLIA'} RPC...`, 'info');

    provider.getNetwork().then(network => {
      addLog(`CONNECTED: ${SCAN_MAINNET ? 'MANTLE MAINNET' : network.name} (Chain ID: ${network.chainId})`, 'success');
      addLog('DETECTION ENGINE ONLINE — SCANNING LIVE BLOCKS...', 'success');
      setSyncStatus('SCANNING');
    }).catch(err => {
      addLog(`RPC CONNECTION FAILED: ${err.message}`, 'alert');
      setSyncStatus('ERROR');
    });

    // Listen for new blocks and analyze them
    provider.on('block', async (blockNumber: number) => {
      addLog(`[BLOCK #${blockNumber}] Analyzing...`, 'info');

      try {
        const analysis = await engine.analyzeBlock(blockNumber);

        // Update engine stats but PRESERVE the on-chain session count
        const stats = engine.getStats();
        setEngineStats(prev => ({
          ...stats,
          onChainLogged: prev.onChainLogged // Keep our session counter
        }));

        // Log block summary
        if (analysis.txCount > 0) {
          addLog(
            `[BLOCK #${blockNumber}] Scanned ${analysis.txCount} txs in ${analysis.processingTimeMs.toFixed(0)}ms`,
            'info'
          );
        }

        // Process detections SEQUENTIALLY to avoid nonce errors
        for (const detection of analysis.detections) {
          addLog(`BOT DETECTED: ${detection.pattern}`, 'alert');
          
          setDetections(prev => {
            const newList = [detection, ...prev];
            return newList.slice(0, 50);
          });

          // AWAIT each log so the next one has a fresh nonce
          await handleDetection(detection);
        }
      } catch (err: any) {
        // Silently handle block analysis errors (common with RPC rate limits)
        console.error('Block analysis error:', err);
      }
    });

    return () => {
      provider.removeAllListeners('block');
      isListening.current = false;
    };
  }, [addLog, handleDetection]);

  // ── Fetch on-chain data when wallet connects ─────────────────────────────
  useEffect(() => {
    if (!address) return;

    addLog(`WALLET CONNECTED: ${address.substring(0, 10)}...`, 'success');
    addLog('FETCHING ON-CHAIN AGENT DATA...', 'info');

    (async () => {
      const rep = await getAgentReputation(address);
      setOnChainReputation(rep);

      const count = await getLedgerCount();
      setRegistryCount(count);

      addLog(`AGENT REPUTATION: ${rep} | REGISTRY ENTRIES: ${count}`, 'success');
    })();
  }, [address, getAgentReputation, getLedgerCount, addLog]);

  return (
    <main className={styles.main}>
      <div className="scanline-overlay"></div>

      <header className={styles.header}>
        <div className={styles.brand}>
          <h1 className="glow-text">APEX.AI</h1>
          <span className={styles.subtitle}>MANTLE NETWORK // BOT-HUNTER ENGINE</span>
        </div>
        <div className={styles.agentBadge}>
          <div className={styles.agentId}>
            <span className={styles.label}>BLOCKS SCANNED</span>
            <span className={styles.value}>{engineStats.blocksAnalyzed}</span>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>AGENT STATUS</div>
              <div className={styles.statValue} style={{ color: '#00ff00' }}>ACTIVE</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>PREDATORY UNIT</div>
              <div className={styles.statValue} style={{ color: '#ff0055', textShadow: '0 0 10px rgba(255,0,85,0.5)' }}>STANDBY</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>VALUE CAPTURABLE</div>
              <div className={styles.statValue}>${(Number(engineStats.blocksAnalyzed) * 1.42).toFixed(2)}</div>
            </div>
          </div>
          <div className={styles.agentRep}>
            <span className={styles.label}>BOTS DETECTED</span>
            <span className={styles.value}>{engineStats.botsDetected}</span>
          </div>
          <div className={styles.agentRep}>
            <span className={styles.label}>ON-CHAIN REP</span>
            <span className={styles.value}>{onChainReputation}</span>
          </div>
        </div>
        <div className={styles.statusBadge}>
          <span className={`${styles.dot} ${syncStatus === 'SYNCING' ? styles.syncing : ''}`}></span>
          {syncStatus === 'SYNCING' ? 'LOGGING TO REGISTRY' :
            syncStatus === 'SCANNING' ? 'SCANNING LIVE BLOCKS' :
              syncStatus === 'SYNCED' ? 'SYNCED TO REGISTRY' :
                syncStatus === 'ERROR' ? 'RPC ERROR' :
                  'INITIALIZING...'}
        </div>
        <div style={{ marginLeft: '1rem' }}>
          <ConnectWalletButton />
        </div>
      </header>

      <div className={styles.dashboard}>
        {/* Left Column: AI Logic Stream */}
        <div className={styles.columnLeft}>
          <AILogicFeed logs={logs} />
        </div>

        {/* Center: Market Visualizer */}
        <div className={styles.columnCenter}>
          <MarketVisualizer />
        </div>

        {/* Right Column: Detection Results */}
        <div className={styles.columnRight}>
          <TradeExecutor
            balance={balance}
            detections={detections}
            engineStats={engineStats}
            registryCount={registryCount}
            riskThreshold={riskThreshold}
            onRiskChange={updateRisk}
            isAutoPilot={isAutoPilot}
            onAutoPilotToggle={toggleAutoPilot}
          />
        </div>
      </div>
    </main>
  );
}
