/**
 * Apex.AI — Shared Type Definitions
 * All interfaces used across the detection engine, dashboard, and registry.
 */

/** A single heuristic result from the detection engine */
export interface HeuristicResult {
  name: string;           // e.g. "SANDWICH_ATTACK", "HIGH_FREQ_SENDER"
  triggered: boolean;
  score: number;          // contribution to overall confidence (0-100)
  detail: string;         // human-readable explanation
}

/** A verified bot detection produced by BotDetectionEngine */
export interface BotDetection {
  txHash: string;
  botAddress: string;
  victimAddress?: string;
  pattern: string;                // primary pattern name
  confidence: number;             // 0-100, computed from heuristics
  heuristics: HeuristicResult[];  // all heuristic results
  blockNumber: number;
  gasMultiplier: number | null;   // how much above median gas
  estimatedValue: number;         // tx value in MNT
  timestamp: number;
  mantlescanUrl: string;          // direct verification link
}

/** Summary of a single block's analysis */
export interface BlockAnalysis {
  blockNumber: number;
  txCount: number;
  detections: BotDetection[];
  medianGasPrice: bigint;
  timestamp: number;
  processingTimeMs: number;
}

/** An entry logged to the on-chain ApexBotRegistry */
export interface RegistryEntry {
  botAddress: string;
  txHash: string;
  pattern: string;
  confidence: number;
  timestamp: number;
  reporter: string;
  onChainTxHash: string;   // the tx hash of the logBot() call itself
}

/** Statistics tracked by the detection engine */
export interface EngineStats {
  blocksAnalyzed: number;
  totalTxScanned: number;
  botsDetected: number;
  onChainLogged: number;
  avgConfidence: number;
  topPatterns: Record<string, number>;  // pattern name → count
}
