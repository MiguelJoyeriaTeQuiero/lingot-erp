"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Campo de polvo de oro sobre la bóveda oscura.
 * Blending aditivo → las partículas brillan como motas de metal suspendidas
 * en la penumbra de una cámara acorazada. Parallax de ratón + fade al hacer scroll.
 */
export function CatalogHeroWebGL() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let animId = 0;
    let mounted = true;

    const W      = window.innerWidth;
    const H      = window.innerHeight;
    const mobile = W < 768;

    const scene  = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, 0, 2000);
    camera.position.z = 500;

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // ── Paleta oro (brillante para glow aditivo sobre petróleo) ──────────
    const PAL = [
      new THREE.Color("#c8a164"),
      new THREE.Color("#e4c88f"),
      new THREE.Color("#f0dcae"),
      new THREE.Color("#a5813f"),
      new THREE.Color("#d8b475"),
    ];

    // ── Capas con parallax y velocidad propias ───────────────────────────
    const LAYERS = [
      { cnt: mobile ? 220 : 440, szMin: 0.8, szMax: 2.0, opMin: 0.06, opMax: 0.16, spd: 0.08, par: 0.006, z: -90, glint: false },
      { cnt: mobile ? 170 : 380, szMin: 1.2, szMax: 3.0, opMin: 0.10, opMax: 0.24, spd: 0.14, par: 0.014, z:   0, glint: false },
      { cnt: mobile ?  70 : 150, szMin: 2.0, szMax: 4.4, opMin: 0.14, opMax: 0.34, spd: 0.19, par: 0.024, z:  90, glint: false },
      { cnt: mobile ?  16 :  40, szMin: 4.0, szMax: 8.5, opMin: 0.30, opMax: 0.62, spd: 0.06, par: 0.018, z:  45, glint: true  },
    ];

    const TOTAL = LAYERS.reduce((s, l) => s + l.cnt, 0);

    const cpuX   = new Float32Array(TOTAL);
    const cpuY   = new Float32Array(TOTAL);
    const cpuVX  = new Float32Array(TOTAL);
    const cpuVY  = new Float32Array(TOTAL);
    const cpuPar = new Float32Array(TOTAL);

    const gPos   = new Float32Array(TOTAL * 3);
    const gCol   = new Float32Array(TOTAL * 3);
    const gSiz   = new Float32Array(TOTAL);
    const gOpa   = new Float32Array(TOTAL);
    const gGlint = new Float32Array(TOTAL);

    let idx = 0;
    for (const ld of LAYERS) {
      for (let i = 0; i < ld.cnt; i++, idx++) {
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
            ? 0.40 + 0.60 * sin(uTime * 1.6 + position.x * 0.02 + position.y * 0.014)
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
          float soft = smoothstep(0.5, 0.02, d);
          gl_FragColor = vec4(vColor, soft * vAlpha);
        }
      `,
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    });

    const mesh = new THREE.Points(geo, mat);
    scene.add(mesh);

    let mx = 0, my = 0, scrollY = 0;

    const onMouse = (e: MouseEvent) => {
      mx =  (e.clientX / window.innerWidth  - 0.5) * window.innerWidth;
      my = -(e.clientY / window.innerHeight - 0.5) * window.innerHeight;
    };
    const onScroll = () => { scrollY = window.scrollY; };
    const onResize = () => {
      const nW = window.innerWidth, nH = window.innerHeight;
      camera.left = -nW / 2; camera.right = nW / 2;
      camera.top  =  nH / 2; camera.bottom = -nH / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(nW, nH);
    };

    window.addEventListener("mousemove", onMouse,  { passive: true });
    window.addEventListener("scroll",    onScroll, { passive: true });
    window.addEventListener("resize",    onResize, { passive: true });

    const uniTime     = mat.uniforms["uTime"]     as { value: number };
    const uniGlobalOp = mat.uniforms["uGlobalOp"] as { value: number };

    let t = 0;
    const tick = () => {
      if (!mounted) return;
      animId = requestAnimationFrame(tick);
      t += 0.016;
      uniTime.value = t;

      const hw = window.innerWidth  / 2 + 14;
      const hh = window.innerHeight / 2 + 14;

      for (let i = 0; i < TOTAL; i++) {
        const x   = (cpuX[i]  ?? 0) + (cpuVX[i] ?? 0);
        const y   = (cpuY[i]  ?? 0) + (cpuVY[i] ?? 0);
        const par = cpuPar[i] ?? 0;

        const wx = x >  hw ? -hw : x < -hw ?  hw : x;
        const wy = y >  hh ? -hh : y < -hh ?  hh : y;

        cpuX[i] = wx; cpuY[i] = wy;
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
