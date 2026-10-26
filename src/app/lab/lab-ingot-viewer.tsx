"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { buildGoldEnvironment } from "./lab-gold-env";

/* ═══════════════════════════════════════════════════════════════════════════
   Visor de pieza: el lingote acuñado, girable por el cliente.

   El cuño NO es una foto pegada sobre la geometría. La textura entra como
   bumpMap: es relieve real que responde a la luz al girar la pieza, así que
   los brillos del sello se mueven como se moverían en el metal. Una foto como
   albedo traería su propia iluminación horneada y delataría el truco en cuanto
   la pieza rotase.

   El mapa de relieve se genera a partir de la foto de producto con un filtro
   de paso alto (quita la rampa de luz, conserva el cuño) — ver public/lab/.
   ═══════════════════════════════════════════════════════════════════════════ */

const damp = (c: number, t: number, l: number, dt: number) => c + (t - c) * (1 - Math.exp(-l * dt));

/** Perfil del lingote acuñado: rectángulo de esquinas redondeadas. */
function barShape(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const hw = w / 2, hh = h / 2;
  s.moveTo(-hw + r, -hh);
  s.lineTo(hw - r, -hh);
  s.quadraticCurveTo(hw, -hh, hw, -hh + r);
  s.lineTo(hw, hh - r);
  s.quadraticCurveTo(hw, hh, hw - r, hh);
  s.lineTo(-hw + r, hh);
  s.quadraticCurveTo(-hw, hh, -hw, hh - r);
  s.lineTo(-hw, -hh + r);
  s.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  return s;
}

/**
 * Cuño de un cubo de 1 g, dibujado por código.
 *
 * La foto de producto tiene 706 px para veinte cubos: recortar uno daría 50 px,
 * ilegible en cuanto la pieza se acerca. Dibujarlo aguanta cualquier zoom.
 * Gris medio = plano; lo oscuro se hunde.
 */
function combiTileTexture() {
  const W = 320, H = 480;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const base = c.getContext("2d");
  if (!base) return null;
  const ctx = base as CanvasRenderingContext2D & { letterSpacing: string };

  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, W, H);

  // Cuadro inciso en diagonal: el sello de la pirámide de Valcambi
  const cx = W * 0.34, cy = H * 0.26, r = W * 0.20;
  ctx.strokeStyle = "#4a4a4a";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy);
  ctx.closePath();
  ctx.stroke();
  // Aristas internas de la pirámide
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#5e5e5e";
  ctx.beginPath();
  ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
  ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
  ctx.stroke();

  ctx.fillStyle = "#484848";
  ctx.textBaseline = "middle";

  ctx.textAlign = "right";
  ctx.font = "400 46px Georgia, 'Times New Roman', serif";
  ctx.fillText("1 g", W * 0.88, H * 0.40);

  ctx.textAlign = "center";
  ctx.font = "400 44px Georgia, 'Times New Roman', serif";
  ctx.letterSpacing = "6px";
  ctx.fillText("fine gold", W * 0.5, H * 0.545);
  ctx.letterSpacing = "0px";
  ctx.font = "400 42px Georgia, 'Times New Roman', serif";
  ctx.fillText("999,9", W * 0.58, H * 0.655);

  // Recuadro del ensayador
  const bx = W * 0.12, by = H * 0.755, bw = W * 0.76, bh = H * 0.13;
  ctx.strokeStyle = "#565656";
  ctx.lineWidth = 4;
  ctx.strokeRect(bx, by, bw, bh);
  ctx.beginPath();
  ctx.moveTo(bx + bw * 0.26, by); ctx.lineTo(bx + bw * 0.26, by + bh);
  ctx.stroke();
  ctx.font = "500 19px Helvetica, Arial, sans-serif";
  ctx.fillText("CH", bx + bw * 0.13, by + bh * 0.5);
  ctx.font = "500 18px Helvetica, Arial, sans-serif";
  ctx.fillText("ESSAYEUR", bx + bw * 0.63, by + bh * 0.31);
  ctx.fillText("FONDEUR", bx + bw * 0.63, by + bh * 0.71);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

interface Props {
  /** Mapa de relieve del cuño (escala de grises, 128 = plano). */
  relief?: string;
  /** Si la pieza son cubos separables, su rejilla. El doble clic los desune. */
  grid?: { cols: number; rows: number };
}

export function LabIngotViewer({ relief, grid }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof window === "undefined") return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile  = window.innerWidth < 768;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: true, powerPreference: "high-performance" });
    } catch {
      return; // Sin WebGL no hay visor: la ficha de datos de al lado sigue en pie
    }

    let W = host.clientWidth  || 480;
    let H = host.clientHeight || 480;

    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.6 : 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 100);
    camera.position.set(0, 0, 7.2);

    const envRT = buildGoldEnvironment(renderer);
    scene.environment = envRT.texture;

    /* ── Geometría ────────────────────────────────────────────────────── */
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");

    const group = new THREE.Group();
    scene.add(group);

    // Piezas sueltas de un CombiBar. Vacío si la pieza es de una sola pieza.
    const tiles: { mesh: THREE.Mesh; bx: number; by: number; dist: number; tilt: number }[] = [];
    const disposables: { dispose: () => void }[] = [];

    const GOLD = new THREE.Color("#d9a748");

    const makeMaterials = (bump: THREE.Texture | null, scale: number) => {
      const face = new THREE.MeshPhysicalMaterial({
        color: GOLD,
        metalness: 1,
        roughness: 0.26,
        envMapIntensity: 2.5,
        clearcoat: mobile ? 0 : 0.3,
        clearcoatRoughness: 0.25,
        ...(bump ? { bumpMap: bump, bumpScale: scale } : {}),
      });
      const edge = new THREE.MeshPhysicalMaterial({
        color: GOLD, metalness: 1, roughness: 0.2, envMapIntensity: 2.4,
      });
      disposables.push(face, edge);
      return [face, edge];
    };

    let blockW = 1.82, blockH = 3.02;

    if (grid) {
      /* Un CombiBar no es una losa con surcos: son cubos de verdad, cada uno su
         malla. Solo así el doble clic puede separarlos y se ven los cantos. */
      const TW = 0.52, TH = 0.80, TT = 0.15, SEAM = 0.012;
      const pitchX = TW + SEAM, pitchY = TH + SEAM;
      blockW = grid.cols * pitchX;
      blockH = grid.rows * pitchY;

      const tileGeo = new THREE.ExtrudeGeometry(barShape(TW, TH, 0.055), {
        depth: TT,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.022,
        bevelSegments: mobile ? 1 : 3,
        curveSegments: mobile ? 4 : 8,
      });
      tileGeo.center();
      disposables.push(tileGeo);

      const die = combiTileTexture();
      if (die) {
        die.repeat.set(1 / TW, 1 / TH);
        die.offset.set(0.5, 0.5);
        die.anisotropy = renderer.capabilities.getMaxAnisotropy();
        disposables.push(die);
      }
      // Un solo material para las veinte piezas: veinte copias serían veinte
      // programas de shader por gastar.
      const mats = makeMaterials(die, 0.55);

      for (let r = 0; r < grid.rows; r++) {
        for (let c = 0; c < grid.cols; c++) {
          const mesh = new THREE.Mesh(tileGeo, mats);
          const bx = (c - (grid.cols - 1) / 2) * pitchX;
          const by = -(r - (grid.rows - 1) / 2) * pitchY;
          mesh.position.set(bx, by, 0);
          const i = r * grid.cols + c;
          tiles.push({
            mesh, bx, by,
            dist: Math.hypot(bx / blockW, by / blockH) * 2,
            // Desorden reproducible: sin él la separación parece una hoja de cálculo
            tilt: (((i * 37) % 11) - 5) * 0.02,
          });
          group.add(mesh);
        }
      }
    } else {
      const BAR_W = 1.82, BAR_H = 3.02, BAR_T = 0.135;
      blockW = BAR_W; blockH = BAR_H;

      const geo = new THREE.ExtrudeGeometry(barShape(BAR_W, BAR_H, 0.16), {
        depth: BAR_T,
        bevelEnabled: true,
        bevelThickness: 0.026,
        bevelSize: 0.03,
        bevelSegments: mobile ? 2 : 4,
        curveSegments: mobile ? 8 : 16,
      });
      geo.center();
      disposables.push(geo);

      let bump: THREE.Texture | null = null;
      if (relief) {
        bump = loader.load(relief);
        bump.colorSpace = THREE.NoColorSpace;
        bump.wrapS = THREE.ClampToEdgeWrapping;
        bump.wrapT = THREE.ClampToEdgeWrapping;
        bump.anisotropy = renderer.capabilities.getMaxAnisotropy();
        // Las UV de las tapas que genera ExtrudeGeometry son las coordenadas del
        // perfil: las normalizamos al rango 0..1 de la textura.
        bump.repeat.set(1 / BAR_W, 1 / BAR_H);
        bump.offset.set(0.5, 0.5);
        disposables.push(bump);
      }

      group.add(new THREE.Mesh(geo, makeMaterials(bump, 1.6)));
    }

    scene.add(new THREE.AmbientLight(0x9fd2e0, 0.3));
    const key = new THREE.DirectionalLight(0xffe3b4, 3.2);
    key.position.set(4, 6, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x74cbe6, 1.4);
    rim.position.set(-5, 1, -4);
    scene.add(rim);

    const fit = () => {
      // Encaje contra el tamaño real del bloque, con holgura para que al
      // separarse los cubos no se salgan del encuadre.
      const room = grid ? 1.34 : 1.0;
      const visH = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
      const visW = visH * (W / H);
      const s = Math.min(visW / (blockW * room), visH / (blockH * room)) * 0.86;
      group.scale.setScalar(THREE.MathUtils.clamp(s, 0.4, 1.6));
    };
    fit();

    /* ── Giro por arrastre ────────────────────────────────────────────── */
    let rotX = -0.22, rotY = -0.5;      // orientación actual
    let tgtX = -0.22, tgtY = -0.5;      // destino al que persigue
    let velY = 0;                       // inercia al soltar
    let dragging = false;
    let lastX = 0, lastY = 0;
    let idle = 0;                       // segundos sin tocar → vuelve a girar solo

    const onDown = (e: PointerEvent) => {
      dragging = true;
      idle = 0;
      velY = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      host.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      tgtY += dx * 0.009;
      // El eje X se limita: si la pieza se puede volcar del todo, el cliente
      // acaba mirando un canto y no sabe cómo volver.
      tgtX = THREE.MathUtils.clamp(tgtX + dy * 0.007, -0.85, 0.85);
      velY = dx * 0.009;
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      idle = 0;
      if (host.hasPointerCapture(e.pointerId)) host.releasePointerCapture(e.pointerId);
    };
    // Separación de los cubos (0 = bloque, 1 = sueltos)
    let spread = 0, tgtSpread = 0;

    /** Doble clic: separa los cubos, o da la vuelta si la pieza es única. */
    const onDouble = () => {
      idle = 0;
      if (grid) tgtSpread = tgtSpread > 0.5 ? 0 : 1;
      else tgtY += Math.PI;
    };

    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerup", onUp);
    host.addEventListener("pointercancel", onUp);
    host.addEventListener("dblclick", onDouble);

    const onResize = () => {
      W = host.clientWidth  || W;
      H = host.clientHeight || H;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
      fit();
    };
    window.addEventListener("resize", onResize, { passive: true });

    let visible = true;
    const io = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? true; }, { threshold: 0 });
    io.observe(host);

    /* ── Bucle ────────────────────────────────────────────────────────── */
    let raf = 0;
    let prev = performance.now();
    let alive = true;

    const frame = (now: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.max(0, Math.min(0.05, (now - prev) / 1000));
      prev = now;
      if (!visible || document.hidden) return;

      if (dragging) {
        idle = 0;
      } else {
        idle += dt;
        // Inercia al soltar, y giro lento de exposición cuando lleva un rato quieto
        tgtY += velY;
        velY *= 0.94;
        if (idle > 2.5 && !reduced) tgtY += dt * 0.22;
      }

      rotX = damp(rotX, tgtX, 9, dt);
      rotY = damp(rotY, tgtY, 9, dt);
      group.rotation.set(rotX, rotY, 0);

      // Los cubos giran solidarios con el grupo; solo su posición dentro de él
      // cambia, así que el bloque se abre sin dejar de ser una sola pieza.
      if (tiles.length) {
        spread = damp(spread, tgtSpread, 6, dt);
        if (spread > 0.001 || tgtSpread > 0) {
          for (const t of tiles) {
            const k = 1 + spread * 0.3;
            t.mesh.position.set(t.bx * k, t.by * k, spread * (0.06 + 0.16 * t.dist));
            t.mesh.rotation.z = spread * t.tilt;
          }
        }
      }
      // Flotación mínima: sin ella la pieza parece pegada al fondo
      group.position.y = reduced ? 0 : Math.sin(now / 1600) * 0.045;

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onUp);
      host.removeEventListener("dblclick", onDouble);
      window.removeEventListener("resize", onResize);
      renderer.domElement.remove();
      renderer.dispose();
      disposables.forEach((d) => d.dispose());
      envRT.dispose();
    };
  }, [relief, grid]);

  return <div ref={hostRef} className="lab-viewer-canvas" />;
}
