"use client";

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './landing.module.css';
import MarketVisualizer from './components/MarketVisualizer';
import ConnectWalletButton from './components/ConnectWalletButton';

// Custom hook for Intersection Observer
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
          }
        });
      },
      { threshold: 0.1 }
    );
    
    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }
    
    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);
  
  return ref;
}

const RevealSection = ({ children, delay = '' }: { children: React.ReactNode, delay?: string }) => {
  const ref = useReveal();
  return (
    <div ref={ref} className={[styles.revealWrapper, delay, styles.fullWidth].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
};

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className={styles.container}>
      <div className={styles.gridOverlay}></div>
      <div className={styles.ambientGlow1}></div>
      <div className={styles.ambientGlow2}></div>

      <nav className={styles.nav}>
        <div className={styles.logo}>APEX.AI</div>
        <div className={styles.navLinks}>
          <a href="/pitch">Pitch Deck</a>
          <a href="#demo-showcase">Demo App</a>
          <a href="/buy" className={styles.navHighlight}>Buy Agent</a>
          <ConnectWalletButton />
        </div>
      </nav>

      {/* 1. HERO SECTION */}
      <section className={styles.heroSection}>
        <RevealSection delay={styles.delay1}>
          <h1 className={styles.title}>
            THE <span className={styles.highlight}>APEX PREDATOR</span><br/> OF DEFI
          </h1>
        </RevealSection>
        
        <RevealSection delay={styles.delay2}>
          <p className={styles.description}>
            Autonomous Mantle Network MEV extraction and behavioral bot-hunting engine.
          </p>
        </RevealSection>

        <RevealSection delay={styles.delay3}>
          <div className={styles.actions}>
            <button className={styles.primaryButton} onClick={() => router.push('/dashboard')}>
              INITIALIZE ENGINE
            </button>
            <a href="/pitch" className={styles.secondaryButton}>
              VIEW PITCH DECK
            </a>
          </div>
        </RevealSection>
      </section>

      {/* 2. THE PROBLEM */}
      <section className={styles.contentSection}>
        <RevealSection>
          <div className={styles.sectionHeader}>
            <p>The Dark Forest</p>
            <h2>You Are Prey.</h2>
          </div>
        </RevealSection>

        <RevealSection delay={styles.delay1}>
          <div className={styles.problemContainer}>
            <div className={styles.problemText}>
              Standard trading bots broadcast their intentions to the network milliseconds before execution. They are immediately spotted by MEV searchers who front-run your trades and extract your profit before your block is even mined.
              <strong>You cannot win by analyzing price. You must analyze behavior.</strong>
            </div>
          </div>
        </RevealSection>
      </section>

      {/* 3. INTERACTIVE DEMO SHOWCASE */}
      <section id="demo-showcase" className={`${styles.contentSection} ${styles.altBg}`}>
        <RevealSection>
          <div className={styles.sectionHeader}>
            <p>Live Environment</p>
            <h2>The Engine In Action</h2>
          </div>
        </RevealSection>

        <RevealSection delay={styles.delay1}>
          <div className={styles.demoPreviewContainer}>
            <div className={styles.demoVisual}>
              <MarketVisualizer isLocked={true} />
            </div>
            <div className={styles.demoInfo}>
              <h3>Interactive Market Visualizer</h3>
              <p>
                Witness the engine mapping out predictive execution paths in real-time. The visualizer tracks live mempool activity and calculates front-run vectors before the block confirms.
              </p>
              <button className={styles.primaryButton} onClick={() => router.push('/dashboard')}>
                ENTER LIVE DASHBOARD
              </button>
            </div>
          </div>
        </RevealSection>
      </section>

      {/* 4. TECHNOLOGY USED */}
      <section className={styles.contentSection}>
        <RevealSection>
          <div className={styles.sectionHeader}>
            <p>Under The Hood</p>
            <h2>Built For Absolute Supremacy</h2>
          </div>
        </RevealSection>

        <RevealSection delay={styles.delay1}>
          <div className={styles.techGrid}>
            <div className={styles.techItem3D}>
              <h4>MANTLE NETWORK</h4>
              <p>Live execution environment utilizing Mantle's high-throughput architecture.</p>
            </div>
            <div className={styles.techItem3D}>
              <h4>ETHERS.JS V6</h4>
              <p>Direct low-level connection to blockchain RPCs.</p>
            </div>
            <div className={styles.techItem3D}>
              <h4>HEURISTIC AI</h4>
              <p>Custom deterministic logic trees for behavioral clustering.</p>
            </div>
            <div className={styles.techItem3D}>
              <h4>SUB-MILLISECOND STRIKE</h4>
              <p>Guaranteed extraction before the target transaction is mined.</p>
            </div>
          </div>
        </RevealSection>
      </section>

      {/* 5. PURCHASE CTA */}
      <section className={styles.createSection}>
        <div className={styles.createContainer3D}>
          <h2>Secure Your Edge.</h2>
          <p className={styles.createSub}>Deploy Your Own Autonomous Agent</p>
          <button className={styles.deployButton} onClick={() => router.push('/buy')}>
            PURCHASE LICENSE
          </button>
        </div>
      </section>

      <footer className={styles.footer}>
        © 2026 APEX.AI PROTOCOL. ALL RIGHTS RESERVED.
      </footer>
    </div>
  );
}
