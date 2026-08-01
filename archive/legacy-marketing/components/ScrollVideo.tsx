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

  // Detect mobile/touch devices
  useEffect(() => {
    const checkMobile = () => {
      const match =
        window.matchMedia("(max-width: 768px)").matches ||
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0;
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

  // Scroll progress tracking
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: [startOffset as any, endOffset as any],
  });

  // Sync scroll → video.currentTime (desktop only)
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (isMobile) return;
    const video = videoRef.current;
    if (!video || !video.duration || !isLoaded) return;

    const progressDelta = Math.abs(latest - lastProgressRef.current);
    const now = performance.now();
    const timeDelta = now - lastTimeRef.current;

    if (progressDelta < 0.006) return;
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
      const targetTime = Math.min(
        Math.max(latest * video.duration, 0.01),
        video.duration - 0.05
      );
      video.currentTime = targetTime;
    });
  });

  // Load video and set initial frame
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoaded = () => {
      setIsLoaded(true);
      if (!isMobile) {
        video.pause();
        video.currentTime = 0.01;
      } else {
        video.play().catch(() => {
          // Autoplay blocked silently — video will stay on poster frame
        });
      }
    };

    const handleError = () => {
      // Silent: video not critical to page structure
    };

    video.addEventListener("loadedmetadata", handleLoaded);
    video.addEventListener("canplaythrough", handleLoaded);
    video.addEventListener("error", handleError);
    video.load();

    return () => {
      video.removeEventListener("loadedmetadata", handleLoaded);
      video.removeEventListener("canplaythrough", handleLoaded);
      video.removeEventListener("error", handleError);
    };
  }, [src, isMobile]);

  return (
    // FIX: Use absolute inset-0 positioning so this fills the parent's
    // aspect-ratio box completely — resolves h-full collapse on mobile.
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        muted
        playsInline
        loop={isMobile}
        autoPlay={isMobile}
        preload="auto"
        poster={poster}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      >
        <source src={src} type="video/mp4" />
      </video>

      {/* Skeleton while video buffers */}
      {!isLoaded && (
        <div
          className="absolute inset-0 bg-slate-100 animate-pulse"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
