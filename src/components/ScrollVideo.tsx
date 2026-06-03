import { useRef, useEffect, useState } from "react";
import { useScroll, useMotionValueEvent } from "framer-motion";

const DEBUG_VIDEO = false; // Set to true to show debug overlay

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
  const [debugLoaded, setDebugLoaded] = useState(false);

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

  // Load video + debug logging
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    console.log("[VIDEO] VIDEO_ELEMENT_FOUND", src);

    const handleLoaded = () => {
      setIsLoaded(true);
      setDebugLoaded(true);
      console.log("[VIDEO] VIDEO_SOURCE_LOADED", src);
      if (!isMobile) {
        video.pause();
        video.currentTime = 0.01;
      } else {
        video.play().then(() => {
          console.log("[VIDEO] VIDEO_PLAYING", src);
        }).catch((err) => {
          console.warn("[VIDEO] Autoplay blocked:", err);
        });
      }
    };

    const handleError = (e: Event) => {
      console.error("[VIDEO] VIDEO_LOAD_ERROR", src, (e as ErrorEvent).message);
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
    <div
      className={`relative overflow-hidden w-full h-full ${className}`}
      style={DEBUG_VIDEO ? { border: "3px solid red", boxSizing: "border-box" } : undefined}
    >
      <video
        ref={videoRef}
        muted
        playsInline
        loop={isMobile}
        autoPlay={isMobile}
        preload="auto"
        poster={poster}
        className="w-full h-full object-cover"
      >
        <source src={src} type="video/mp4" />
      </video>

      {/* Debug overlay */}
      {DEBUG_VIDEO && debugLoaded && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            style={{
              background: "rgba(0,200,0,0.85)",
              color: "#fff",
              fontFamily: "monospace",
              fontSize: "11px",
              fontWeight: "bold",
              padding: "4px 10px",
              borderRadius: "4px",
              letterSpacing: "0.05em",
            }}
          >
            VIDEO LOADED SUCCESSFULLY
          </span>
        </div>
      )}

      {/* Loading placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-50 animate-pulse flex items-center justify-center border border-slate-100 rounded-lg">
          <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase tracking-wider">
            Initializing media...
          </span>
        </div>
      )}
    </div>
  );
}
