"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '../components/WalletProvider';
import styles from './buy.module.css';

const TIERS = {
  basic: { name: 'BASIC', desc: '1 DEX / Standard RPC', mntCost: 0.001, label: '0.001 MNT' },
  pro:   { name: 'PREDATOR PRO', desc: 'All DEXs / Premium RPC', mntCost: 0.002, label: '0.002 MNT' },
} as const;

// Funds go to the newly deployed, payable registry contract on Mantle Sepolia
const TREASURY_ADDRESS = '0xd86C18c2b2e5Fc0dC5CCBD21416ECb0A8F8e57FA';
const MANTLESCAN_TX_URL = 'https://sepolia.mantlescan.xyz/tx/';

export default function BuyPage() {
  const router = useRouter();
  const { address, balance, signer, connect, isConnecting } = useWallet();

  const [step, setStep] = useState(1);
  const [tier, setTier] = useState<'basic' | 'pro'>('pro');
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');

  // Step 1 → connect wallet (real MetaMask)
  const handleConnect = async () => {
    setError('');
    await connect();
    // The WalletProvider will update `address` — we watch for that
  };

  // Auto-advance to step 2 when wallet connects
  React.useEffect(() => {
    if (address && step === 1) {
      setStep(2);
    }
  }, [address, step]);

  // Step 2 → send real MNT transaction
  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!signer) {
      setError('Wallet not connected. Please reconnect.');
      return;
    }

    const tierConfig = TIERS[tier];

    if (balance < tierConfig.mntCost) {
      setError(`Insufficient balance. You need at least ${tierConfig.label}. Get testnet MNT from faucet.sepolia.mantle.xyz`);
      return;
    }

    setIsProcessing(true);

    try {
      // Send real MNT to the registry contract address
      const { ethers } = await import('ethers');

      const tx = await signer.sendTransaction({
        to: TREASURY_ADDRESS,
        value: ethers.parseEther(tierConfig.mntCost.toString()),
      });

      // Wait for on-chain confirmation
      const receipt = await tx.wait();

      if (receipt && receipt.status === 1) {
        setTxHash(tx.hash);
        setStep(3);
      } else {
        setError('Transaction reverted on-chain. Please try again.');
      }
    } catch (err: any) {
      if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
        setError('Transaction rejected by user.');
      } else {
        setError(`Transaction failed: ${err.shortMessage || err.message}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.ambientGlow}></div>
      <div className="scanline-overlay"></div>

      <nav className={styles.nav}>
        <div className={styles.logo} onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>APEX.AI</div>
        <button className={styles.backBtn} onClick={() => router.push('/')}>&larr; BACK TO HOME</button>
      </nav>

      <main className={styles.mainContent}>
        {step === 1 && (
          <div className={styles.checkoutCard}>
            <div className={styles.cardHeader}>
              <h2>INITIALIZE APEX INSTANCE</h2>
              <p>Connect your wallet to deploy a Bot-Hunter agent on Mantle Sepolia.</p>
            </div>

            <button
              className={`${styles.primaryButton} ${isConnecting ? styles.processing : ''}`}
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? 'REQUESTING SIGNATURE...' : 'CONNECT WALLET'}
            </button>

            {error && <p className={styles.errorMsg}>{error}</p>}
          </div>
        )}

        {step === 2 && (
          <div className={styles.checkoutCard}>
            <div className={styles.cardHeader}>
              <h2>CONFIGURE DEPLOYMENT</h2>
              <p>Connected: {address?.substring(0, 6)}...{address?.substring(address.length - 4)}</p>
              <p style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.25rem' }}>
                Balance: {balance.toFixed(4)} MNT
              </p>
            </div>

            <form onSubmit={handlePurchase} className={styles.form}>
              <div className={styles.formGroup}>
                <label>LICENSE TIER</label>
                <div className={styles.tierSelector}>
                  {(Object.entries(TIERS) as [keyof typeof TIERS, typeof TIERS[keyof typeof TIERS]][]).map(([key, t]) => (
                    <div
                      key={key}
                      className={`${styles.tierOption} ${tier === key ? styles.selected : ''}`}
                      onClick={() => setTier(key)}
                    >
                      <h4>{t.name}</h4>
                      <span>{t.desc}</span>
                      <div className={styles.price}>{t.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className={`${styles.primaryButton} ${isProcessing ? styles.processing : ''}`}
                disabled={isProcessing}
              >
                {isProcessing ? 'AWAITING TX CONFIRMATION...' : `MINT LICENSE (${TIERS[tier].label})`}
              </button>
            </form>

            {error && <p className={styles.errorMsg}>{error}</p>}
          </div>
        )}

        {step === 3 && (
          <div className={styles.successCard}>
            <div className={styles.successIcon}>✓</div>
            <h2>DEPLOYMENT SUCCESSFUL</h2>
            <p>Your Apex Predator agent has been activated.</p>
            <div className={styles.receipt}>
              <div className={styles.receiptRow}>
                <span>TX HASH</span>
                <a
                  href={`${MANTLESCAN_TX_URL}${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.mono}
                  style={{ color: 'var(--color-info)', textDecoration: 'underline' }}
                >
                  {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 8)}
                </a>
              </div>
              <div className={styles.receiptRow}>
                <span>TIER</span>
                <span className={styles.mono}>{TIERS[tier].name}</span>
              </div>
              <div className={styles.receiptRow}>
                <span>COST</span>
                <span className={styles.mono}>{TIERS[tier].label}</span>
              </div>
              <div className={styles.receiptRow}>
                <span>NETWORK</span>
                <span className={styles.mono}>MANTLE SEPOLIA</span>
              </div>
            </div>
            <button className={styles.primaryButton} onClick={() => router.push('/dashboard')}>
              ENTER LIVE DASHBOARD
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
