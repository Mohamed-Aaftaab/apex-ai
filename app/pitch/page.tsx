"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './pitch.module.css';

export default function PitchDeck() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "THE PROBLEM",
      subtitle: "THE DARK FOREST OF DEFI",
      content: (
        <div className={styles.slideContent}>
          <p>
            Retail Traders and Basic Bots are Prey.
            <br/><br/>
            Standard trading bots relying on price indicators (RSI, MACD) broadcast their intentions to the network milliseconds before execution.
            <br/><br/>
            They are immediately spotted by MEV (Miner Extractable Value) searchers. These predators front-run your trades, manipulate the slippage, and extract your profit before your block is even mined.
            <br/><br/>
            <strong>You cannot win by analyzing price. You must analyze behavior.</strong>
          </p>
        </div>
      )
    },
    {
      title: "THE SOLUTION",
      subtitle: "BEHAVIORAL BOT-HUNTING",
      content: (
        <div className={styles.gridContent}>
          <div className={styles.card}>
            <h3>1. INGEST</h3>
            <p>Connect directly to Mantle Network RPCs, streaming every pending transaction in real-time.</p>
          </div>
          <div className={styles.card}>
            <h3>2. CLUSTER</h3>
            <p>Our AI engine groups transaction signatures to identify predictable algorithmic bots.</p>
          </div>
          <div className={styles.card}>
            <h3>3. STRIKE</h3>
            <p>Apex calculates a front-run vector, wrapping the target's transaction to extract arbitrage profit.</p>
          </div>
        </div>
      )
    },
    {
      title: "THE TECHNOLOGY",
      subtitle: "BUILT FOR SPEED AND PRECISION",
      content: (
        <div className={styles.gridContent}>
          <div className={styles.techCard}>
            <h4>MANTLE NETWORK</h4>
            <p>Live execution environment utilizing Mantle's high-throughput architecture.</p>
          </div>
          <div className={styles.techCard}>
            <h4>ETHERS.JS V6</h4>
            <p>Direct low-level connection to blockchain RPCs.</p>
          </div>
          <div className={styles.techCard}>
            <h4>AGENTIC AI</h4>
            <p>Custom deterministic logic trees for behavioral clustering.</p>
          </div>
        </div>
      )
    },
    {
      title: "MANTLE ECOSYSTEM",
      subtitle: "A SYNERGISTIC INTEGRATION",
      content: (
        <div className={styles.gridContent}>
          <div className={styles.card}>
            <h3>MANTLE SEPOLIA</h3>
            <p>Our on-chain registry is live on Mantle Sepolia, providing a permanent public ledger of bot signatures.</p>
          </div>
          <div className={styles.card}>
            <h3>MANTLE MAINNET</h3>
            <p>Apex scans live blocks on Mantle Mainnet, identifying real malicious activity in the ecosystem.</p>
          </div>
          <div className={styles.card}>
            <h3>COMMUNITY REWARD</h3>
            <p>A portion of every 'strike' is distributed to MNT stakers, incentivizing a cleaner DeFi landscape.</p>
          </div>
        </div>
      )
    }
  ];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(curr => curr + 1);
    } else {
      router.push('/');
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(curr => curr - 1);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.ambientGlow}></div>
      <div className="scanline-overlay"></div>

      <nav className={styles.nav}>
        <div className={styles.logo} onClick={() => router.push('/')} style={{cursor: 'pointer'}}>APEX.AI</div>
        <button className={styles.closeBtn} onClick={() => router.push('/')}>✕ CLOSE DECK</button>
      </nav>

      <main className={styles.presentationArea}>
        <div className={styles.slideCounter}>
          {currentSlide + 1} / {slides.length}
        </div>

        <div className={styles.slideContainer} key={currentSlide}>
          <div className={styles.slideHeader}>
            <h2 className={styles.slideTitle}>{slides[currentSlide].title}</h2>
            <h3 className={styles.slideSubtitle}>{slides[currentSlide].subtitle}</h3>
          </div>
          
          <div className={styles.slideBody}>
            {slides[currentSlide].content}
          </div>
        </div>

        <div className={styles.controls}>
          <button 
            className={styles.controlBtn} 
            onClick={prevSlide}
            disabled={currentSlide === 0}
          >
            &larr; PREVIOUS
          </button>
          
          <div className={styles.dots}>
            {slides.map((_, idx) => (
              <span 
                key={idx} 
                className={`${styles.dot} ${idx === currentSlide ? styles.activeDot : ''}`}
                onClick={() => setCurrentSlide(idx)}
              />
            ))}
          </div>

          <button className={`${styles.controlBtn} ${styles.primaryBtn}`} onClick={nextSlide}>
            {currentSlide === slides.length - 1 ? 'FINISH DECK' : 'NEXT'} &rarr;
          </button>
        </div>
      </main>
    </div>
  );
}
