/**
 * Apex.AI — Constants & Configuration
 * All hardcoded values in one place: network config, DEX selectors, contract info.
 */

// ─── Network Configuration ─────────────────────────────────────────────────
export const MANTLE_SEPOLIA_RPC = 'https://rpc.sepolia.mantle.xyz';
export const MANTLE_MAINNET_RPC = 'https://rpc.mantle.xyz';

/**
 * HACKATHON SETTING:
 * Set to true to scan REAL bots on Mainnet (read-only).
 * Registries and logging will still happen on Sepolia Testnet.
 */
export const SCAN_MAINNET = true;

export const MANTLE_SEPOLIA_CHAIN_ID = 5003;
export const MANTLE_SEPOLIA_EXPLORER = 'https://sepolia.mantlescan.xyz';
export const MANTLE_MAINNET_EXPLORER = 'https://mantlescan.xyz';

export function mantlescanTxUrl(txHash: string): string {
  const explorer = SCAN_MAINNET ? MANTLE_MAINNET_EXPLORER : MANTLE_SEPOLIA_EXPLORER;
  return `${explorer}/tx/${txHash}`;
}

export function mantlescanAddressUrl(address: string): string {
  const explorer = SCAN_MAINNET ? MANTLE_MAINNET_EXPLORER : MANTLE_SEPOLIA_EXPLORER;
  return `${explorer}/address/${address}`;
}

// ─── ApexBotRegistry Contract ──────────────────────────────────────────────
// This will be updated after deployment
export const APEX_REGISTRY_ADDRESS = "0xd86C18c2b2e5Fc0dC5CCBD21416ECb0A8F8e57FA";

export const APEX_REGISTRY_ABI = [
  'function logBot(address _botAddress, string memory _txHash, string memory _pattern, uint256 _confidence) public',
  'function getLedgerCount() public view returns (uint256)',
  'function isVerifiedBot(address) public view returns (bool)',
  'function ledger(uint256) public view returns (address botAddress, string txHash, string pattern, uint256 confidence, uint256 timestamp, address reporter)',
  'function getRecentBots(uint256 count) public view returns (tuple(address botAddress, string txHash, string pattern, uint256 confidence, uint256 timestamp, address reporter)[])',
  'function getAgentReputation(address agent) public view returns (uint256)',
  'event BotLogged(address indexed botAddress, string pattern, uint256 confidence)',
] as const;

// ─── Known DEX Router Addresses (Mantle & Mantle Sepolia) ──────────────────
// These are contracts that bots commonly interact with
export const KNOWN_DEX_ROUTERS: Record<string, string> = {
  // Agni Finance (main Mantle DEX)
  '0x319b69888b0d11cec22caa5034e25fed6fc246e0': 'AGNI_ROUTER',
  // FusionX
  '0x5989fb161568b9f133edf5cf6787f5597762797f': 'FUSIONX_ROUTER',
  // iZiSwap  
  '0x3ef68d3f7664b2805d4e88381b64868a56f88bc4': 'IZISWAP_ROUTER',
  // Merchant Moe
  '0xe2e301e08d11d0c8df4e8b18c72e01c7f3c8a581': 'MERCHANT_MOE_ROUTER',
  // Butter.xyz
  '0x24d39a5d343860062f6babd3b0f0ed7a1c7c8e23': 'BUTTER_ROUTER',
};

// ─── Function Selectors → Method Names ─────────────────────────────────────
// 4-byte function selectors for common DEX operations
export const FUNCTION_SELECTORS: Record<string, string> = {
  // Uniswap V2 style
  '0x38ed1739': 'swapExactTokensForTokens',
  '0x8803dbee': 'swapTokensForExactTokens',
  '0x7ff36ab5': 'swapExactETHForTokens',
  '0x4a25d94a': 'swapTokensForExactETH',
  '0x18cbafe5': 'swapExactTokensForETH',
  '0xfb3bdb41': 'swapETHForExactTokens',

  // Uniswap V3 style
  '0x414bf389': 'exactInputSingle',
  '0xc04b8d59': 'exactInput',
  '0xdb3e2198': 'exactOutputSingle',
  '0xf28c0498': 'exactOutput',
  '0x5ae401dc': 'multicall',
  '0xac9650d8': 'multicall',

  // Aggregator / router
  '0x415565b0': 'transformERC20',
  '0xd9627aa4': 'sellToUniswap',
  '0x5f575529': 'swap',

  // Approval (not a swap but context)
  '0x095ea7b3': 'approve',

  // Flashloan-related (strong bot signal)
  '0xab9c4b5d': 'flashLoan',
  '0x5cffe9de': 'flashLoan',
};

// ─── Detection Thresholds ──────────────────────────────────────────────────
export const DETECTION_CONFIG = {
  /** Minimum confidence score to consider a detection valid */
  MIN_CONFIDENCE: 25,

  /** Minimum confidence to auto-log to on-chain registry */
  AUTO_LOG_CONFIDENCE: 50, // Require multiple signals for permanent on-chain logging

  /** How many blocks to keep in the rolling window for frequency analysis */
  FREQUENCY_WINDOW_BLOCKS: 10,

  /** Number of appearances in the window to flag as high-frequency */
  FREQUENCY_THRESHOLD: 3, // Increased from 2 to 3 for higher precision

  /** Gas price multiplier vs median to flag as anomalous */
  GAS_ANOMALY_MULTIPLIER: 2.0,

  /** Max transactions to analyze per block (performance limit) */
  MAX_TX_PER_BLOCK: 100,

  /** Cooldown between detections in ms (prevent spam) */
  DETECTION_COOLDOWN_MS: 3000,

  /** Heuristic score weights */
  SCORES: {
    SANDWICH_ATTACK: 45,
    HIGH_FREQUENCY: 30,
    GAS_ANOMALY: 25,
    CONTRACT_SENDER: 15,
    DEX_FUNCTION: 10,
  },
};
