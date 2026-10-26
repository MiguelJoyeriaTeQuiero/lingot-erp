/* ═══════════════════════════════════════════════════════════════════════════
   Arranque del tema — módulo de servidor a propósito.

   Esta cadena la inyecta el layout, que es un componente de servidor. Si viviera
   en el archivo del conmutador (que es "use client"), el layout la recibiría
   como referencia de cliente en vez de como texto y el <script> no llegaría a
   renderizarse: la página entraría siempre en oro y luego saltaría.

   El atributo se escribe en el contenedor del catálogo —el padre de este script— y
   no en <html>: React reconcilia los atributos de <html> y avisaría de que el
   servidor mandó uno de más. Así el tema no se sale de /lab.
   ═══════════════════════════════════════════════════════════════════════════ */

export type LabTheme = "oro" | "plata";

export const THEME_KEY = "lab-theme";

/** Corre antes del primer pintado: sin esto, quien tenga plata vería un fogonazo. */
export const THEME_BOOTSTRAP = `try{
var t=localStorage.getItem('${THEME_KEY}');
if(t!=='oro'&&t!=='plata'){t=matchMedia('(prefers-color-scheme: light)').matches?'plata':'oro';}
document.currentScript.parentElement.setAttribute('data-lab-theme',t);
}catch(e){}`;
