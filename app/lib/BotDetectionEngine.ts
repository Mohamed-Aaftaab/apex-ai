/**
 * Apex.AI — Bot Detection Engine
 * ================================
 * Real heuristic-based bot detection for Mantle Sepolia.
 * 
 * 5 Detection Heuristics:
 * 1. Sandwich Attack Detection — identifies buy-victim-sell patterns
 * 2. High-Frequency Sender — tracks sender frequency across blocks
 * 3. Gas Price Anomaly — flags txs paying far above median gas
 * 4. Contract vs EOA Profiling — identifies bot contract callers
 * 5. DEX Function Decoding — matches known swap function selectors
 * 
 * All confidence scores are COMPUTED, never random.
 */

import { ethers } from 'ethers';
import type { BotDetection, BlockAnalysis, HeuristicResult, EngineStats } from './types';
import {
  MANTLE_SEPOLIA_RPC,
  KNOWN_DEX_ROUTERS,
  FUNCTION_SELECTORS,
  DETECTION_CONFIG,
  mantlescanTxUrl,
} from './constants';

// ─── Internal types ────────────────────────────────────────────────────────

interface ParsedTx {
  hash: string;
  from: string;
  to: string | null;
  value: bigint;
  gasPrice: bigint;
  data: string;
  selector: string;
  nonce: number;
  index: number;
}

interface SenderHistory {
  /** Block numbers where this sender appeared */
  blocks: number[];
  /** Selectors used by this sender */
  selectors: Set<string>;
  /** Total tx count */
  count: number;
}

// ─── Engine Class ──────────────────────────────────────────────────────────

export class BotDetectionEngine {
  private provider: ethers.JsonRpcProvider;
  private senderHistory: Map<string, SenderHistory> = new Map();
  private currentBlockWindow: number[] = [];
  private lastDetectionTime = 0;
  private stats: EngineStats = {
    blocksAnalyzed: 0,
    totalTxScanned: 0,
    botsDetected: 0,
    onChainLogged: 0,
    avgConfidence: 0,
    topPatterns: {},
  };

  // Cache: contract code checks (address → isContract)
  private contractCache: Map<string, boolean> = new Map();

  constructor(rpcUrl: string = MANTLE_SEPOLIA_RPC) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  /** Get the RPC provider (for external use like block listening) */
  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  /** Get current engine statistics */
  getStats(): EngineStats {
    return { ...this.stats };
  }

  /**
   * Analyze a single block for bot activity.
   * This is the main entry point — call this for each new block.
   */
  async analyzeBlock(blockNumber: number): Promise<BlockAnalysis> {
    const startTime = performance.now();

    // Fetch block with full transaction details
    const block = await this.provider.getBlock(blockNumber, true);
    if (!block || !block.prefetchedTransactions) {
      return {
        blockNumber,
        txCount: 0,
        detections: [],
        medianGasPrice: 0n,
        timestamp: Date.now(),
        processingTimeMs: performance.now() - startTime,
      };
    }

    const txs = block.prefetchedTransactions.slice(0, DETECTION_CONFIG.MAX_TX_PER_BLOCK);
    
    // Parse all transactions into our internal format
    const parsedTxs: ParsedTx[] = txs.map((tx, index) => ({
      hash: tx.hash,
      from: tx.from.toLowerCase(),
      to: tx.to?.toLowerCase() || null,
      value: tx.value,
      gasPrice: tx.gasPrice || 0n,
      data: tx.data || '0x',
      selector: (tx.data && tx.data.length >= 10) ? tx.data.substring(0, 10).toLowerCase() : '0x',
      nonce: tx.nonce,
      index,
    }));

    // Calculate median gas price for this block
    const gasPrices = parsedTxs
      .map(tx => tx.gasPrice)
      .filter(gp => gp > 0n)
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    
    const medianGasPrice = gasPrices.length > 0
      ? gasPrices[Math.floor(gasPrices.length / 2)]
      : 0n;

    // Update sender frequency tracking
    this.updateSenderHistory(parsedTxs, blockNumber);

    // Track this block in the rolling window
    this.currentBlockWindow.push(blockNumber);
    if (this.currentBlockWindow.length > DETECTION_CONFIG.FREQUENCY_WINDOW_BLOCKS) {
      const expiredBlock = this.currentBlockWindow.shift()!;
      this.pruneOldHistory(expiredBlock);
    }

    // Run all heuristics on each transaction
    // NOTE: We analyze ALL transactions including simple value transfers.
    // On testnets, bot behavior manifests as rapid simple transfers.
    // The heuristics (frequency, gas anomaly) apply regardless of tx type.
    const detections: BotDetection[] = [];
    
    // Pre-compute same-sender counts for this block
    const senderCountsInBlock = new Map<string, number>();
    for (const tx of parsedTxs) {
      senderCountsInBlock.set(tx.from, (senderCountsInBlock.get(tx.from) || 0) + 1);
    }

    for (const tx of parsedTxs) {
      // Only skip truly empty system transactions (no value, no data, no gas price)
      if (tx.data === '0x' && tx.value === 0n && tx.gasPrice === 0n) continue;

      const heuristics: HeuristicResult[] = [];
      
      // Heuristic 1: Sandwich Attack Detection
      heuristics.push(this.detectSandwich(tx, parsedTxs));
      
      // Heuristic 2: High-Frequency Sender (across blocks)
      heuristics.push(this.detectHighFrequency(tx));
      
      // Heuristic 3: Gas Price Anomaly
      heuristics.push(this.detectGasAnomaly(tx, medianGasPrice));
      
      // Heuristic 4: Contract Sender / Known DEX target
      heuristics.push(await this.detectContractProfile(tx));
      
      // Heuristic 5: DEX Function Selector
      heuristics.push(this.detectDexFunction(tx));
      
      // Heuristic 6: Multiple transactions from same sender in this block
      heuristics.push(this.detectMultiTxBlock(tx, senderCountsInBlock));

      // Calculate composite confidence score
      const confidence = heuristics
        .filter(h => h.triggered)
        .reduce((sum, h) => sum + h.score, 0);

      // Only report if above minimum threshold
      if (confidence >= DETECTION_CONFIG.MIN_CONFIDENCE) {
        // Check cooldown
        const now = Date.now();
        if (now - this.lastDetectionTime < DETECTION_CONFIG.DETECTION_COOLDOWN_MS) {
          continue;
        }
        this.lastDetectionTime = now;

        // Determine primary pattern from highest-scoring triggered heuristic
        const triggeredHeuristics = heuristics.filter(h => h.triggered);
        const primaryPattern = triggeredHeuristics
          .sort((a, b) => b.score - a.score)[0]?.name || 'UNKNOWN';

        // Calculate gas multiplier for display
        let gasMultiplier: number | null = null;
        if (medianGasPrice > 0n && tx.gasPrice > 0n) {
          gasMultiplier = Number((tx.gasPrice * 100n) / medianGasPrice) / 100;
        }

        // Estimate value from tx
        const estimatedValue = parseFloat(ethers.formatEther(tx.value));

        const detection: BotDetection = {
          txHash: tx.hash,
          botAddress: tx.from,
          pattern: primaryPattern,
          confidence: Math.min(confidence, 100),
          heuristics,
          blockNumber,
          gasMultiplier,
          estimatedValue,
          timestamp: Date.now(),
          mantlescanUrl: mantlescanTxUrl(tx.hash),
        };

        detections.push(detection);
        
        // Update stats
        this.stats.botsDetected++;
        this.stats.topPatterns[primaryPattern] = (this.stats.topPatterns[primaryPattern] || 0) + 1;
      }
    }

    // Update stats
    this.stats.blocksAnalyzed++;
    this.stats.totalTxScanned += parsedTxs.length;
    if (this.stats.botsDetected > 0) {
      // Running average confidence
      this.stats.avgConfidence = 
        ((this.stats.avgConfidence * (this.stats.botsDetected - detections.length)) +
         detections.reduce((sum, d) => sum + d.confidence, 0)) / this.stats.botsDetected;
    }

    return {
      blockNumber,
      txCount: parsedTxs.length,
      detections,
      medianGasPrice,
      timestamp: block.timestamp * 1000,
      processingTimeMs: performance.now() - startTime,
    };
  }

  // ─── Heuristic 1: Sandwich Attack Detection ──────────────────────────────
  
  /**
   * Detects sandwich patterns within a single block.
   * A sandwich occurs when the same address makes two trades in the same block
   * that "wrap" around another trader's transaction:
   *   - Position i: Attacker buys token X
   *   - Position j: Victim swaps token X (gets worse price)
   *   - Position k: Attacker sells token X (profits from price impact)
   * 
   * We detect this by finding: same sender, at least 2 DEX calls, with
   * other DEX calls from different senders in between.
   */
  private detectSandwich(tx: ParsedTx, allTxs: ParsedTx[]): HeuristicResult {
    const result: HeuristicResult = {
      name: 'SANDWICH_ATTACK',
      triggered: false,
      score: 0,
      detail: '',
    };

    // Only check DEX-related transactions
    if (!FUNCTION_SELECTORS[tx.selector]) return result;

    // Find all transactions from the same sender in this block
    const sameSenderTxs = allTxs.filter(t => t.from === tx.from && t.hash !== tx.hash);
    
    if (sameSenderTxs.length === 0) return result;

    // Check if there are DEX calls from other senders between this tx and the same sender's other tx
    for (const otherTx of sameSenderTxs) {
      const minIdx = Math.min(tx.index, otherTx.index);
      const maxIdx = Math.max(tx.index, otherTx.index);
      
      // Both must be DEX calls
      if (!FUNCTION_SELECTORS[otherTx.selector]) continue;

      // Look for victim transactions in between
      const victimsInBetween = allTxs.filter(t => 
        t.index > minIdx && 
        t.index < maxIdx && 
        t.from !== tx.from &&
        FUNCTION_SELECTORS[t.selector] // victim is also doing a DEX swap
      );

      if (victimsInBetween.length > 0) {
        result.triggered = true;
        result.score = DETECTION_CONFIG.SCORES.SANDWICH_ATTACK;
        result.detail = `Sandwich pattern: ${tx.from.substring(0, 10)}... made 2 DEX calls wrapping ${victimsInBetween.length} victim tx(s) in block positions ${minIdx}-${maxIdx}`;
        return result;
      }
    }

    // Weaker signal: same sender making multiple DEX calls in one block
    if (sameSenderTxs.filter(t => FUNCTION_SELECTORS[t.selector]).length >= 1) {
      result.triggered = true;
      result.score = Math.floor(DETECTION_CONFIG.SCORES.SANDWICH_ATTACK * 0.5); // half score for multi-swap without clear victim
      result.detail = `Multi-swap: ${tx.from.substring(0, 10)}... made ${sameSenderTxs.length + 1} DEX calls in single block`;
    }

    return result;
  }

  // ─── Heuristic 2: High-Frequency Sender ──────────────────────────────────
  
  /**
   * Tracks how often each sender appears across a rolling window of blocks.
   * Humans rarely appear in more than 1-2 blocks within a short window.
   * Bots appear in many consecutive blocks.
   */
  private detectHighFrequency(tx: ParsedTx): HeuristicResult {
    const result: HeuristicResult = {
      name: 'HIGH_FREQ_SENDER',
      triggered: false,
      score: 0,
      detail: '',
    };

    const history = this.senderHistory.get(tx.from);
    if (!history) return result;

    // Count unique blocks this sender appeared in within the window
    const uniqueBlocks = new Set(history.blocks).size;
    
    if (uniqueBlocks >= DETECTION_CONFIG.FREQUENCY_THRESHOLD) {
      result.triggered = true;
      result.score = DETECTION_CONFIG.SCORES.HIGH_FREQUENCY;
      result.detail = `Sender ${tx.from.substring(0, 10)}... appeared in ${uniqueBlocks} blocks within last ${DETECTION_CONFIG.FREQUENCY_WINDOW_BLOCKS} blocks (${history.count} total txs)`;
    }

    return result;
  }

  // ─── Heuristic 3: Gas Price Anomaly ──────────────────────────────────────
  
  /**
   * Compares each transaction's gas price to the block's median.
   * MEV bots frequently overpay for gas to ensure priority ordering
   * within the block. A tx paying 2x+ the median is suspicious.
   */
  private detectGasAnomaly(tx: ParsedTx, medianGasPrice: bigint): HeuristicResult {
    const result: HeuristicResult = {
      name: 'GAS_ANOMALY',
      triggered: false,
      score: 0,
      detail: '',
    };

    if (medianGasPrice === 0n || tx.gasPrice === 0n) return result;

    const multiplier = Number((tx.gasPrice * 100n) / medianGasPrice) / 100;
    
    if (multiplier >= DETECTION_CONFIG.GAS_ANOMALY_MULTIPLIER) {
      result.triggered = true;
      result.score = DETECTION_CONFIG.SCORES.GAS_ANOMALY;
      result.detail = `Gas price ${multiplier.toFixed(1)}x above block median (${ethers.formatUnits(tx.gasPrice, 'gwei')} gwei vs ${ethers.formatUnits(medianGasPrice, 'gwei')} gwei median)`;
    }

    return result;
  }

  // ─── Heuristic 4: Contract vs EOA Profiling ──────────────────────────────
  
  /**
   * Checks if the transaction targets a known DEX router, and if the sender
   * is itself a contract (strong bot signal). EOAs calling DEX routers
   * are likely human; contracts calling DEX routers are likely bots.
   */
  private async detectContractProfile(tx: ParsedTx): Promise<HeuristicResult> {
    const result: HeuristicResult = {
      name: 'CONTRACT_PROFILE',
      triggered: false,
      score: 0,
      detail: '',
    };

    if (!tx.to) return result;

    // Check if target is a known DEX router
    const targetDex = KNOWN_DEX_ROUTERS[tx.to];
    
    // Check if sender is a contract (cached)
    let senderIsContract = this.contractCache.get(tx.from);
    if (senderIsContract === undefined) {
      try {
        const code = await this.provider.getCode(tx.from);
        senderIsContract = code !== '0x';
        this.contractCache.set(tx.from, senderIsContract);
      } catch {
        senderIsContract = false;
      }
    }

    if (senderIsContract) {
      result.triggered = true;
      result.score = DETECTION_CONFIG.SCORES.CONTRACT_SENDER;
      result.detail = targetDex 
        ? `Contract ${tx.from.substring(0, 10)}... calling ${targetDex}`
        : `Sender ${tx.from.substring(0, 10)}... is a contract (not an EOA)`;
    }

    return result;
  }

  // ─── Heuristic 5: DEX Function Selector ──────────────────────────────────
  
  /**
   * Decodes the function selector to identify known DEX swap operations.
   * This alone is a weak signal (humans also swap on DEXes), but it provides
   * important context for the other heuristics.
   */
  private detectDexFunction(tx: ParsedTx): HeuristicResult {
    const result: HeuristicResult = {
      name: 'DEX_FUNCTION',
      triggered: false,
      score: 0,
      detail: '',
    };

    const functionName = FUNCTION_SELECTORS[tx.selector];
    if (functionName) {
      result.triggered = true;
      result.score = DETECTION_CONFIG.SCORES.DEX_FUNCTION;
      
      const targetDex = tx.to ? KNOWN_DEX_ROUTERS[tx.to] : null;
      result.detail = targetDex
        ? `Decoded: ${functionName}() on ${targetDex}`
        : `Decoded: ${functionName}() on ${tx.to?.substring(0, 10) || 'unknown'}`;
    }

    return result;
  }

  // ─── Heuristic 6: Multi-Transaction Block ──────────────────────────────

  /**
   * Detects when the same sender has multiple transactions in a single block.
   * Humans almost never have 2+ transactions in the same block — it requires
   * programmatic nonce management and rapid-fire submission, which is a
   * strong indicator of automated/bot behavior.
   */
  private detectMultiTxBlock(tx: ParsedTx, senderCounts: Map<string, number>): HeuristicResult {
    const result: HeuristicResult = {
      name: 'MULTI_TX_BLOCK',
      triggered: false,
      score: 0,
      detail: '',
    };

    const count = senderCounts.get(tx.from) || 0;
    if (count >= 2) {
      result.triggered = true;
      result.score = 15; // Moderate signal
      result.detail = `Sender ${tx.from.substring(0, 10)}... has ${count} transactions in this single block`;
    }

    return result;
  }

  // ─── Internal helpers ────────────────────────────────────────────────────

  /** Update the sender frequency map with transactions from a new block */
  private updateSenderHistory(txs: ParsedTx[], blockNumber: number): void {
    for (const tx of txs) {
      const existing = this.senderHistory.get(tx.from);
      if (existing) {
        existing.blocks.push(blockNumber);
        if (tx.selector !== '0x') existing.selectors.add(tx.selector);
        existing.count++;
      } else {
        this.senderHistory.set(tx.from, {
          blocks: [blockNumber],
          selectors: new Set(tx.selector !== '0x' ? [tx.selector] : []),
          count: 1,
        });
      }
    }
  }

  /** Remove sender history entries that only appeared in blocks older than the window */
  private pruneOldHistory(expiredBlock: number): void {
    for (const [address, history] of this.senderHistory.entries()) {
      history.blocks = history.blocks.filter(b => b > expiredBlock);
      if (history.blocks.length === 0) {
        this.senderHistory.delete(address);
      }
    }
  }

  /** Clear all cached state. Useful for testing or resetting. */
  reset(): void {
    this.senderHistory.clear();
    this.currentBlockWindow = [];
    this.contractCache.clear();
    this.lastDetectionTime = 0;
    this.stats = {
      blocksAnalyzed: 0,
      totalTxScanned: 0,
      botsDetected: 0,
      onChainLogged: 0,
      avgConfidence: 0,
      topPatterns: {},
    };
  }
}
