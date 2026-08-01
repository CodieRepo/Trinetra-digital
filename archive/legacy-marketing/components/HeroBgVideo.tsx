import { useRef, useEffect, useState } from "react";

interface HeroBgVideoProps {
  src: string;
  poster?: string;
}

/**
 * Full-width background video for the Hero section.
 * Uses absolutely positioned video element that fills the entire parent.
 * Guaranteed visible on all devices — no h-full collapse, no z-index issues.
 */
export default function HeroBgVideo({ src, poster }: HeroBgVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onReady = () => {
      setIsReady(true);
      video.play().catch(() => {
        // Autoplay blocked — video stays on poster; acceptable UX
      });
    };

    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("canplaythrough", onReady);

    return () => {
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("canplaythrough", onReady);
    };
  }, [src]);

  return (
    <>
      {/* Skeleton while video buffers */}
      {!isReady && (
        <div
          className="absolute inset-0 bg-slate-900"
          aria-hidden="true"
        />
      )}

      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={poster}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          display: "block",
          zIndex: 0,
          opacity: isReady ? 1 : 0,
          transition: "opacity 0.8s ease",
        }}
      >
        <source src={src} type="video/mp4" />
      </video>
    </>
  );
}
