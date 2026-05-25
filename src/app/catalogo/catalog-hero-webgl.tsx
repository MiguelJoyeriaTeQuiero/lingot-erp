"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function CatalogHeroWebGL() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === "undefined") return;

    let animId = 0;
    let mounted = true;

    const W       = window.innerWidth;
    const H       = window.innerHeight;
    const mobile  = W < 768;

    // Orthographic camera — 1 unit = 1 CSS pixel
    const scene  = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, 0, 2000);
    camera.position.z = 500;

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // ── Warm gold palette ──────────────────────────────────────────────
    const PAL = [
      new THREE.Color("#9a7230"),
      new THREE.Color("#b8923e"),
      new THREE.Color("#c8a164"),
      new THREE.Color("#6b4e1c"),
      new THREE.Color("#7a5c28"),
    ];

    // ── Layer definitions ──────────────────────────────────────────────
    // Each layer drifts at its own speed and parallax factor
    const LAYERS = [
      // Far dust — many tiny, clearly visible on cream
      { cnt: mobile ? 260 : 520, szMin: 0.8, szMax: 2.2, opMin: 0.16, opMax: 0.32, spd: 0.10, par: 0.006, z: -90, glint: false },
      // Mid field — main texture
      { cnt: mobile ? 200 : 460, szMin: 1.4, szMax: 3.5, opMin: 0.22, opMax: 0.44, spd: 0.17, par: 0.014, z:   0, glint: false },
      // Near layer — fewer, prominent
      { cnt: mobile ?  80 : 180, szMin: 2.2, szMax: 5.0, opMin: 0.28, opMax: 0.55, spd: 0.22, par: 0.024, z:  90, glint: false },
      // Glints — rare, large, shimmer
      { cnt: mobile ?  18 :  48, szMin: 4.5, szMax: 9.0, opMin: 0.42, opMax: 0.70, spd: 0.07, par: 0.018, z:  45, glint: true  },
    ];

    const TOTAL = LAYERS.reduce((s, l) => s + l.cnt, 0);

    // CPU-side state
    const cpuX   = new Float32Array(TOTAL);
    const cpuY   = new Float32Array(TOTAL);
    const cpuVX  = new Float32Array(TOTAL);
    const cpuVY  = new Float32Array(TOTAL);
    const cpuPar = new Float32Array(TOTAL);

    // GPU buffers
    const gPos   = new Float32Array(TOTAL * 3);
    const gCol   = new Float32Array(TOTAL * 3);
    const gSiz   = new Float32Array(TOTAL);
    const gOpa   = new Float32Array(TOTAL);
    const gGlint = new Float32Array(TOTAL);

    let idx = 0;
    for (const ld of LAYERS) {
      for (let i = 0; i < ld.cnt; i++, idx++) {
        // Scatter evenly across the viewport
        cpuX[idx]   = (Math.random() - 0.5) * W;
        cpuY[idx]   = (Math.random() - 0.5) * H;
        cpuPar[idx] = ld.par;

        const spd   = ld.spd * (0.3 + Math.random() * 0.7);
        const angle = Math.random() * Math.PI * 2;
        cpuVX[idx]  = Math.cos(angle) * spd;
        cpuVY[idx]  = Math.sin(angle) * spd;

        const c = PAL[Math.floor(Math.random() * PAL.length)] ?? PAL[0]!;
        gCol[idx * 3]     = c.r;
        gCol[idx * 3 + 1] = c.g;
        gCol[idx * 3 + 2] = c.b;

        gSiz[idx]   = ld.szMin + Math.random() * (ld.szMax - ld.szMin);
        gOpa[idx]   = ld.opMin + Math.random() * (ld.opMax - ld.opMin);
        gGlint[idx] = ld.glint ? 1.0 : 0.0;

        gPos[idx * 3]     = cpuX[idx] ?? 0;
        gPos[idx * 3 + 1] = cpuY[idx] ?? 0;
        gPos[idx * 3 + 2] = ld.z;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(gPos,   3));
    geo.setAttribute("aColor",   new THREE.BufferAttribute(gCol,   3));
    geo.setAttribute("aSize",    new THREE.BufferAttribute(gSiz,   1));
    geo.setAttribute("aOpacity", new THREE.BufferAttribute(gOpa,   1));
    geo.setAttribute("aGlint",   new THREE.BufferAttribute(gGlint, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:     { value: 0 },
        uGlobalOp: { value: 1.0 },
      },
      vertexShader: /* glsl */`
        attribute float aSize;
        attribute vec3  aColor;
        attribute float aOpacity;
        attribute float aGlint;
        varying   vec3  vColor;
        varying   float vAlpha;
        uniform   float uTime;
        uniform   float uGlobalOp;
        void main() {
          vColor = aColor;
          float shimmer = aGlint > 0.5
            ? 0.50 + 0.50 * sin(uTime * 1.8 + position.x * 0.018 + position.y * 0.012)
            : 1.0;
          vAlpha       = aOpacity * shimmer * uGlobalOp;
          gl_PointSize = aSize;
          gl_Position  = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        varying vec3  vColor;
        varying float vAlpha;
        void main() {
          vec2  uv = gl_PointCoord - 0.5;
          float d  = length(uv);
          if (d > 0.5) discard;
          float soft = smoothstep(0.5, 0.06, d);
          gl_FragColor = vec4(vColor, soft * vAlpha);
        }
      `,
      transparent: true,
      depthWrite:  false,
      blending:    THREE.NormalBlending,
    });

    const mesh = new THREE.Points(geo, mat);
    scene.add(mesh);

    // ── Input ──────────────────────────────────────────────────────────
    let mx = 0, my = 0, scrollY = 0;

    const onMouse = (e: MouseEvent) => {
      mx =  (e.clientX / window.innerWidth  - 0.5) * window.innerWidth;
      my = -(e.clientY / window.innerHeight - 0.5) * window.innerHeight;
    };
    const onScroll = () => { scrollY = window.scrollY; };
    const onResize = () => {
      const nW = window.innerWidth, nH = window.innerHeight;
      camera.left   = -nW / 2;
      camera.right  =  nW / 2;
      camera.top    =  nH / 2;
      camera.bottom = -nH / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(nW, nH);
    };

    window.addEventListener("mousemove", onMouse,  { passive: true });
    window.addEventListener("scroll",    onScroll, { passive: true });
    window.addEventListener("resize",    onResize, { passive: true });

    // ── Pre-cache uniform references ──────────────────────────────────
    const uniTime     = mat.uniforms["uTime"]     as { value: number };
    const uniGlobalOp = mat.uniforms["uGlobalOp"] as { value: number };

    // ── Render loop ────────────────────────────────────────────────────
    let t = 0;

    const tick = () => {
      if (!mounted) return;
      animId = requestAnimationFrame(tick);
      t += 0.016;
      uniTime.value = t;

      const hw = window.innerWidth  / 2 + 14;
      const hh = window.innerHeight / 2 + 14;

      for (let i = 0; i < TOTAL; i++) {
        // Read with ?? 0 fallback to satisfy noUncheckedIndexedAccess
        const x   = (cpuX[i]   ?? 0) + (cpuVX[i]  ?? 0);
        const y   = (cpuY[i]   ?? 0) + (cpuVY[i]  ?? 0);
        const par = cpuPar[i]  ?? 0;

        // Wrap edges
        const wx = x >  hw ? -hw : x < -hw ?  hw : x;
        const wy = y >  hh ? -hh : y < -hh ?  hh : y;

        cpuX[i] = wx;
        cpuY[i] = wy;

        // Mouse parallax per-layer
        gPos[i * 3]     = wx + mx * par;
        gPos[i * 3 + 1] = wy + my * par;
      }

      (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;

      const fade = Math.max(0, 1 - scrollY / (window.innerHeight * 0.85));
      uniGlobalOp.value = fade;

      renderer.render(scene, camera);
    };

    tick();

    return () => {
      mounted = false;
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("scroll",    onScroll);
      window.removeEventListener("resize",    onResize);
      renderer.domElement.remove();
      renderer.dispose();
      geo.dispose();
      mat.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{ zIndex: 1 }}
    />
  );
}
