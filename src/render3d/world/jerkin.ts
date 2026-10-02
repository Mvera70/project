// K5 · El peto de cuero, puesto. design.md §7.17; encargo de la herrería.
//
// **Es una pieza y no un tinte**, y por una razón medida: el color de la ropa
// ya varía por persona (`dress` en `cast.ts`), así que un peto que sólo
// cambiara el tono del tronco se confundiría con un vecino de camisa parda. Lo
// que se lee a veinte píxeles es **la silueta**: hombreras que ensanchan los
// hombros —que es lo que la cámara del valle ve desde arriba— y una bandolera
// clara cruzada sobre el pecho, que ninguna ropa del valle lleva.
//
// Cuelga del hueso `spine`, igual que una herramienta cuelga de la mano, así
// que la anima el mismo esqueleto: la estocada, el golpe recibido, la caída y
// el muñeco de Rapier la llevan puesta sin que nadie la mueva. **Una malla y
// un material para todos los petos**: una llamada de dibujo más por defensor
// con peto, y ni una geometría por persona.
//
// Las medidas son las del aldeano publicado, en el marco del hueso (unidades
// del esqueleto, el triple que las del modelo): el tronco va de -0,165 a 0,385
// en alto, ±0,26 de ancho y de -0,17 a 0,214 de fondo —el pecho, hacia +Z,
// lleva la franja de color—; medido el 2 oct 2026 sobre los vértices pesados a
// `spine` de `villager.glb` (lo vigila `tests/fast/jerkin-piece.test.ts`).
// Sin sangre: sigue sin estar autorizada.

import { BoxGeometry, BufferAttribute, Color, Mesh, MeshStandardMaterial, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** El tronco del aldeano publicado, en el marco del hueso `spine`. */
export const TORSO_IN_SPINE = {
  bottom: -0.165, top: 0.385, halfWidth: 0.26, back: -0.17, front: 0.214,
} as const;

/** Los tonos del peto: cuero, cuero curtido de las hombreras, y la correa clara. */
export const JERKIN_TONES = {
  leather: '#8a5230',
  pads: '#4f2f19',
  strap: '#e6cf94',
} as const;

interface Piece {
  readonly size: readonly [number, number, number];
  readonly at: readonly [number, number, number];
  readonly tilt?: number;
  readonly tone: keyof typeof JERKIN_TONES;
}

/**
 * Las piezas, sobre el tronco medido. El cuerpo del peto le saca un dedo por
 * cada lado para no hundirse en la ropa cuando el tronco se dobla; las
 * hombreras sobresalen del hombro lo justo para cambiar la silueta.
 */
const PIECES: readonly Piece[] = [
  // El cuerpo: del ombligo a la clavícula.
  { size: [0.6, 0.46, 0.44], at: [0, 0.09, 0.025], tone: 'leather' },
  // Las hombreras, encima del arranque del brazo (x ±0,28, y 0,36).
  { size: [0.24, 0.1, 0.42], at: [-0.33, 0.35, 0.02], tone: 'pads' },
  { size: [0.24, 0.1, 0.42], at: [0.33, 0.35, 0.02], tone: 'pads' },
  // El cinto, abajo.
  { size: [0.64, 0.07, 0.48], at: [0, -0.12, 0.025], tone: 'strap' },
  // La bandolera, cruzada sobre el pecho y la espalda.
  { size: [0.08, 0.62, 0.03], at: [0, 0.1, 0.255], tilt: 0.72, tone: 'strap' },
  { size: [0.08, 0.62, 0.03], at: [0, 0.1, -0.21], tilt: -0.72, tone: 'strap' },
];

let shared: { geometry: BufferGeometry; material: MeshStandardMaterial } | null = null;

function build(): { geometry: BufferGeometry; material: MeshStandardMaterial } {
  const tone = new Color();
  const parts = PIECES.map((piece) => {
    const box = new BoxGeometry(...piece.size);
    if (piece.tilt !== undefined) box.rotateZ(piece.tilt);
    box.translate(...piece.at);
    // `Color.set` ya pasa el hexadecimal sRGB a lineal, que es lo que leen los vértices.
    tone.set(JERKIN_TONES[piece.tone]);
    const colours = new Float32Array(box.getAttribute('position').count * 3);
    for (let i = 0; i < colours.length; i += 3) {
      colours[i] = tone.r; colours[i + 1] = tone.g; colours[i + 2] = tone.b;
    }
    box.setAttribute('color', new BufferAttribute(colours, 3));
    return box;
  });
  const geometry = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
  return { geometry, material };
}

/** Un peto nuevo, listo para colgar del hueso `spine`. Comparte malla y material con todos. */
export function jerkinPiece(): Mesh {
  shared ??= build();
  const mesh = new Mesh(shared.geometry, shared.material);
  mesh.name = 'Jerkin';
  mesh.castShadow = true;
  // Es del valle entero, no de quien lo lleva: nadie la suelta al irse.
  mesh.userData.sharedPiece = true;
  return mesh;
}

/** La caja que ocupa el peto, en el marco del hueso: para las pruebas. */
export function jerkinBounds(): { min: [number, number, number]; max: [number, number, number] } {
  shared ??= build();
  shared.geometry.computeBoundingBox();
  const box = shared.geometry.boundingBox!;
  return { min: [box.min.x, box.min.y, box.min.z], max: [box.max.x, box.max.y, box.max.z] };
}
