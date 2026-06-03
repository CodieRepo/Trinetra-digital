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
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect(); // Once loaded, keep it loaded
        }
      },
      {
        rootMargin: "200px 0px", // Start loading slightly before it enters the viewport
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      {isInView ? (
        <video
          src={src}
          poster={poster}
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          playsInline={playsInline}
          className="w-full h-full object-cover"
        />
      ) : (
        // Fallback loading background matching slate tokens to prevent CLS
        <div className="w-full h-full bg-slate-50 animate-pulse flex items-center justify-center border border-slate-100 rounded-lg">
          <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase tracking-wider">Loading media...</span>
        </div>
      )}
    </div>
  );
}
