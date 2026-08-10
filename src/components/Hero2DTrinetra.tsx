import { useEffect, useRef } from "react";
import { animate, createTimeline, stagger } from "animejs";

/**
 * Hero2DTrinetra — Trinetra Intelligence Lens powered by Anime.js v4
 *
 * Standalone, continuously animated hero visual asset matching the
 * visual language of the original 301-frame geometric eye sequence.
 */
export default function Hero2DTrinetra() {
  const containerRef = useRef<HTMLDivElement>(null);
  const lensWrapRef = useRef<HTMLDivElement>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const fieldRef = useRef<SVGGElement>(null);
  const outerOrbitRef = useRef<SVGGElement>(null);
  const eyeContourRef = useRef<SVGGElement>(null);
  const ciliaRef = useRef<SVGGElement>(null);
  const circuitsRef = useRef<SVGGElement>(null);
  const irisGroupRef = useRef<SVGGElement>(null);
  const scanWedgeRef = useRef<SVGGElement>(null);
  const scanLineRef = useRef<SVGGElement>(null);
  const coreRef = useRef<SVGCircleElement>(null);
  const nodesRef = useRef<SVGGElement>(null);
  const starRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const activeAnims: Array<{ pause?: () => void; revert?: () => void }> = [];

    const tl = createTimeline({
      defaults: { ease: "inOutQuad" },
    });
    activeAnims.push(tl);

    if (eyeContourRef.current) {
      const paths = Array.from(eyeContourRef.current.querySelectorAll("path"));
      paths.forEach((path) => {
        const length = path.getTotalLength();
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length}`;
      });

      if (paths.length > 0) {
        tl.add(
          paths,
          {
            strokeDashoffset: 0,
            duration: 2200,
            delay: stagger(300),
            ease: "inOutCubic",
          },
          0
        );
      }
    }

    if (ciliaRef.current) {
      const ciliaPaths = Array.from(ciliaRef.current.querySelectorAll("path"));
      ciliaPaths.forEach((path) => {
        const length = path.getTotalLength();
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length}`;
      });

      if (ciliaPaths.length > 0) {
        tl.add(
          ciliaPaths,
          {
            strokeDashoffset: 0,
            opacity: [0, 0.25],
            duration: 1800,
            delay: stagger(40, { from: "center" }),
            ease: "outQuad",
          },
          800
        );
      }
    }

    if (circuitsRef.current) {
      const circuitPaths = Array.from(circuitsRef.current.querySelectorAll("path"));
      circuitPaths.forEach((path) => {
        const length = path.getTotalLength();
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length}`;
      });

      if (circuitPaths.length > 0) {
        tl.add(
          circuitPaths,
          {
            strokeDashoffset: 0,
            opacity: [0, 0.35],
            duration: 2000,
            delay: stagger(80, { from: "first" }),
            ease: "inOutSine",
          },
          1000
        );
      }
    }

    if (fieldRef.current) {
      activeAnims.push(
        animate(fieldRef.current, {
          rotate: "360deg",
          duration: 220000,
          ease: "linear",
          loop: true,
        })
      );
    }

    if (outerOrbitRef.current) {
      activeAnims.push(
        animate(outerOrbitRef.current, {
          rotate: "360deg",
          duration: 95000,
          ease: "linear",
          loop: true,
        })
      );
    }

    if (eyeContourRef.current) {
      activeAnims.push(
        animate(eyeContourRef.current, {
          scale: [1, 1.014],
          duration: 9000,
          alternate: true,
          ease: "inOutSine",
          loop: true,
        })
      );
    }

    if (irisGroupRef.current) {
      activeAnims.push(
        animate(irisGroupRef.current, {
          rotate: "-360deg",
          duration: 160000,
          ease: "linear",
          loop: true,
        })
      );
    }

    if (scanWedgeRef.current) {
      activeAnims.push(
        animate(scanWedgeRef.current, {
          rotate: "360deg",
          duration: 18000,
          ease: "linear",
          loop: true,
        })
      );
    }

    if (scanLineRef.current) {
      activeAnims.push(
        animate(scanLineRef.current, {
          rotate: "360deg",
          duration: 28000,
          ease: "linear",
          loop: true,
        })
      );
    }

    if (coreRef.current) {
      activeAnims.push(
        animate(coreRef.current, {
          scale: [1, 1.28],
          opacity: [0.7, 1],
          duration: 3800,
          alternate: true,
          ease: "inOutSine",
          loop: true,
        })
      );
    }

    if (nodesRef.current) {
      const nodes = Array.from(nodesRef.current.querySelectorAll(".anime-node"));
      if (nodes.length > 0) {
        activeAnims.push(
          animate(nodes, {
            opacity: [0.15, 0.75],
            scale: [0.8, 1.2],
            delay: stagger(220, { from: "center" }),
            duration: 2400,
            alternate: true,
            ease: "inOutQuad",
            loop: true,
          })
        );
      }
    }

    if (starRef.current) {
      activeAnims.push(
        animate(starRef.current, {
          opacity: [0.15, 0.55],
          scale: [0.9, 1.1],
          duration: 7000,
          alternate: true,
          ease: "inOutSine",
          loop: true,
        })
      );
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !lensWrapRef.current) return;
      if (window.innerWidth < 1024) return;

      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = (e.clientX - rect.left) / rect.width - 0.5;
      const relativeY = (e.clientY - rect.top) / rect.height - 0.5;

      animate(lensWrapRef.current, {
        rotateY: relativeX * 14,
        rotateX: -relativeY * 14,
        translateX: relativeX * 12,
        translateY: relativeY * 12,
        duration: 1200,
        ease: "outQuad",
      });
    };

    const handleMouseLeave = () => {
      if (!lensWrapRef.current) return;
      animate(lensWrapRef.current, {
        rotateY: 0,
        rotateX: 0,
        translateX: 0,
        translateY: 0,
        duration: 1500,
        ease: "outElastic(1, .5)",
      });
    };

    const el = containerRef.current;
    if (el) {
      el.addEventListener("mousemove", handleMouseMove);
      el.addEventListener("mouseleave", handleMouseLeave);
    }

    return () => {
      if (el) {
        el.removeEventListener("mousemove", handleMouseMove);
        el.removeEventListener("mouseleave", handleMouseLeave);
      }
      activeAnims.forEach((item) => {
        if (typeof item.pause === "function") item.pause();
        if (typeof item.revert === "function") item.revert();
      });
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full max-w-[540px] aspect-square relative flex flex-col items-center justify-center pointer-events-auto select-none py-2"
      style={{ perspective: "1200px" }}
    >
      {/* Background ambient radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(194,109,92,0.14)_0%,transparent_65%)] blur-3xl rounded-full pointer-events-none" />

      <div ref={lensWrapRef} className="w-full h-full relative" style={{ transformStyle: "preserve-3d" }}>
        <svg
          ref={svgRef}
          className="w-full h-auto block select-none pointer-events-none drop-shadow-[0_0_24px_rgba(194,109,92,0.12)]"
          viewBox="0 0 800 600"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Trinetra Intelligence Lens"
        >
          <defs>
            <radialGradient id="irisWarmGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0d0a07" />
              <stop offset="40%" stopColor="#1a1208" />
              <stop offset="70%" stopColor="#3d2810" stopOpacity="0.6" />
              <stop offset="90%" stopColor="#c8885a" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#c8885a" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="scanWedgeGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#c8885a" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#c8885a" stopOpacity="0" />
            </linearGradient>

            <filter id="coreGlow" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="irisGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <clipPath id="irisClip">
              <circle cx="400" cy="300" r="118" />
            </clipPath>
          </defs>

          {/* Layer 0 — Outer Architectural Field */}
          <g ref={fieldRef} opacity="0.12" style={{ transformOrigin: "400px 300px" }}>
            <circle cx="400" cy="300" r="280" fill="none" stroke="#8a8078" strokeWidth="0.5" />
            <circle cx="400" cy="300" r="260" fill="none" stroke="#8a8078" strokeWidth="0.4" strokeDasharray="4 6" />
            <circle cx="400" cy="300" r="240" fill="none" stroke="#8a8078" strokeWidth="0.5" />
            <circle cx="400" cy="300" r="220" fill="none" stroke="#8a8078" strokeWidth="0.3" strokeDasharray="2 8" />

            <line x1="60" y1="300" x2="740" y2="300" stroke="#8a8078" strokeWidth="0.4" />
            <line x1="400" y1="30" x2="400" y2="570" stroke="#8a8078" strokeWidth="0.4" />

            <circle cx="160" cy="140" r="45" fill="none" stroke="#8a8078" strokeWidth="0.5" />
            <circle cx="160" cy="140" r="28" fill="none" stroke="#8a8078" strokeWidth="0.4" />
            <circle cx="160" cy="140" r="8" fill="none" stroke="#8a8078" strokeWidth="0.4" />
            <rect x="130" y="115" width="60" height="50" rx="2" fill="none" stroke="#8a8078" strokeWidth="0.3" />

            <circle cx="130" cy="460" r="40" fill="none" stroke="#8a8078" strokeWidth="0.5" />
            <circle cx="130" cy="460" r="22" fill="none" stroke="#8a8078" strokeWidth="0.4" />
            <circle cx="130" cy="460" r="5" fill="#8a8078" fillOpacity="0.3" />

            <circle cx="640" cy="120" r="35" fill="none" stroke="#8a8078" strokeWidth="0.5" />
            <circle cx="640" cy="120" r="18" fill="none" stroke="#8a8078" strokeWidth="0.4" />
            <line x1="620" y1="120" x2="660" y2="120" stroke="#8a8078" strokeWidth="0.3" />

            <circle cx="660" cy="470" r="42" fill="none" stroke="#8a8078" strokeWidth="0.5" />
            <circle cx="660" cy="470" r="26" fill="none" stroke="#8a8078" strokeWidth="0.4" />
            <circle cx="660" cy="470" r="6" fill="none" stroke="#8a8078" strokeWidth="0.3" />

            <circle cx="90" cy="300" r="30" fill="none" stroke="#8a8078" strokeWidth="0.4" />
            <circle cx="90" cy="300" r="12" fill="none" stroke="#8a8078" strokeWidth="0.3" />

            <circle cx="710" cy="280" r="25" fill="none" stroke="#8a8078" strokeWidth="0.4" />
            <circle cx="710" cy="280" r="10" fill="none" stroke="#8a8078" strokeWidth="0.3" />

            <path d="M 180 80 A 250 250 0 0 1 350 40" fill="none" stroke="#8a8078" strokeWidth="0.4" />
            <path d="M 450 40 A 250 250 0 0 1 620 80" fill="none" stroke="#8a8078" strokeWidth="0.4" />
            <path d="M 180 520 A 250 250 0 0 0 350 560" fill="none" stroke="#8a8078" strokeWidth="0.4" />
            <path d="M 450 560 A 250 250 0 0 0 620 520" fill="none" stroke="#8a8078" strokeWidth="0.4" />

            <circle cx="220" cy="200" r="3" fill="#8a8078" fillOpacity="0.4" />
            <circle cx="580" cy="200" r="3" fill="#8a8078" fillOpacity="0.4" />
            <circle cx="220" cy="420" r="3" fill="#8a8078" fillOpacity="0.4" />
            <circle cx="580" cy="420" r="3" fill="#8a8078" fillOpacity="0.4" />
            <circle cx="320" cy="100" r="2" fill="#8a8078" fillOpacity="0.3" />
            <circle cx="480" cy="100" r="2" fill="#8a8078" fillOpacity="0.3" />
            <circle cx="320" cy="500" r="2" fill="#8a8078" fillOpacity="0.3" />
            <circle cx="480" cy="500" r="2" fill="#8a8078" fillOpacity="0.3" />

            <line x1="180" y1="296" x2="180" y2="304" stroke="#8a8078" strokeWidth="0.4" />
            <line x1="260" y1="296" x2="260" y2="304" stroke="#8a8078" strokeWidth="0.4" />
            <line x1="540" y1="296" x2="540" y2="304" stroke="#8a8078" strokeWidth="0.4" />
            <line x1="620" y1="296" x2="620" y2="304" stroke="#8a8078" strokeWidth="0.4" />
          </g>

          {/* Layer 1 — Outer Orbital Ring */}
          <g ref={outerOrbitRef} style={{ transformOrigin: "400px 300px" }}>
            <circle cx="400" cy="300" r="195" fill="none" stroke="#b87333" strokeOpacity="0.18" strokeWidth="0.6" />
            <circle cx="595" cy="300" r="3.5" fill="#b87333" fillOpacity="0.35" className="anime-node" />
            <circle cx="400" cy="105" r="3.5" fill="#b87333" fillOpacity="0.35" className="anime-node" />
            <circle cx="205" cy="300" r="3.5" fill="#b87333" fillOpacity="0.35" className="anime-node" />
            <circle cx="400" cy="495" r="3.5" fill="#b87333" fillOpacity="0.35" className="anime-node" />
            <circle cx="538" cy="162" r="2.5" fill="#b87333" fillOpacity="0.25" className="anime-node" />
            <circle cx="262" cy="162" r="2.5" fill="#b87333" fillOpacity="0.25" className="anime-node" />
            <circle cx="262" cy="438" r="2.5" fill="#b87333" fillOpacity="0.25" className="anime-node" />
            <circle cx="538" cy="438" r="2.5" fill="#b87333" fillOpacity="0.25" className="anime-node" />
          </g>

          {/* Layer 2 — Circuit / Neural Traces */}
          <g ref={circuitsRef} opacity="0.35">
            <path d="M 400 185 L 400 140 L 370 100" fill="none" stroke="#c8885a" strokeWidth="0.7" />
            <circle cx="370" cy="100" r="2.5" fill="#c8885a" fillOpacity="0.5" className="anime-node" />

            <path d="M 410 188 L 420 145 L 450 105 L 480 85" fill="none" stroke="#c8885a" strokeWidth="0.6" />
            <circle cx="480" cy="85" r="2.5" fill="#c8885a" fillOpacity="0.5" className="anime-node" />

            <path d="M 390 188 L 375 150 L 340 115 L 310 95" fill="none" stroke="#c8885a" strokeWidth="0.6" />
            <circle cx="310" cy="95" r="2.5" fill="#c8885a" fillOpacity="0.5" className="anime-node" />

            <path d="M 425 192 L 445 155 L 490 130 L 530 115" fill="none" stroke="#c8885a" strokeWidth="0.5" />
            <circle cx="530" cy="115" r="2" fill="#c8885a" fillOpacity="0.4" className="anime-node" />

            <path d="M 375 192 L 355 158 L 310 135 L 270 120" fill="none" stroke="#c8885a" strokeWidth="0.5" />
            <circle cx="270" cy="120" r="2" fill="#c8885a" fillOpacity="0.4" className="anime-node" />

            <path d="M 435 195 L 460 165 L 510 145" fill="none" stroke="#c8885a" strokeWidth="0.5" />
            <circle cx="510" cy="145" r="2" fill="#c8885a" fillOpacity="0.4" className="anime-node" />

            <path d="M 400 415 L 400 460 L 370 500" fill="none" stroke="#c8885a" strokeWidth="0.7" />
            <circle cx="370" cy="500" r="2.5" fill="#c8885a" fillOpacity="0.5" className="anime-node" />

            <path d="M 410 412 L 420 455 L 450 495 L 480 515" fill="none" stroke="#c8885a" strokeWidth="0.6" />
            <circle cx="480" cy="515" r="2.5" fill="#c8885a" fillOpacity="0.5" className="anime-node" />

            <path d="M 390 412 L 375 450 L 340 485 L 310 505" fill="none" stroke="#c8885a" strokeWidth="0.6" />
            <circle cx="310" cy="505" r="2.5" fill="#c8885a" fillOpacity="0.5" className="anime-node" />

            <path d="M 425 408 L 445 445 L 490 470 L 530 485" fill="none" stroke="#c8885a" strokeWidth="0.5" />
            <circle cx="530" cy="485" r="2" fill="#c8885a" fillOpacity="0.4" className="anime-node" />

            <path d="M 375 408 L 355 442 L 310 465 L 270 480" fill="none" stroke="#c8885a" strokeWidth="0.5" />
            <circle cx="270" cy="480" r="2" fill="#c8885a" fillOpacity="0.4" className="anime-node" />

            <path d="M 365 195 L 340 160 L 300 145" fill="none" stroke="#c8885a" strokeWidth="0.5" />
            <circle cx="300" cy="145" r="2" fill="#c8885a" fillOpacity="0.4" className="anime-node" />
          </g>

          {/* Layer 3 — Eye Contour */}
          <g ref={eyeContourRef} style={{ transformOrigin: "400px 300px" }}>
            <path
              d="M 170 300 C 230 175, 570 175, 630 300 C 570 425, 230 425, 170 300 Z"
              fill="none" stroke="#c8885a" strokeWidth="1.8" strokeLinejoin="round"
            />
            <path
              d="M 200 300 C 250 200, 550 200, 600 300 C 550 400, 250 400, 200 300 Z"
              fill="none" stroke="#c8885a" strokeWidth="0.8" strokeOpacity="0.5"
            />
          </g>

          {/* Layer 4 — Eyelash / Cilia Strokes */}
          <g ref={ciliaRef} opacity="0.25">
            <path d="M 320 200 Q 330 170, 315 140" fill="none" stroke="#c8885a" strokeWidth="0.6" />
            <path d="M 350 190 Q 355 155, 340 125" fill="none" stroke="#c8885a" strokeWidth="0.6" />
            <path d="M 380 183 Q 382 148, 375 115" fill="none" stroke="#c8885a" strokeWidth="0.6" />
            <path d="M 400 180 Q 400 145, 400 110" fill="none" stroke="#c8885a" strokeWidth="0.6" />
            <path d="M 420 183 Q 418 148, 425 115" fill="none" stroke="#c8885a" strokeWidth="0.6" />
            <path d="M 450 190 Q 445 155, 460 125" fill="none" stroke="#c8885a" strokeWidth="0.6" />
            <path d="M 480 200 Q 470 170, 485 140" fill="none" stroke="#c8885a" strokeWidth="0.6" />
            <path d="M 505 212 Q 500 185, 520 158" fill="none" stroke="#c8885a" strokeWidth="0.5" />
            <path d="M 295 212 Q 300 185, 280 158" fill="none" stroke="#c8885a" strokeWidth="0.5" />
            <path d="M 530 228 Q 530 205, 548 180" fill="none" stroke="#c8885a" strokeWidth="0.5" />
            <path d="M 270 228 Q 270 205, 252 180" fill="none" stroke="#c8885a" strokeWidth="0.5" />

            <path d="M 320 400 Q 330 430, 315 460" fill="none" stroke="#c8885a" strokeWidth="0.6" />
            <path d="M 350 410 Q 355 445, 340 475" fill="none" stroke="#c8885a" strokeWidth="0.6" />
            <path d="M 380 417 Q 382 452, 375 485" fill="none" stroke="#c8885a" strokeWidth="0.6" />
            <path d="M 400 420 Q 400 455, 400 490" fill="none" stroke="#c8885a" strokeWidth="0.6" />
            <path d="M 420 417 Q 418 452, 425 485" fill="none" stroke="#c8885a" strokeWidth="0.6" />
            <path d="M 450 410 Q 445 445, 460 475" fill="none" stroke="#c8885a" strokeWidth="0.6" />
            <path d="M 480 400 Q 470 430, 485 460" fill="none" stroke="#c8885a" strokeWidth="0.6" />
            <path d="M 505 388 Q 500 415, 520 442" fill="none" stroke="#c8885a" strokeWidth="0.5" />
            <path d="M 295 388 Q 300 415, 280 442" fill="none" stroke="#c8885a" strokeWidth="0.5" />
            <path d="M 530 372 Q 530 395, 548 420" fill="none" stroke="#c8885a" strokeWidth="0.5" />
            <path d="M 270 372 Q 270 395, 252 420" fill="none" stroke="#c8885a" strokeWidth="0.5" />
          </g>

          {/* Layer 5 — Iris Structure */}
          <g ref={irisGroupRef} style={{ transformOrigin: "400px 300px" }}>
            <circle cx="400" cy="300" r="125" fill="url(#irisWarmGrad)" filter="url(#irisGlow)" />
            <circle cx="400" cy="300" r="120" fill="none" stroke="#c8885a" strokeWidth="1.2" strokeOpacity="0.55" />
            <circle cx="400" cy="300" r="95" fill="none" stroke="#c8885a" strokeWidth="0.7" strokeOpacity="0.3" />
            <circle cx="400" cy="300" r="75" fill="none" stroke="#c8885a" strokeWidth="0.5" strokeOpacity="0.2" strokeDasharray="3 5" />

            <g opacity="0.15">
              {[...Array(36)].map((_, i) => {
                const angle = (i * 10 * Math.PI) / 180;
                const r1 = 110;
                const r2 = 118;
                return (
                  <line
                    key={`tick-${i}`}
                    x1={400 + r1 * Math.cos(angle)}
                    y1={300 + r1 * Math.sin(angle)}
                    x2={400 + r2 * Math.cos(angle)}
                    y2={300 + r2 * Math.sin(angle)}
                    stroke="#c8885a"
                    strokeWidth={i % 3 === 0 ? "0.6" : "0.3"}
                  />
                );
              })}
            </g>

            <g clipPath="url(#irisClip)" opacity="0.12">
              {[...Array(24)].map((_, i) => {
                const angle = (i * 15 * Math.PI) / 180;
                return (
                  <line
                    key={`ray-${i}`}
                    x1={400}
                    y1={300}
                    x2={400 + 140 * Math.cos(angle)}
                    y2={300 + 140 * Math.sin(angle)}
                    stroke="#c8885a"
                    strokeWidth="0.4"
                  />
                );
              })}
            </g>
          </g>

          {/* Layer 6 — Scan Wedge */}
          <g ref={scanWedgeRef} style={{ transformOrigin: "400px 300px" }}>
            <path
              d="M 400 300 L 400 180 A 120 120 0 0 1 504 240 Z"
              fill="url(#scanWedgeGrad)"
              opacity="0.6"
            />
          </g>

          {/* Layer 7 — Pupil + Core */}
          <g>
            <circle cx="400" cy="300" r="48" fill="#0a0806" />
            <circle cx="400" cy="300" r="48" fill="none" stroke="#c8885a" strokeWidth="0.8" strokeOpacity="0.4" />
            <circle cx="400" cy="300" r="32" fill="none" stroke="#c8885a" strokeWidth="0.4" strokeOpacity="0.2" />

            <circle
              ref={coreRef}
              cx="388"
              cy="290"
              r="7"
              fill="#c8885a"
              filter="url(#coreGlow)"
              style={{ transformOrigin: "388px 290px" }}
            />
            <circle cx="388" cy="290" r="2.5" fill="#f0ece6" fillOpacity="0.8" />
          </g>

          {/* Layer 8 — Data Points */}
          <g ref={nodesRef} opacity="0.25">
            <rect x="430" y="265" width="4" height="4" fill="#c8885a" className="anime-node" />
            <rect x="445" y="310" width="3" height="3" fill="#c8885a" className="anime-node" />
            <rect x="365" y="340" width="4" height="4" fill="#c8885a" className="anime-node" />
            <rect x="350" y="275" width="3" height="3" fill="#c8885a" className="anime-node" />
            <circle cx="460" cy="285" r="1.5" fill="#c8885a" className="anime-node" />
            <circle cx="340" cy="320" r="1.5" fill="#c8885a" className="anime-node" />
            <circle cx="420" cy="345" r="1.5" fill="#c8885a" className="anime-node" />
            <circle cx="375" cy="260" r="1.5" fill="#c8885a" className="anime-node" />
          </g>

          {/* Layer 9 — Scan Line */}
          <g ref={scanLineRef} style={{ transformOrigin: "400px 300px" }}>
            <line
              x1="400"
              y1="300"
              x2="400"
              y2="180"
              stroke="#c8885a"
              strokeOpacity="0.1"
              strokeWidth="0.75"
            />
          </g>

          {/* Layer 10 — Four-Pointed Star */}
          <g ref={starRef} opacity="0.25" style={{ transformOrigin: "684px 494px" }}>
            <path
              d="M 680 490 L 684 480 L 688 490 L 698 494 L 688 498 L 684 508 L 680 498 L 670 494 Z"
              fill="#9a9a9a"
            />
          </g>
        </svg>
      </div>

      {/* System status readout labels */}
      <div className="flex items-center gap-3 mt-3 select-none">
        <span className="font-mono text-[9px] font-semibold tracking-[0.16em] uppercase text-[#c8885a]/40">
          INTELLIGENCE LENS
        </span>
        <span className="text-[8px] text-[#c8885a]/20">·</span>
        <span className="font-mono text-[9px] font-semibold tracking-[0.16em] uppercase text-[#c8885a]/40">
          SYSTEM ACTIVE
        </span>
      </div>
    </div>
  );
}
