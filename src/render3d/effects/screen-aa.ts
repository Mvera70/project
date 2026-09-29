// GV-3 · El experimento de suavizado de bordes (29 sep 2026). **No es el
// juego**: sólo se enciende con `?aa=` en una página local (`file:`,
// `localhost`), así que el sitio publicado lo ignora, y sin él el renderer
// dibuja exactamente como antes.
//
//   ?aa=none   sin suavizado, como el nivel Medium de hoy en un aparato táctil
//   ?aa=msaa   el MSAA del lienzo (4 muestras), que el perfil Medium apaga
//   ?aa=fxaa   un filtro de pantalla sobre el lienzo 3D
//
// Lo que cuesta FXAA en este renderer, y por eso va aparte y cargado tarde:
// hoy se dibuja directo al lienzo con el ACES y el sRGB aplicados en cada
// material. Un filtro de pantalla obliga a dibujar la escena en un búfer de
// media precisión, pasar el mapeo de tonos (`OutputPass`) y después el filtro:
// dos pases de pantalla completa más y dos búferes de 8 bytes por píxel. FXAA
// va **después** del mapeo de tonos, que es donde trabaja bien; el
// `setEffects` de r185 lo pondría antes.
//
// El valor por omisión no cambia sin medirlo en un iPhone o un iPad de verdad
// (encargo GV-3): un dibujo por software no dice nada del coste en un móvil.

import type { Camera, Scene, WebGLRenderer } from 'three';

export type AaTrial = 'none' | 'msaa' | 'fxaa';

/** El suavizado pedido por la dirección, sólo en una página local; `null` si no. */
export function aaTrialOf(location: Pick<Location, 'protocol' | 'hostname' | 'search'>): AaTrial | null {
  const local = location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (!local) return null;
  const asked = new URLSearchParams(location.search).get('aa');
  return asked === 'none' || asked === 'msaa' || asked === 'fxaa' ? asked : null;
}

export interface ScreenAa {
  render(): void;
  /** Tamaño en CSS y densidad efectiva del lienzo, como se le dan al renderer. */
  setSize(widthCss: number, heightCss: number, pixelRatio: number): void;
  /** Lo que ocupan los búferes intermedios, en bytes (estimado: ancho × alto × 8 × 2). */
  memoryBytes(): number;
  dispose(): void;
}

/** La cadena de FXAA: escena en búfer, mapeo de tonos y filtro al lienzo. */
export async function createScreenAa(renderer: WebGLRenderer, scene: Scene, camera: Camera): Promise<ScreenAa> {
  const [{ EffectComposer }, { RenderPass }, { OutputPass }, { FXAAPass }] = await Promise.all([
    import('three/addons/postprocessing/EffectComposer.js'),
    import('three/addons/postprocessing/RenderPass.js'),
    import('three/addons/postprocessing/OutputPass.js'),
    import('three/addons/postprocessing/FXAAPass.js'),
  ]);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new OutputPass());
  composer.addPass(new FXAAPass());
  let pixels = 0;
  return {
    render(): void { composer.render(); },
    setSize(widthCss, heightCss, pixelRatio): void {
      composer.setPixelRatio(pixelRatio);
      composer.setSize(widthCss, heightCss);
      pixels = Math.round(widthCss * pixelRatio) * Math.round(heightCss * pixelRatio);
    },
    memoryBytes(): number { return pixels * 8 * 2; },
    dispose(): void { composer.dispose(); },
  };
}
