"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';

const MANTLE_SEPOLIA = {
  chainId: '0x138B', // 5003 in hex
  chainName: 'Mantle Sepolia Testnet',
  nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
  rpcUrls: ['https://rpc.sepolia.mantle.xyz'],
  blockExplorerUrls: ['https://sepolia.mantlescan.xyz'],
};

interface WalletContextType {
  address: string | null;
  balance: number;
  signer: ethers.Signer | null;
  provider: ethers.BrowserProvider | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  balance: 0,
  signer: null,
  provider: null,
  isConnecting: false,
  connect: async () => {},
  disconnect: () => {},
  refreshBalance: async () => {},
});

export const useWallet = () => useContext(WalletContext);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const refreshBalance = useCallback(async () => {
    if (!address) return;
    try {
      const rpcProvider = new ethers.JsonRpcProvider('https://rpc.sepolia.mantle.xyz');
      const bal = await rpcProvider.getBalance(address);
      setBalance(parseFloat(ethers.formatEther(bal)));
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    }
  }, [address]);

  const switchToMantleSepolia = async () => {
    const ethereum = (window as any).ethereum;
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: MANTLE_SEPOLIA.chainId }],
      });
    } catch (switchError: any) {
      // Chain not added yet — add it
      if (switchError.code === 4902) {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [MANTLE_SEPOLIA],
        });
      } else {
        throw switchError;
      }
    }
  };

  const connect = useCallback(async () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      alert('Please install MetaMask to continue!\nhttps://metamask.io/download/');
      return;
    }

    setIsConnecting(true);
    try {
      // Request account access
      await ethereum.request({ method: 'eth_requestAccounts' });
      
      // Switch to Mantle Sepolia
      await switchToMantleSepolia();

      const browserProvider = new ethers.BrowserProvider(ethereum);
      const walletSigner = await browserProvider.getSigner();
      const walletAddress = await walletSigner.getAddress();

      setProvider(browserProvider);
      setSigner(walletSigner);
      setAddress(walletAddress);
    } catch (err) {
      console.error('Wallet connection failed:', err);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    // Revoke MetaMask permission so it doesn't auto-connect next time
    const ethereum = (window as any).ethereum;
    if (ethereum) {
      try {
        await ethereum.request({
          method: 'wallet_revokePermissions',
          params: [{ eth_accounts: {} }],
        });
      } catch {
        // Some wallets don't support revokePermissions — that's ok
      }
    }
    setAddress(null);
    setBalance(0);
    setSigner(null);
    setProvider(null);
  }, []);

  // Refresh balance when address changes
  useEffect(() => {
    if (address) refreshBalance();
  }, [address, refreshBalance]);

  // Listen for account/chain changes
  useEffect(() => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setAddress(accounts[0]);
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
      ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [disconnect]);

  return (
    <WalletContext.Provider value={{ address, balance, signer, provider, isConnecting, connect, disconnect, refreshBalance }}>
      {children}
    </WalletContext.Provider>
  );
}
