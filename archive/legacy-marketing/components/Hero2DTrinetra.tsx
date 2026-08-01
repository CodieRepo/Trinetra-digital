import { useRef, useEffect } from "react";
import { gsap } from "../lib/gsap";

export default function Hero2DTrinetra() {
  const containerRef = useRef<HTMLDivElement>(null);
  const outerRingRef = useRef<SVGGElement>(null);
  const midRingRef = useRef<SVGGElement>(null);
  const innerRingRef = useRef<SVGGElement>(null);
  const irisRef = useRef<SVGCircleElement>(null);
  const eyePathRef = useRef<SVGPathElement>(null);
  const lightRayRef = useRef<SVGGElement>(null);

  useEffect(() => {
    // 1. Initial Line Drawing Entrance Animation (stroke-dash)
    const paths = containerRef.current?.querySelectorAll("path, circle");
    if (paths) {
      paths.forEach((pathNode) => {
        const path = pathNode as SVGPathElement;
        const length = path.getTotalLength();
        // Set up dash array
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length}`;
      });

      // Animate line drawing
      gsap.to(paths, {
        strokeDashoffset: 0,
        duration: 2.2,
        ease: "power2.out",
        stagger: 0.05,
      });
    }

    // 2. Continuous idle rotation (Gears & concentric rings rotating)
    gsap.to(outerRingRef.current, {
      rotation: 360,
      transformOrigin: "center center",
      duration: 35,
      repeat: -1,
      ease: "none",
    });

    gsap.to(midRingRef.current, {
      rotation: -360,
      transformOrigin: "center center",
      duration: 25,
      repeat: -1,
      ease: "none",
    });

    gsap.to(lightRayRef.current, {
      rotation: 360,
      transformOrigin: "center center",
      duration: 40,
      repeat: -1,
      ease: "none",
    });

    // 3. Mouse-Interactive Hover Effect (Iris tilts and pupil tracks cursor)
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate distance & angle from center
      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // Limit offset within the eyeball bounds (max 12px)
      const maxMove = 12;
      const angle = Math.atan2(deltaY, deltaX);
      const moveX = Math.cos(angle) * Math.min(distance * 0.08, maxMove);
      const moveY = Math.sin(angle) * Math.min(distance * 0.08, maxMove);

      // Track pupil/iris to cursor
      gsap.to(irisRef.current, {
        x: moveX,
        y: moveY,
        duration: 0.4,
        ease: "power2.out",
      });

      // Subtle scale-up of the aperture on close hover
      if (distance < 200) {
        gsap.to(innerRingRef.current, {
          scale: 1.06,
          transformOrigin: "center center",
          duration: 0.3,
        });
      } else {
        gsap.to(innerRingRef.current, {
          scale: 1,
          transformOrigin: "center center",
          duration: 0.4,
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    // 4. Scroll-Triggered mechanical aperture dilation and text tracking
    gsap.to(innerRingRef.current, {
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top center",
        end: "bottom top",
        scrub: 1,
      },
      rotation: 120,
      scale: 0.85,
      transformOrigin: "center center",
      ease: "none",
    });

    gsap.to(irisRef.current, {
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top center",
        end: "bottom top",
        scrub: 1,
      },
      scale: 1.25,
      transformOrigin: "center center",
      ease: "none",
    });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full max-w-[420px] aspect-square relative flex items-center justify-center pointer-events-auto select-none"
    >
      {/* Background ambient gold ray radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(194,109,92,0.12)_0%,transparent_60%)] blur-3xl rounded-full" />

      <svg
        viewBox="0 0 400 400"
        className="w-full h-full drop-shadow-[0_0_20px_rgba(194,109,92,0.1)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Subtle light rays back layer */}
        <g ref={lightRayRef} opacity="0.15">
          {Array.from({ length: 12 }).map((_, i) => (
            <line
              key={i}
              x1="200"
              y1="200"
              x2={200 + 170 * Math.cos((i * 30 * Math.PI) / 180)}
              y2={200 + 170 * Math.sin((i * 30 * Math.PI) / 180)}
              stroke="var(--color-accent)"
              strokeWidth="0.75"
              strokeDasharray="4 8"
            />
          ))}
        </g>

        {/* 1. Outer Ring - Segmented tech borders */}
        <g ref={outerRingRef}>
          <circle
            cx="200"
            cy="200"
            r="165"
            stroke="var(--color-accent)"
            strokeWidth="0.75"
            strokeOpacity="0.25"
          />
          <circle
            cx="200"
            cy="200"
            r="155"
            stroke="var(--color-accent)"
            strokeWidth="1.5"
            strokeOpacity="0.45"
            strokeDasharray="10 40 80 40"
          />
          {/* Ticks */}
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i * 15 * Math.PI) / 180;
            const x1 = 200 + 155 * Math.cos(angle);
            const y1 = 200 + 155 * Math.sin(angle);
            const x2 = 200 + 162 * Math.cos(angle);
            const y2 = 200 + 162 * Math.sin(angle);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--color-accent)"
                strokeWidth="1"
                strokeOpacity="0.4"
              />
            );
          })}
        </g>

        {/* 2. Middle Ring - Technical circular gears */}
        <g ref={midRingRef}>
          <circle
            cx="200"
            cy="200"
            r="130"
            stroke="var(--color-accent)"
            strokeWidth="1"
            strokeOpacity="0.3"
            strokeDasharray="2 6"
          />
          <circle
            cx="200"
            cy="200"
            r="120"
            stroke="var(--color-accent)"
            strokeWidth="2"
            strokeOpacity="0.6"
            strokeDasharray="50 15 10 15"
          />
        </g>

        {/* 3. Inner Ring - Shutter blades / Aperture guide */}
        <g ref={innerRingRef}>
          <circle
            cx="200"
            cy="200"
            r="90"
            stroke="var(--color-accent)"
            strokeWidth="0.75"
            strokeOpacity="0.4"
          />
          {/* Aperture shutter blades lines */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i * 45 * Math.PI) / 180;
            const x1 = 200 + 60 * Math.cos(angle);
            const y1 = 200 + 60 * Math.sin(angle);
            const x2 = 200 + 90 * Math.cos(angle + Math.PI / 6);
            const y2 = 200 + 90 * Math.sin(angle + Math.PI / 6);
            return (
              <path
                key={i}
                d={`M ${x1} ${y1} L ${x2} ${y2}`}
                stroke="var(--color-accent)"
                strokeWidth="1"
                strokeOpacity="0.5"
              />
            );
          })}
        </g>

        {/* 4. The Core Trinetra Eye - Eye outline and iris */}
        {/* Eye contour curves */}
        <path
          ref={eyePathRef}
          d="M 120 200 C 150 150, 250 150, 280 200 C 250 250, 150 250, 120 200 Z"
          stroke="var(--color-accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Eyeball clip mask containing the iris tracker */}
        <g>
          {/* Pupil / Iris */}
          <circle
            ref={irisRef}
            cx="200"
            cy="200"
            r="28"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="4"
            className="transition-transform duration-200"
          />
          {/* Center tiny aperture node */}
          <circle
            cx="200"
            cy="200"
            r="8"
            fill="var(--color-accent)"
          />
        </g>
      </svg>
    </div>
  );
}
