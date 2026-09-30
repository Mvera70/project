// Los presupuestos de tiempo de reloj que guardan las pruebas son del aparato
// del jugador (§13.2: «960 ticks en menos de dos segundos»; V-13: una jornada
// de la aldea, barata), y se fijaron en un portátil. El servidor de la CI no es
// ese aparato: mide lo mismo tres y cinco veces más lento, y con el número tal
// cual la prueba salía roja en cada ejecución sin que nada hubiera cambiado
// (30 sep 2026: `catchUp` 3,0–3,6 s contra 2 s; la jornada, 4,2 s contra 2,5).
//
// El número del diseño no se toca. Lo que cambia es la escala a la que se lee:
// `VALLEY_TIMING_SCALE` (1 por omisión, que es el portátil) multiplica el
// presupuesto en las máquinas que se sabe que son más lentas, y la CI dice la
// suya en `ci.yml` con la medida al lado. Sigue cazando una regresión de verdad:
// lo que cueste el doble que hoy vuelve a salir rojo también allí.
export function timingScale(): number {
  const raw = Number(process.env['VALLEY_TIMING_SCALE'] ?? '1');
  return Number.isFinite(raw) && raw >= 1 ? raw : 1;
}

/** El presupuesto del diseño, leído a la escala de esta máquina. */
export function budgetMs(designMs: number): number {
  return designMs * timingScale();
}
