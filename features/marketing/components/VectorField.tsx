"use client";

import { useEffect, useRef } from "react";

interface Point {
  x: number;
  y: number;
  z: number;
  /** Small per-point drift so the cloud breathes rather than rotating rigidly. */
  dx: number;
  dy: number;
  dz: number;
  hue: number;
}

const POINT_COUNT = 80;
const LINK_DISTANCE = 0.55;
const FOV = 2.6;
const ROTATION_PER_MS = 0.000055;

/** Palette hues: primary, secondary, accent. */
const HUES = [259, 233, 295];

/**
 * A slowly turning cloud of points that link to their nearest neighbours.
 * It is a picture of what the product does: passages placed in a vector space,
 * with the close ones joined.
 */
export function VectorField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const points: Point[] = Array.from({ length: POINT_COUNT }, () => {
      // Rejection-free spherical sampling, biased outward so the shell reads.
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 0.55 + Math.random() * 0.45;

      return {
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
        dx: (Math.random() - 0.5) * 0.00004,
        dy: (Math.random() - 0.5) * 0.00004,
        dz: (Math.random() - 0.5) * 0.00004,
        hue: HUES[Math.floor(Math.random() * HUES.length)],
      };
    });

    let width = 0;
    let height = 0;
    let scale = 0;

    function resize() {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();

      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      context!.setTransform(dpr, 0, 0, dpr, 0, 0);
      scale = Math.min(width, height) * 0.46;
    }

    resize();
    window.addEventListener("resize", resize);

    let frame = 0;
    let running = true;
    let lastTime = performance.now();
    let angle = 0;

    const projected = new Array(POINT_COUNT).fill(null).map(() => ({
      sx: 0,
      sy: 0,
      depth: 0,
      x: 0,
      y: 0,
      z: 0,
    }));

    function draw(now: number) {
      const elapsed = now - lastTime;
      lastTime = now;

      if (!reduceMotion) angle += elapsed * ROTATION_PER_MS;

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const cx = width / 2;
      const cy = height / 2;

      context!.clearRect(0, 0, width, height);

      for (let i = 0; i < POINT_COUNT; i += 1) {
        const p = points[i];

        if (!reduceMotion) {
          p.x += p.dx * elapsed;
          p.y += p.dy * elapsed;
          p.z += p.dz * elapsed;

          // Keep the cloud from dispersing.
          const dist = Math.hypot(p.x, p.y, p.z);
          if (dist > 1.05 || dist < 0.45) {
            p.dx *= -1;
            p.dy *= -1;
            p.dz *= -1;
          }
        }

        const rx = p.x * cos - p.z * sin;
        const rz = p.x * sin + p.z * cos;
        const perspective = FOV / (FOV + rz);

        const out = projected[i];
        out.sx = cx + rx * perspective * scale;
        out.sy = cy + p.y * perspective * scale;
        out.depth = perspective;
        out.x = rx;
        out.y = p.y;
        out.z = rz;
      }

      // Neighbour links first, so points sit on top of them.
      for (let i = 0; i < POINT_COUNT; i += 1) {
        for (let j = i + 1; j < POINT_COUNT; j += 1) {
          const a = projected[i];
          const b = projected[j];
          const gap = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
          if (gap > LINK_DISTANCE) continue;

          const strength = (1 - gap / LINK_DISTANCE) * 0.22 * ((a.depth + b.depth) / 2);
          context!.strokeStyle = `hsl(${points[i].hue} 45% 70% / ${strength})`;
          context!.lineWidth = 0.6;
          context!.beginPath();
          context!.moveTo(a.sx, a.sy);
          context!.lineTo(b.sx, b.sy);
          context!.stroke();
        }
      }

      for (let i = 0; i < POINT_COUNT; i += 1) {
        const p = projected[i];
        const radius = Math.max(0.6, p.depth * 1.7);
        context!.fillStyle = `hsl(${points[i].hue} 55% 78% / ${0.16 + p.depth * 0.3})`;
        context!.beginPath();
        context!.arc(p.sx, p.sy, radius, 0, Math.PI * 2);
        context!.fill();
      }

      if (running && !reduceMotion) frame = requestAnimationFrame(draw);
    }

    frame = requestAnimationFrame(draw);

    // Stop work entirely when the hero is scrolled away or the tab is hidden.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !running) {
          running = true;
          lastTime = performance.now();
          frame = requestAnimationFrame(draw);
        } else if (!entry.isIntersecting) {
          running = false;
          cancelAnimationFrame(frame);
        }
      },
      { threshold: 0 },
    );
    observer.observe(canvas);

    function onVisibility() {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(frame);
      } else if (!running) {
        running = true;
        lastTime = performance.now();
        frame = requestAnimationFrame(draw);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full"
    />
  );
}
