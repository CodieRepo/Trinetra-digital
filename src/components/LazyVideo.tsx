import { useEffect, useRef, useState } from "react";

interface LazyVideoProps {
  src: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
}

export default function LazyVideo({
  src,
  poster,
  className = "",
  autoPlay = true,
  loop = true,
  muted = true,
  playsInline = true,
}: LazyVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Mount video only when near viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Trigger play after video is in view
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isInView) return;

    const handleCanPlay = () => {
      setIsLoaded(true);
      if (autoPlay) {
        video.play().catch(() => {
          // Autoplay blocked silently
        });
      }
    };

    video.addEventListener("canplay", handleCanPlay);
    return () => video.removeEventListener("canplay", handleCanPlay);
  }, [isInView, autoPlay]);

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      {isInView ? (
        <>
          <video
            ref={videoRef}
            autoPlay={autoPlay}
            loop={loop}
            muted={muted}
            playsInline={playsInline}
            preload="auto"
            poster={poster}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          >
            <source src={src} type="video/mp4" />
          </video>
          {!isLoaded && (
            <div
              className="absolute inset-0 bg-slate-100 animate-pulse"
              aria-hidden="true"
            />
          )}
        </>
      ) : (
        <div
          className="w-full h-full bg-slate-100 animate-pulse"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
