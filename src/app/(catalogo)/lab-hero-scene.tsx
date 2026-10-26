"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { buildGoldEnvironment, type MetalTheme } from "./lab-gold-env";

/* ═══════════════════════════════════════════════════════════════════════════
   Escena 3D del hero: una masa de metal fundido.

   Deliberadamente abstracta — no un lingote literal. Una esfera desplazada por
   un campo de ondas que se recombinan sin repetirse: el metal antes de tener
   forma. Lee como oro líquido desde cualquier ángulo.

   · Material metálico físico con entorno generado por código (PMREM), sin HDRIs
     externos: nada que descargar antes del primer pintado.
   · El desplazamiento se inyecta en el shader de MeshPhysicalMaterial con
     onBeforeCompile, así conservamos reflejos, clearcoat y tone mapping reales.
   · Las normales se recalculan por muestreo tangente — sin eso el volumen se
     aplana y el reflejo delata la esfera de origen.
   ═══════════════════════════════════════════════════════════════════════════ */

const damp = (c: number, t: number, l: number, dt: number) => c + (t - c) * (1 - Math.exp(-l * dt));

/** Micro-variación de rugosidad: sin ella el metal lee como plástico. */
function brushedTexture() {
  const W = 512, H = 512;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#e6e6e6";
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 620; i++) {
    const y = Math.random() * H;
    const g = 200 + Math.floor(Math.random() * 56);
    ctx.strokeStyle = `rgba(${g},${g},${g},${0.08 + Math.random() * 0.18})`;
    ctx.lineWidth = 0.5 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(-20, y);
    ctx.lineTo(W + 20, y + (Math.random() - 0.5) * 4);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

/* Campo de ondas compartido por el desplazamiento y por el cálculo de normales.
   Tres senoidales cruzadas de periodos inconmensurables: la silueta nunca
   repite el mismo perfil, que es justo lo que evita que lea como una esfera. */
const FIELD = /* glsl */`
  uniform float uTime;
  uniform float uAmp;

  float labField(vec3 d) {
    float t = uTime;
    return uAmp * (
        sin(3.10 * d.x + t * 0.70) * cos(2.70 * d.y - t * 0.52)
      + 0.62 * sin(2.30 * d.z + t * 0.88) * cos(3.40 * d.x + t * 0.41)
      + 0.34 * sin(4.60 * d.y + t * 1.05) * cos(2.10 * d.z - t * 0.63)
      + 0.18 * sin(7.30 * d.x - t * 0.61) * cos(6.10 * d.z + t * 0.77)
    );
  }

  vec3 labSurface(vec3 d) {
    return d * (1.0 + labField(d));
  }
`;

export function LabHeroScene({ theme = "oro" }: { theme?: MetalTheme }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const plata = theme === "plata";

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof window === "undefined") return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile  = window.innerWidth < 768;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !mobile,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      return; // Sin WebGL: el hero sigue funcionando con el degradado CSS
    }

    let W = host.clientWidth  || window.innerWidth;
    let H = host.clientHeight || window.innerHeight;

    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.6 : 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, W / H, 0.1, 120);
    camera.position.set(0, 0.5, 7.4);
    camera.lookAt(0, 0, 0);

    const envRT = buildGoldEnvironment(renderer, theme);
    scene.environment = envRT.texture;

    /* ── La masa ──────────────────────────────────────────────────────── */
    // Icosaedro subdividido: triángulos uniformes, sin polos ni costura donde
    // el desplazamiento se note. Es la base correcta para deformar.
    const geo = new THREE.IcosahedronGeometry(1, mobile ? 4 : 5);

    const brushed = brushedTexture();

    const uniforms = {
      uTime: { value: 0 },
      uAmp:  { value: 0.17 },
    };

    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(plata ? "#c3ccd3" : "#d29b3e"),
      metalness: 1,
      roughness: plata ? 0.13 : 0.17,
      envMapIntensity: plata ? 1.9 : 2.4,
      clearcoat: mobile ? 0 : 0.35,
      clearcoatRoughness: 0.22,
      roughnessMap: brushed,
    });

    mat.onBeforeCompile = (shader) => {
      shader.uniforms["uTime"] = uniforms.uTime;
      shader.uniforms["uAmp"]  = uniforms.uAmp;

      shader.vertexShader = FIELD + shader.vertexShader;

      // Normal recalculada muestreando dos vecinos sobre la tangente: sin esto
      // los reflejos siguen describiendo la esfera de origen.
      shader.vertexShader = shader.vertexShader.replace(
        "#include <beginnormal_vertex>",
        /* glsl */`
        vec3 labDir = normalize(position);
        vec3 labRef = abs(labDir.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
        vec3 labTan = normalize(cross(labRef, labDir));
        vec3 labBit = cross(labDir, labTan);

        vec3 labP0 = labSurface(labDir);
        vec3 labP1 = labSurface(normalize(labDir + labTan * 0.035));
        vec3 labP2 = labSurface(normalize(labDir + labBit * 0.035));

        vec3 objectNormal = normalize(cross(labP1 - labP0, labP2 - labP0));
        if (dot(objectNormal, labDir) < 0.0) objectNormal = -objectNormal;
        `
      );

      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "vec3 transformed = labP0;"
      );
    };
    // Un shader inyectado necesita su propia clave de caché de programa
    mat.customProgramCacheKey = () => "lab-molten";

    const blob = new THREE.Mesh(geo, mat);
    // La silueta se deforma: sin esto el frustum culling la recorta al girar
    blob.frustumCulled = false;

    const group = new THREE.Group();
    group.add(blob);
    scene.add(group);

    const fit = () => {
      // El tamaño lo manda la dimensión más corta: mirando solo el ancho, en
      // pantallas bajas (portátil pequeño, apaisado) la masa pisaba el claim.
      const s = THREE.MathUtils.clamp(Math.min(W / 2300, H / 1250), 0.30, 0.66);
      group.scale.setScalar(s);
    };
    fit();

    /* ── Luces de apoyo (el entorno hace el grueso) ───────────────────── */
    scene.add(new THREE.AmbientLight(0x9fd2e0, 0.35));

    const key = new THREE.DirectionalLight(0xffe3b4, 3.4);
    key.position.set(5, 7, 5);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x74cbe6, 1.5);
    rim.position.set(-6, 2, -5);
    scene.add(rim);

    const fill = new THREE.PointLight(0xffd79a, 24, 22, 2);
    fill.position.set(-2.5, -2.2, 4);
    scene.add(fill);

    /* ── Polvo de oro ─────────────────────────────────────────────────── */
    const COUNT = mobile ? 260 : 820;
    const dustPos  = new Float32Array(COUNT * 3);
    const dustSeed = new Float32Array(COUNT);
    const dustSize = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      dustPos[i * 3]     = (Math.random() - 0.5) * 17;
      dustPos[i * 3 + 1] = (Math.random() - 0.5) * 11;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 9 - 1;
      dustSeed[i] = Math.random() * Math.PI * 2;
      dustSize[i] = 1.4 + Math.random() * 5.2;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    dustGeo.setAttribute("aSeed", new THREE.BufferAttribute(dustSeed, 1));
    dustGeo.setAttribute("aSize", new THREE.BufferAttribute(dustSize, 1));

    const dustMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: plata ? THREE.NormalBlending : THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uFade: { value: 1 },
        uDpr:  { value: renderer.getPixelRatio() },
        uAlpha: { value: plata ? 0.30 : 0.50 },
        uColdA: { value: plata ? new THREE.Vector3(0.36, 0.42, 0.47) : new THREE.Vector3(0.78, 0.63, 0.39) },
        uColdB: { value: plata ? new THREE.Vector3(0.55, 0.61, 0.66) : new THREE.Vector3(0.96, 0.87, 0.70) },
      },
      vertexShader: /* glsl */`
        attribute float aSeed;
        attribute float aSize;
        uniform float uTime;
        uniform float uDpr;
        varying float vTwinkle;
        void main() {
          vec3 p = position;
          p.y += sin(uTime * 0.22 + aSeed) * 0.5;
          p.x += cos(uTime * 0.16 + aSeed * 1.7) * 0.42;
          vTwinkle = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * 1.5 + aSeed * 3.1));
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = aSize * uDpr * (7.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */`
        uniform float uFade;
        uniform float uAlpha;
        uniform vec3  uColdA;
        uniform vec3  uColdB;
        varying float vTwinkle;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float soft = smoothstep(0.5, 0.0, d);
          vec3 col = mix(uColdA, uColdB, vTwinkle);
          gl_FragColor = vec4(col, soft * soft * uAlpha * vTwinkle * uFade);
        }
      `,
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    /* ── Interacción ──────────────────────────────────────────────────── */
    let mxT = 0, myT = 0, mx = 0, my = 0;
    let scrollP = 0;
    let visible = true;
    let born = 0;

    const onPointer = (e: PointerEvent) => {
      mxT = (e.clientX / window.innerWidth  - 0.5) * 2;
      myT = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const onScroll = () => {
      scrollP = Math.min(1.4, window.scrollY / Math.max(1, window.innerHeight));
    };
    const onResize = () => {
      W = host.clientWidth  || window.innerWidth;
      H = host.clientHeight || window.innerHeight;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
      dustMat.uniforms["uDpr"]!.value = renderer.getPixelRatio();
      fit();
    };

    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    onScroll();

    const io = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? true; }, { threshold: 0 });
    io.observe(host);

    /* ── Bucle ────────────────────────────────────────────────────────── */
    const BASE_POS_Y = -2.0;

    let raf = 0;
    let start = performance.now();
    let prev = start;
    // La entrada del lingote no corre mientras la cortina tapa la escena: si
    // no, se consumiría entera detrás de la cita y no se vería nacer.
    const html = document.documentElement;
    let t = 0;
    let alive = true;

    const frame = (now: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      // El primer timestamp de rAF puede preceder a nuestro reloj inicial:
      // acotamos dt por abajo para que la entrada nunca retroceda.
      const dt = Math.max(0, Math.min(0.05, (now - prev) / 1000));
      prev = now;
      if (!visible || document.hidden) return;
      if (!html.hasAttribute("data-lab-ready")) start = now;

      t    = Math.max(0, (now - start) / 1000);
      born = Math.min(1, t / 1.7);
      const intro = 1 - Math.pow(1 - born, 4); // easeOutQuart

      mx = damp(mx, mxT, 4.2, dt);
      my = damp(my, myT, 4.2, dt);

      const idle = reduced ? 0 : t;

      uniforms.uTime.value = idle;
      // Nace casi esférica, se abre al asentarse y se recoge al hacer scroll
      uniforms.uAmp.value = (0.05 + 0.17 * intro) * (1 - scrollP * 0.4);

      group.rotation.y = idle * 0.13 + mx * 0.38;
      group.rotation.x = my * 0.24 + Math.sin(idle * 0.42) * 0.06 + scrollP * 0.35;
      group.rotation.z = Math.sin(idle * 0.31) * 0.05;

      group.position.y = BASE_POS_Y + Math.sin(idle * 0.7) * 0.08 - scrollP * 2.1 - (1 - intro) * 0.9;
      group.position.x = mx * 0.14;

      camera.position.z = 7.4 + scrollP * 2.6 + (1 - intro) * 1.4;
      camera.position.y = 0.5 - my * 0.18;
      camera.lookAt(0, BASE_POS_Y * 0.45, 0);

      dust.rotation.y = idle * 0.014 + mx * 0.06;
      dust.position.y = -scrollP * 1.1;
      dustMat.uniforms["uTime"]!.value = t;
      dustMat.uniforms["uFade"]!.value = Math.max(0, 1 - scrollP * 1.15) * intro;

      host.style.opacity = String(Math.max(0, 1 - scrollP * 1.05) * intro);

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      renderer.domElement.remove();
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      brushed?.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      envRT.dispose();
    };
  }, [theme, plata]);

  return <div ref={hostRef} className="lab-hero-canvas" aria-hidden style={{ opacity: 0 }} />;
}
