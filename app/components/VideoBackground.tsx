"use client";

import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface VideoBackgroundProps {
  src: string;
  className?: string;
  desaturate?: boolean;
}

export default function VideoBackground({ src, className = '', desaturate = false }: VideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (src.endsWith('.m3u8') && Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(e => console.error('Video autoplay failed:', e));
      });
      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // For Safari which has native HLS support
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(e => console.error('Video autoplay failed:', e));
      });
    } else if (src.endsWith('.mp4')) {
      video.src = src;
      video.play().catch(e => console.error('Video autoplay failed:', e));
    }
  }, [src]);

  return (
    <div className={`absolute inset-0 z-0 overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className={`w-full h-full object-cover ${desaturate ? 'grayscale saturate-100' : ''}`}
        style={{ filter: desaturate ? 'saturate(0)' : 'none' }}
      />
    </div>
  );
}
