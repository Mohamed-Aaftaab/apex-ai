/**
 * Apex.AI — On-Chain Registry Hook
 * =================================
 * React hook for interacting with the deployed ApexBotRegistry contract.
 * Handles logging detections on-chain and reading registry data.
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import type { BotDetection, RegistryEntry } from '../lib/types';
import {
  APEX_REGISTRY_ADDRESS,
  APEX_REGISTRY_ABI,
  MANTLE_SEPOLIA_RPC,
} from '../lib/constants';

interface UseApexRegistryReturn {
  /** Log a bot detection to the on-chain registry */
  logBot: (detection: BotDetection, signer: ethers.Signer) => Promise<RegistryEntry | null>;
  /** AUTONOMOUS MODE: Logs bot via backend API (zero-click) */
  autonomousLog: (detection: BotDetection) => Promise<{ onChainTxHash: string } | null>;
  /** Get total number of logged bots from the contract */
  getLedgerCount: () => Promise<number>;
  /** Get agent reputation for an address */
  getAgentReputation: (address: string) => Promise<number>;
  /** Get recent bot entries from the ledger */
  getRecentBots: (count: number) => Promise<RegistryEntry[]>;
  /** Whether a logBot transaction is currently in progress */
  isLogging: boolean;
  /** Last error from a contract call */
  lastError: string | null;
}

export function useApexRegistry(): UseApexRegistryReturn {
  const [isLogging, setIsLogging] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  
  // Read-only provider for queries
  const readProvider = useRef(new ethers.JsonRpcProvider(MANTLE_SEPOLIA_RPC));

  /** Get a read-only contract instance */
  const getReadContract = useCallback(() => {
    return new ethers.Contract(
      APEX_REGISTRY_ADDRESS,
      APEX_REGISTRY_ABI,
      readProvider.current
    );
  }, []);

  /**
   * Log a bot detection using a browser wallet (MetaMask)
   */
  const logBot = useCallback(async (
    detection: BotDetection,
    signer: ethers.Signer
  ): Promise<RegistryEntry | null> => {
    setIsLogging(true);
    setLastError(null);

    try {
      const contract = new ethers.Contract(
        APEX_REGISTRY_ADDRESS,
        APEX_REGISTRY_ABI,
        signer
      );

      const tx = await contract.logBot(
        detection.botAddress,
        detection.txHash,
        detection.pattern,
        BigInt(Math.round(detection.confidence))
      );

      const receipt = await tx.wait();

      if (receipt && receipt.status === 1) {
        const reporter = await signer.getAddress();
        return {
          botAddress: detection.botAddress,
          txHash: detection.txHash,
          pattern: detection.pattern,
          confidence: detection.confidence,
          timestamp: Date.now(),
          reporter,
          onChainTxHash: tx.hash,
        };
      }
      return null;
    } catch (err: any) {
      setLastError(err.message);
      return null;
    } finally {
      setIsLogging(false);
    }
  }, []);

  /**
   * AUTONOMOUS MODE: Logs bot via backend API (zero-click)
   */
  const autonomousLog = useCallback(async (detection: BotDetection) => {
    try {
      const response = await fetch('/api/registry/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botAddress: detection.botAddress,
          txHash: detection.txHash,
          pattern: detection.pattern,
          confidence: Math.round(detection.confidence),
        }),
      });

      const data = await response.json();
      if (data.success) {
        return { onChainTxHash: data.txHash };
      }
      return null;
    } catch (err) {
      console.error('Autonomous log failed:', err);
      return null;
    }
  }, []);

  /**
   * Get the total number of logged bot signatures from the contract.
   */
  const getLedgerCount = useCallback(async (): Promise<number> => {
    try {
      const contract = getReadContract();
      const count = await contract.getLedgerCount();
      return Number(count);
    } catch {
      return 0;
    }
  }, [getReadContract]);

  /**
   * Get the on-chain reputation score for an agent address.
   */
  const getAgentReputation = useCallback(async (address: string): Promise<number> => {
    try {
      const contract = getReadContract();
      const rep = await contract.getAgentReputation(address);
      return Number(rep);
    } catch {
      return 0;
    }
  }, [getReadContract]);

  /**
   * Fetch recent bot entries from the on-chain ledger.
   */
  const getRecentBots = useCallback(async (count: number): Promise<RegistryEntry[]> => {
    try {
      const contract = getReadContract();
      const bots = await contract.getRecentBots(BigInt(count));
      
      return bots.map((bot: any) => ({
        botAddress: bot.botAddress,
        txHash: bot.txHash,
        pattern: bot.pattern,
        confidence: Number(bot.confidence),
        timestamp: Number(bot.timestamp) * 1000,
        reporter: bot.reporter,
        onChainTxHash: '',
      }));
    } catch {
      return [];
    }
  }, [getReadContract]);

  return {
    logBot,
    autonomousLog,
    getLedgerCount,
    getAgentReputation,
    getRecentBots,
    isLogging,
    lastError,
  };
}
