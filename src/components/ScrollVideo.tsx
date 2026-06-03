import { useRef, useEffect, useState } from "react";
import { useScroll, useMotionValueEvent } from "framer-motion";

interface ScrollVideoProps {
  src: string;
  className?: string;
  containerRef: React.RefObject<HTMLElement | HTMLDivElement | null>;
  startOffset?: string;
  endOffset?: string;
  poster?: string;
}

export default function ScrollVideo({
  src,
  className = "",
  containerRef,
  startOffset = "start end",
  endOffset = "end start",
  poster,
}: ScrollVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const lastProgressRef = useRef(0);
  const lastTimeRef = useRef(0);
  const animationFrameId = useRef<number | null>(null);

  // Check if we are on a touch device or mobile screen to fall back to autoplay
  useEffect(() => {
    const checkMobile = () => {
      const match = window.matchMedia("(max-width: 768px)").matches || 
                    ("ontouchstart" in window) || 
                    (navigator.maxTouchPoints > 0);
      setIsMobile(match);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  // Track the scroll progress of the target container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: [startOffset as any, endOffset as any],
  });

  // Sync scroll progress directly to video currentTime
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (isMobile) return; // Let autoplay handle it on mobile
    const video = videoRef.current;
    if (!video || !video.duration || !isLoaded) return;

    const progressDelta = Math.abs(latest - lastProgressRef.current);
    const now = performance.now();
    const timeDelta = now - lastTimeRef.current;

    // Filter: skip if change is tiny to prevent continuous fine calculations
    if (progressDelta < 0.006) return;

    // Filter: skip if scrolling too fast (velocity check) to prevent decoding buffer thrashing
    if (timeDelta > 0) {
      const velocity = progressDelta / timeDelta;
      if (velocity > 0.015) return;
    }

    lastProgressRef.current = latest;
    lastTimeRef.current = now;

    if (animationFrameId.current !== null) {
      cancelAnimationFrame(animationFrameId.current);
    }

    animationFrameId.current = requestAnimationFrame(() => {
      // Map scroll progress (0 to 1) to video duration (minus buffer)
      const targetTime = Math.min(Math.max(latest * video.duration, 0.01), video.duration - 0.05);
      video.currentTime = targetTime;
    });
  });

  // Load video metadata
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoaded = () => {
      setIsLoaded(true);
      if (!isMobile) {
        video.pause();
        video.currentTime = 0.01;
      }
    };

    video.addEventListener("loadedmetadata", handleLoaded);
    video.addEventListener("canplaythrough", handleLoaded);
    video.load();

    return () => {
      video.removeEventListener("loadedmetadata", handleLoaded);
      video.removeEventListener("canplaythrough", handleLoaded);
    };
  }, [src, isMobile]);

  return (
    <div className={`relative overflow-hidden w-full h-full ${className}`}>
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        loop={isMobile}
        autoPlay={isMobile}
        preload="auto"
        poster={poster}
        className="w-full h-full object-cover"
      />
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-50 animate-pulse flex items-center justify-center border border-slate-100 rounded-lg">
          <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase tracking-wider">Initializing media...</span>
        </div>
      )}
    </div>
  );
}
