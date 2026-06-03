import { useEffect, useRef, useState } from "react";

const DEBUG_VIDEO = false; // Set to true to show debug overlay

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
  const [debugLoaded, setDebugLoaded] = useState(false);

  // Intersection Observer: only mount video when near viewport
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

  // Debug + play handlers after video mounts
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isInView) return;

    console.log("[VIDEO] VIDEO_ELEMENT_FOUND", src);

    const handleCanPlay = () => {
      console.log("[VIDEO] VIDEO_SOURCE_LOADED", src);
      setDebugLoaded(true);
      video.play().then(() => {
        console.log("[VIDEO] VIDEO_PLAYING", src);
      }).catch((err) => {
        console.warn("[VIDEO] Autoplay blocked:", err);
      });
    };

    const handleError = (e: Event) => {
      console.error("[VIDEO] VIDEO_LOAD_ERROR", src, e);
    };

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("error", handleError);

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("error", handleError);
    };
  }, [isInView, src]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={DEBUG_VIDEO ? { border: "3px solid red", boxSizing: "border-box" } : undefined}
    >
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
            className="w-full h-full object-cover"
          >
            <source src={src} type="video/mp4" />
          </video>
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
        </>
      ) : (
        <div className="w-full h-full bg-slate-50 animate-pulse flex items-center justify-center border border-slate-100 rounded-lg">
          <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase tracking-wider">
            Loading media...
          </span>
        </div>
      )}
    </div>
  );
}
