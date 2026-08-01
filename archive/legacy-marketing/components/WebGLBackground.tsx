import { useRef, useEffect } from "react";
import { ScrollTrigger } from "../lib/gsap";

export default function WebGLBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, radius: 140 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Configurable speeds
    let baseSpeedFactor = 1.0;
    const maxParticles = Math.min(width < 768 ? 40 : 90, 100);

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      baseRadius: number;
      radius: number;
      color: string;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        // Slow float speeds
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.baseRadius = Math.random() * 1.5 + 1;
        this.radius = this.baseRadius;
        this.color = "rgba(194, 109, 92, 0.45)"; // Terracotta Copper matching theme
      }

      update() {
        // Slow float
        this.x += this.vx * baseSpeedFactor;
        this.y += this.vy * baseSpeedFactor;

        // Wrap around borders
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;

        // Mouse hover interaction: push/pull behavior
        const dx = mouseRef.current.x - this.x;
        const dy = mouseRef.current.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouseRef.current.radius) {
          // Pull gently towards mouse
          const force = (mouseRef.current.radius - dist) / mouseRef.current.radius;
          this.x += (dx / dist) * force * 1.2;
          this.y += (dy / dist) * force * 1.2;
          this.radius = this.baseRadius * (1 + force * 0.8);
        } else {
          this.radius = THREE_lerp(this.radius, this.baseRadius, 0.1);
        }
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
      }
    }

    function THREE_lerp(start: number, end: number, amt: number) {
      return (1 - amt) * start + amt * end;
    }

    // Initialize particles
    for (let i = 0; i < maxParticles; i++) {
      particles.push(new Particle());
    }

    // Resize handler
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Mouse coordinates tracker
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    // Bind scroll speed to particle speed (ScrollTrigger)
    const st = ScrollTrigger.create({
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        // Fast scroll triggers higher velocity connection
        const velocity = Math.abs(self.getVelocity());
        baseSpeedFactor = 1.0 + Math.min(velocity * 0.005, 5.0);
      },
    });

    // Main animation loop
    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Decay baseSpeedFactor back to normal slowly
      baseSpeedFactor = THREE_lerp(baseSpeedFactor, 1.0, 0.03);

      // Draw constellation grid lines
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();

        // Check distance to other particles and draw connection lines
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            const alpha = (110 - dist) / 110 * 0.15;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(194, 109, 92, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      st.kill();
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 bg-[#090808] pointer-events-none overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(194,109,92,0.05)_0%,transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(194,109,92,0.03)_0%,transparent_50%)]" />

      {/* Dotted grid underlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(rgba(194, 109, 92, 0.04) 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
          opacity: 0.8,
        }}
      />

      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />
    </div>
  );
}
