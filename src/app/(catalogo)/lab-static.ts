/* ═══════════════════════════════════════════════════════════════════════════
   Red de seguridad para cuando el JavaScript no llega entero.

   Googlebot carga los scripts de una web nueva a medias: unas veces no baja
   ninguno (y se queda con el HTML del servidor, que está completo) y otras baja
   algunos sí y otros no. En ese segundo caso React no puede montar la página y
   Next.js la sustituía por «Application error»: eso fue lo que Google indexó
   de la portada y de /nosotros en octubre de 2026.

   Tres piezas, para que en ningún caso se pierda el contenido:
   · SNAPSHOT: guarda el HTML de la página tal como llega del servidor, antes
     de que React lo toque. Si React falla a medias, error.tsx lo repone; si
     el fallo se lleva por delante el layout, lo repone global-error.tsx.
   · FAILSAFE: si a los 6 s React no ha arrancado, pinta la página en estático
     (.lab-static en lab.css): sin cortina y sin nada oculto a la espera de
     revelarse, como con el JavaScript desactivado.
   · data-lab-hydrated: lo pone LabHydrated al montar; desactiva el FAILSAFE.

   Módulo sin "use client": el layout (de servidor) necesita las cadenas como
   texto, no como referencia de cliente.
   ═══════════════════════════════════════════════════════════════════════════ */

export const PAGE_ID = "lab-page";
export const STATIC_CLASS = "lab-static";
export const HYDRATED_ATTR = "data-lab-hydrated";

export interface PageSnapshot {
  path:  string;
  title: string;
  html:  string;
}

declare global {
  interface Window { __LAB_SSR__?: PageSnapshot }
}

export const SNAPSHOT_SCRIPT = `try{var p=document.getElementById('${PAGE_ID}');
if(p)window.__LAB_SSR__={path:location.pathname,title:document.title,html:p.innerHTML};}catch(e){}`;

export const FAILSAFE_SCRIPT = `try{setTimeout(function(){
if(document.documentElement.hasAttribute('${HYDRATED_ATTR}'))return;
var s=document.querySelector('.lab-scope');if(s)s.classList.add('${STATIC_CLASS}');
},6000);}catch(e){}`;
