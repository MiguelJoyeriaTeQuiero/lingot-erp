import * as THREE from "three";

/* ═══════════════════════════════════════════════════════════════════════════
   Entorno de estudio procedural, compartido por el hero y el visor de pieza.

   Se genera por código (PMREM sobre una escena mínima) en vez de cargar un HDRI:
   no hay nada que descargar antes del primer pintado y el oro queda idéntico en
   las dos escenas, que es lo que hace que la página se lea como una sola.
   ═══════════════════════════════════════════════════════════════════════════ */

export type MetalTheme = "oro" | "plata";

/** Paleta del estudio. En plata el fondo del hero es claro: si el suelo del
 *  entorno siguiera negro, la pieza tendría un canto sucio que no pega. */
const STUDIO = {
  oro: {
    floor: "vec3(0.015, 0.040, 0.052)",
    mid:   "vec3(0.330, 0.250, 0.150)",
    sky:   "vec3(1.480, 1.180, 0.800)",
    under: "vec3(0.10, 0.26, 0.34)",
    key:   "vec3(1.10, 0.82, 0.48)",
    fill:  "vec3(0.60, 0.72, 0.85)",
    boxes: [
      [18, 10, 0xffdfae, 7.0, 9, 12, 7],
      [14,  9, 0xffcf90, 4.2, -12, 6, 5],
      [20,  7, 0x8fdcf2, 1.4, -3, -7, -12],
      [10, 14, 0xfff0d6, 2.6, 0, 10, -11],
    ] as const,
  },
  plata: {
    floor: "vec3(0.240, 0.270, 0.290)",
    mid:   "vec3(0.520, 0.560, 0.590)",
    sky:   "vec3(1.620, 1.680, 1.740)",
    under: "vec3(0.18, 0.22, 0.26)",
    key:   "vec3(1.00, 1.04, 1.10)",
    fill:  "vec3(0.70, 0.78, 0.88)",
    boxes: [
      [18, 10, 0xffffff, 6.0, 9, 12, 7],
      [14,  9, 0xeef4f8, 3.6, -12, 6, 5],
      [20,  7, 0xbfe0ee, 1.6, -3, -7, -12],
      [10, 14, 0xffffff, 2.4, 0, 10, -11],
    ] as const,
  },
} as const;

export function buildGoldEnvironment(renderer: THREE.WebGLRenderer, theme: MetalTheme = "oro") {
  const P = STUDIO[theme];
  const env = new THREE.Scene();

  const domeMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {},
    vertexShader: /* glsl */`
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      varying vec3 vPos;
      void main() {
        vec3  d = normalize(vPos);
        float h = d.y * 0.5 + 0.5;

        // Hemisferio superior luminoso: es la fuente que hace que el metal lea
        // como metal desde cualquier ángulo de giro.
        vec3 floorC = ${P.floor};
        vec3 midC   = ${P.mid};
        vec3 skyC   = ${P.sky};

        vec3 col = mix(floorC, midC, smoothstep(0.32, 0.56, h));
        col = mix(col, skyC, smoothstep(0.56, 0.98, h));

        // Contra bajo el horizonte: define el canto de la masa
        col += ${P.under} * (1.0 - smoothstep(0.10, 0.40, h));

        // Un par de reflejos direccionales rompen la uniformidad
        col += ${P.key}  * pow(max(0.0, dot(d, normalize(vec3( 0.55, 0.72,  0.42)))), 22.0);
        col += ${P.fill} * pow(max(0.0, dot(d, normalize(vec3(-0.70, 0.30, -0.55)))), 30.0);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  env.add(new THREE.Mesh(new THREE.SphereGeometry(40, 24, 16), domeMat));

  const box = (w: number, h: number, color: number, intensity: number, pos: [number, number, number]) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity) })
    );
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    return m;
  };
  for (const [w, h, c, i, x, y, z] of P.boxes) env.add(box(w, h, c, i, [x, y, z]));

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const rt = pmrem.fromScene(env, 0, 0.1, 100);
  pmrem.dispose();
  domeMat.dispose();
  env.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
      else o.material.dispose();
    }
  });
  return rt;
}
