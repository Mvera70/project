// El sol de las sombras va por pasos (28 sep 2026).
//
// Vera, sobre el parpadeo de las sombras que ya se había intentado tapar con
// más resolución: «la típica sombra de un árbol, en vez de verse fija en el
// suelo y moverse poquito a poco como debería con el sol, parpadea y se mueve
// para un lado, para otro». **La causa no era la resolución, era el giro.** La
// cámara de sombra se reorientaba con el sol en cada fotograma —dos grados por
// segundo a ×1, que una jornada dura ciento veinte segundos— y el mapa se
// rasterizaba cada dos fotogramas con la rejilla de texeles girada un poco:
// cada borde de sombra caía en otros texeles y temblaba. Y el ajuste del
// centro «a la rejilla» se hacía en esa base que gira, así que en vez de fijar
// la sombra la hacía bailar media texela a cada lado. Subir el mapa a 2048 hizo
// la texela más pequeña; el baile siguió, más fino.
//
// Así que el rumbo del sol que ven las sombras **sólo cambia cuando el sol de
// verdad se ha movido más de un paso**. Entre pasos la cámara de sombra no se
// mueve —el mapa se sigue rehaciendo para la gente que anda, pero con la
// misma matriz, y lo quieto rasteriza igual fotograma a fotograma— y el
// alineado del centro a la rejilla vuelve a significar algo. Cada paso mueve
// todas las sombras un poco a la vez, en el mismo sentido: el reloj de sol
// avanza, no tiembla. Puro: sin Three, sin estado del motor.

export interface Direction { x: number; y: number; z: number }

/** Ángulo entre dos rumbos, en grados. Con un vector nulo, 180 (siempre se mueve). */
export function angleBetween(a: Readonly<Direction>, b: Readonly<Direction>): number {
  const la = Math.hypot(a.x, a.y, a.z), lb = Math.hypot(b.x, b.y, b.z);
  if (la === 0 || lb === 0 || !Number.isFinite(la + lb)) return 180;
  const cos = Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y + a.z * b.z) / (la * lb)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/**
 * Lleva `stepped` al rumbo `wanted` sólo si se ha separado más de `stepDegrees`.
 * Devuelve si ha cambiado. La primera vez (rumbo nulo o no finito) cambia siempre.
 */
export function stepSun(stepped: Direction, wanted: Readonly<Direction>, stepDegrees: number): boolean {
  if (angleBetween(stepped, wanted) < stepDegrees) return false;
  stepped.x = wanted.x;
  stepped.y = wanted.y;
  stepped.z = wanted.z;
  return true;
}

/**
 * El alcance de la cámara de sombra, a escalones: el zoom cambia el alcance
 * de forma continua y con él el tamaño de la texela, y un mapa con la texela
 * cambiando cada fotograma vuelve a rasterizar distinto cada vez.
 */
export function quantizeReach(reach: number, step: number): number {
  return Math.ceil(reach / step) * step;
}
