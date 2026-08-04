import React, { useRef, useEffect, useState } from 'react';
import { ScrollTrigger } from '../lib/gsap';
import { useScrollSequence } from '../hooks/useScrollSequence';

interface HeroScrollSequenceProps {
  children?: React.ReactNode;
  scrollDistance?: string; // e.g. '250vh' or '300vh'
}

/**
 * Intelligent frame mapping function for progressive storytelling pacing:
 * - First 20% scroll: Gentle, slow reveal (frames 1..45)
 * - Middle 60% scroll: Fluid normal playback (frames 45..255)
 * - Final 20% scroll: Slower dramatic finish (frames 255..301)
 */
function mapProgressToFrame(progress: number, totalFrames: number = 301): number {
  const p = Math.max(0, Math.min(1, progress));
  let mappedRatio: number;

  if (p < 0.2) {
    const t = p / 0.2;
    mappedRatio = Math.pow(t, 1.5) * 0.15; // Slow reveal
  } else if (p < 0.8) {
    const t = (p - 0.2) / 0.6;
    mappedRatio = 0.15 + t * 0.7; // Linear fluid middle
  } else {
    const t = (p - 0.8) / 0.2;
    const easeOut = 1 - Math.pow(1 - t, 1.8);
    mappedRatio = 0.85 + easeOut * 0.15; // Dramatic finish
  }

  return Math.max(1, Math.min(totalFrames, Math.round(1 + mappedRatio * (totalFrames - 1))));
}

export default function HeroScrollSequence({
  children,
  scrollDistance = '250vh',
}: HeroScrollSequenceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pinRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [currentFrameDisplay, setCurrentFrameDisplay] = useState<number>(1);
  const [scrollPercentDisplay, setScrollPercentDisplay] = useState<number>(0);

  const totalFrames = 301;

  const { isLoaded, progress, drawFrame } = useScrollSequence(canvasRef, containerRef, {
    totalFrames,
    framePrefix: '/hero-sequence/frame_',
    frameExtension: '.png',
    lazyLoad: true,
    fitMode: 'contain',
  });

  useEffect(() => {
    if (!isLoaded || !containerRef.current || !pinRef.current) return;

    // Draw frame 1 on initial load
    drawFrame(1);

    const triggerInstance = ScrollTrigger.create({
      trigger: containerRef.current,
      start: 'top top',
      end: scrollDistance,
      pin: pinRef.current,
      pinSpacing: true,
      scrub: 0.2, // 1:1 tight scrub sync
      anticipatePin: 1,
      onUpdate: (self) => {
        const rawProgress = self.progress;
        setScrollPercentDisplay(Math.round(rawProgress * 100));

        const targetFrame = mapProgressToFrame(rawProgress, totalFrames);
        setCurrentFrameDisplay(targetFrame);

        // Subtle scale zoom (1.0 to 1.05)
        const subtleScale = 1 + rawProgress * 0.04;
        drawFrame(targetFrame, { scale: subtleScale });
      },
    });

    return () => {
      triggerInstance.kill();
    };
  }, [isLoaded, drawFrame, scrollDistance, totalFrames]);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden bg-base text-ink-1 select-none"
    >
      {/* Preloader Screen Overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-base/95 backdrop-blur-lg min-h-screen">
          <div className="flex flex-col items-center gap-4 max-w-sm px-6 text-center">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 border border-accent/20">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-20" />
              <span className="text-xl">👁️</span>
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold tracking-tight text-ink-1 uppercase">
                Trinetra Digital
              </h3>
              <p className="text-xs text-ink-3 font-mono mt-1">
                Loading High-Resolution Geometric Sequence...
              </p>
            </div>
            <div className="w-full bg-surface-2 h-1.5 rounded-full overflow-hidden border border-border">
              <div
                className="bg-accent h-full transition-all duration-200 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-mono text-accent font-bold tracking-wider">
              {progress}%
            </span>
          </div>
        </div>
      )}

      {/* Pinned Cinematic Viewport */}
      <div
        ref={pinRef}
        className="relative w-full min-h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Full-width Background Canvas Layer */}
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-85">
          <canvas
            ref={canvasRef}
            className="w-full h-full max-w-[1200px] max-h-[900px] object-contain drop-shadow-[0_0_50px_rgba(197,168,128,0.18)]"
            aria-label="Trinetra Digital Hero Background Animation"
          />
        </div>

        {/* Ambient Radial Background Glow */}
        <div
          className="absolute inset-0 z-5 pointer-events-none opacity-40 blur-3xl"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(197, 168, 128, 0.22) 0%, rgba(10, 10, 12, 0) 70%)',
          }}
        />

        {/* Subtle Dark Edge Vignette */}
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, transparent 40%, rgba(10, 10, 12, 0.8) 100%)',
          }}
        />

        {/* Foreground Content Layer */}
        <div className="relative z-20 w-full h-full pointer-events-auto">
          {children}
        </div>

        {/* Floating Scroll Indicator Pill */}
        <div className="absolute bottom-6 z-30 flex flex-col items-center gap-2 pointer-events-none">
          <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-border/80 bg-surface-1/80 backdrop-blur-md shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
            </span>
            <span className="text-[10px] font-mono font-semibold tracking-wider text-ink-2">
              Frame {currentFrameDisplay} / {totalFrames}
            </span>
            <span className="text-[10px] font-mono font-bold text-accent">
              ({scrollPercentDisplay}%)
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.2em] text-ink-4">
            <span>Scroll down to control sequence</span>
          </div>
        </div>
      </div>
    </div>
  );
}
