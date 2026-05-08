"use client";

import React, { useEffect, useRef } from 'react';
import styles from './AILogicFeed.module.css';

interface Log {
  id: string;
  time: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  link?: string;  // Optional Mantlescan verification URL
}

interface AILogicFeedProps {
  logs: Log[];
}

export default function AILogicFeed({ logs }: AILogicFeedProps) {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className={styles.feedContainer}>
      <div className={styles.header}>
        <h2>AI LOGIC STREAM</h2>
      </div>
      <div className={`mono ${styles.logArea}`}>
        {logs.map((log) => (
          <div key={log.id} className={`${styles.logEntry} ${styles[log.type]}`}>
            <span className={styles.time}>[{log.time}]</span>
            <span className={styles.message}>
              {log.message}
              {log.link && (
                <a
                  href={log.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.verifyLink}
                  title="Verify on Mantlescan"
                >
                  [VERIFY ↗]
                </a>
              )}
            </span>
          </div>
        ))}
        <div ref={endOfMessagesRef} />
      </div>
    </div>
  );
}
