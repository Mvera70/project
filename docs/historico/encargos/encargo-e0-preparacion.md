# E0a · La aldea se prepara para el asedio

**Objetivo.** Cuando el jugador elige `raiders_coming:brace` y todavía hay una
partida en camino, el valle debe leerse preparado sin abrir ninguna otra pieza
de E0: parte de la gente guarda cargas bajo techo y el ganado abandona los
campos exteriores. Hoy la bandera `braced` cambia el resultado mecánico y la
pantalla sólo enseña la reunión genérica.

**Depende de.** B2 (`braced`), C2 (guarnición), V-08 (ganado), V-11
(órdenes), V-09 (cargas) y el observatorio `observe-life.mjs`. Todo existe.

**Ficheros.** Producción limitada a `src/render3d/life/` y, sólo si hace falta
exponer la escena o el tipo ya derivado, `src/render3d/`, `src/ui/debug.ts` y
`src/main.ts`. Pruebas nuevas o focalizadas en `tests/fast/`; observación en
`tools/graphics/observe-life.mjs`. No tocar `src/engine/`, balance, esquema,
catálogo de encrucijadas, daño, economía, asalto, pago ni semana posterior.
Si la solución necesita salir de esos ficheros, se declara antes de hacerlo.

## Contrato

- La preparación está activa **sólo** cuando la bandera `braced` sigue vigente,
  `state.threat.comingTick !== null` y `state.tick < comingTick`. Una bandera
  vieja después del asalto no mantiene la coreografía.
- Es lectura pura del estado: no consume RNG, no escribe en `GameState` y no
  cambia el resultado del asedio. Misma semilla, tick y fase de jornada dan la
  misma preparación.
- Entre **dos y cuatro adultos disponibles** guardan cargas. El reparto es
  determinista y se reduce con honestidad si no hay dos adultos o no existe
  ruta; nunca aparta a quien ocupa un puesto de guarnición.
- La carga sale de suelo exterior alcanzable —preferentemente campo o reserva—
  y termina en granero o molino; si no existen, en una casa en pie. Se reutiliza
  `carry_walk` y la carga de grano/haz existente: no se crea una malla.
- Mientras preparan, los animales del valle usan anclas seguras junto a casas
  interiores alcanzables en vez de los campos exteriores. No desaparecen, no
  cambian `state.herd` y vuelven a su reparto normal en una jornada no preparada.
- La guarnición conserva prioridad. Reuniones, necesidades, noche y huida
  mantienen sus contratos; prepararse no deja a nadie fuera al anochecer.
- El gancho de captura debe poder construir **la decisión**, no sólo una
  víspera genérica: el estado de depuración activa `braced` además de fijar la
  partida en camino, sin modificar el comportamiento de una partida normal.

## Reglas

- Sin animación nueva: a seis píxeles mandan el trayecto y la carga visible.
- Sin teletransporte. Toda ida usa suelo alcanzable y las rutas de la capa de
  vida; si no hay ruta, ese porte no se finge.
- Nada de cifras nuevas de balance. Los límites 2–4 son aforo escénico: dos
  hacen legible la acción y cuatro evitan vaciar una aldea pequeña de sus
  rutinas y de la guarnición.
- No convertir `braced` en una orden permanente del motor. Es una coreografía
  efímera reconstruida cada jornada.

## Tests exigidos

1. `braced` vigente + amenaza futura activa la preparación; cualquiera de las
   tres condiciones ausente la apaga.
2. El reparto es determinista y nunca elige un defensor asignado.
3. En preparación hay 2–4 porteadores cuando existen adultos y rutas
   suficientes; llevan carga hacia un almacén/casa alcanzable.
4. Las vacas dejan sus anclas de campo y el ganado queda en anclas interiores;
   sin preparación se conserva exactamente el reparto anterior.
5. El estado serializado antes y después de construir/avanzar la jornada es
   idéntico: la escena no escribe en el motor.
6. Typecheck, lint y únicamente los ficheros de prueba focalizados de esta
   ronda. No lanzar suites largas.

## Evidencia y terminado cuando

Rodar al menos dos valles con población y trazado distintos, comparando la
misma jornada con preparación activa e inactiva. La toma preparada debe mostrar
porteadores cargados entrando hacia almacén/casas, ganado fuera de los campos,
puestos defensivos conservados, cero errores de página, penetraciones o cuerpos
atascados. Guardar PNG de antes/mitad/después y el resumen del observatorio.

**Falsaría el brief** que la diferencia sólo se descubra leyendo una traza, que
los animales desaparezcan en vez de entrar, que un guardia abandone el puesto,
que una carga atraviese un muro o que la coreografía sobreviva después de que
`comingTick` deje de estar en el futuro.

No cerrar E0 completo: este encargo termina exclusivamente la fila
**Prepararse** de `docs/encargos-3d.md` §1.
