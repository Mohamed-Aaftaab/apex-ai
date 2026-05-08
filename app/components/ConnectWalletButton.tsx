"use client";

import React from 'react';
import { useWallet } from './WalletProvider';

export default function ConnectWalletButton() {
  const { address, balance, isConnecting, connect, disconnect } = useWallet();

  if (address) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}>
        <div style={{
          background: 'rgba(0, 255, 136, 0.08)',
          border: '1px solid rgba(0, 255, 136, 0.3)',
          borderRadius: '8px',
          padding: '0.4rem 0.75rem',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.7rem',
          color: '#00ff88',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}>
          <span style={{ opacity: 0.7 }}>{balance.toFixed(4)} MNT</span>
          <span>{address.substring(0, 6)}...{address.substring(address.length - 4)}</span>
        </div>
        <button
          onClick={disconnect}
          style={{
            background: 'rgba(255, 50, 50, 0.15)',
            border: '1px solid rgba(255, 50, 50, 0.4)',
            borderRadius: '6px',
            padding: '0.4rem 0.75rem',
            color: '#ff5555',
            cursor: 'pointer',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.65rem',
            fontWeight: 600,
            letterSpacing: '0.05em',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={(e) => {
            (e.target as HTMLElement).style.background = 'rgba(255, 50, 50, 0.3)';
          }}
          onMouseOut={(e) => {
            (e.target as HTMLElement).style.background = 'rgba(255, 50, 50, 0.15)';
          }}
        >
          DISCONNECT
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={isConnecting}
      style={{
        background: isConnecting
          ? 'rgba(0, 255, 136, 0.1)'
          : 'linear-gradient(135deg, rgba(0, 255, 136, 0.2), rgba(0, 200, 255, 0.2))',
        border: '1px solid rgba(0, 255, 136, 0.5)',
        borderRadius: '8px',
        padding: '0.5rem 1.25rem',
        color: '#00ff88',
        cursor: isConnecting ? 'wait' : 'pointer',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
        transition: 'all 0.3s ease',
        boxShadow: '0 0 15px rgba(0, 255, 136, 0.1)',
      }}
      onMouseOver={(e) => {
        if (!isConnecting) {
          (e.target as HTMLElement).style.boxShadow = '0 0 25px rgba(0, 255, 136, 0.3)';
          (e.target as HTMLElement).style.borderColor = 'rgba(0, 255, 136, 0.8)';
        }
      }}
      onMouseOut={(e) => {
        (e.target as HTMLElement).style.boxShadow = '0 0 15px rgba(0, 255, 136, 0.1)';
        (e.target as HTMLElement).style.borderColor = 'rgba(0, 255, 136, 0.5)';
      }}
    >
      {isConnecting ? '⟳ CONNECTING...' : '⬡ CONNECT WALLET'}
    </button>
  );
}
