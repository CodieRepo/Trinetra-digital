import { useEffect, useRef, useState } from "react";

interface LazyVideoProps {
  src: string;
  poster?: string;
  /** Pass className on the wrapper div — give it a defined height/aspect-ratio */
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
}

/**
 * Lazy-loaded video component.
 * The video element uses absolute inset-0 to fill its parent.
 * The parent must have a defined height (via aspectRatio, height, or absolute positioning).
 *
 * Usage:
 *   <div style={{ position: "relative", aspectRatio: "16/9" }}>
 *     <LazyVideo src="/videos/foo.mp4" className="absolute inset-0 w-full h-full" />
 *   </div>
 *
 * OR pass a class with an aspect ratio applied:
 *   <LazyVideo src="..." className="rounded-lg aspect-video border ..." />
 *   (aspect-video applies aspect-ratio:16/9 which gives the wrapper a resolved height)
 */
export default function LazyVideo({
  src,
  poster,
  className = "",
  autoPlay = true,
  loop = true,
  muted = true,
  playsInline = true,
}: LazyVideoProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Mount only when near viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "250px 0px" }
    );
    if (wrapperRef.current) observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  // Play after entering view
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isInView) return;

    const onReady = () => {
      setIsLoaded(true);
      if (autoPlay) {
        video.play().catch(() => {
          // Silently suppressed — autoplay may be blocked on some devices
        });
      }
    };

    video.addEventListener("canplay", onReady);
    video.addEventListener("loadedmetadata", onReady);

    return () => {
      video.removeEventListener("canplay", onReady);
      video.removeEventListener("loadedmetadata", onReady);
    };
  }, [isInView, autoPlay]);

  return (
    <div
      ref={wrapperRef}
      className={`relative overflow-hidden ${className}`}
    >
      {/* Pulse skeleton — visible while loading */}
      {(!isInView || !isLoaded) && (
        <div
          className="absolute inset-0 bg-slate-100 animate-pulse"
          aria-hidden="true"
        />
      )}

      {isInView && (
        <video
          ref={videoRef}
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          playsInline={playsInline}
          preload="auto"
          poster={poster}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            display: "block",
          }}
        >
          <source src={src} type="video/mp4" />
        </video>
      )}
    </div>
  );
}
