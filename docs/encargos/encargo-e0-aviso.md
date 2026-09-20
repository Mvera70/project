# E0b · Aviso físico del asedio

## Objetivo

Representar B2 con **un mensajero a pie** que vuelve desde el acceso real del
clan hacia el núcleo. La escena empieza al cerrar `raiders_coming`, convive con
la reunión ya declarada por la opción y no añade mallas, texto ni estado al
motor.

## Decisión de puesta en escena

**Astra, por delegación de Vera (20 sep 2026).** La modal de la encrucijada es
un corte de escena. Oculta el tramo de salida; la primera jornada posterior
puede reconstruir a un adulto existente en el corredor exterior y enseñar sólo
su regreso. No es continuidad física entre dos fotogramas visibles: es el
encuadre inicial de la escena nueva. Dentro de esa escena no hay salto: todo el
regreso usa la navegación y las colisiones normales.

Esta excepción es deliberadamente estrecha. El renderer conserva la posición
anterior de todos los demás cuerpos y sólo respeta el origen nuevo del
`Dweller.warning` creado al cerrar B2.

## Dependencias y alcance

- `DecisionRecord` de `raiders_coming` en el tick actual y amenaza futura.
- `approachOf` reutiliza la misma entrada exterior que el asalto.
- `gather` sigue siendo la reunión posterior; el mensajero ocupa un solo cuerpo.
- Producción: `life/siege-warning.ts`, `life/village.ts`, la exportación mínima
  de `life/raiders.ts`, y el relevo escénico/diagnóstico de `renderer.ts`.
- Observación: `ui/debug.ts`, `main.ts` y `tools/graphics/observe-life.mjs`.
- Prueba: `tests/fast/life-siege-warning.test.ts`.

No toca `src/engine/`, balance, esquema, guardados, daño, economía, Rapier ni
activos.

## Contrato

- `SiegeWarning { since, origin, route, phase: 'return' }` vive sólo en
  `Dweller.warning`.
- `warningActive` exige B2 y una llegada futura. La integración exige además
  que el último registro sea del tick actual y que sea la primera jornada de
  esa semana (`day === tick * TIME.DAYS_PER_WEEK`).
- `lookoutOf` elige suelo alcanzable en el corredor de aproximación, más cerca
  de la entrada que del núcleo y con ruta de vuelta.
- `beginWarning` coloca el cuerpo efímero en ese origen y crea la ruta. Si no
  existe origen/ruta honesta devuelve `null`.
- `stepWarning` mueve por paso fijo, obstáculos y separación, y termina en el
  núcleo; después el cuerpo recupera el reparto normal.

El candidato es un adulto vivo y disponible, no niño, guardia, porteador de
E0a, refugiado, actor de escena/riña, portador ni alguien con necesidad urgente.
La selección es estable por id y no consume RNG del motor.

## Propiedades exigidas

1. La modal pendiente, una amenaza sola, una decisión antigua o una llegada
   pasada no crean mensajero.
2. Las semillas 7 y 23 crean exactamente uno en el primer día posterior.
3. El segundo día de la misma semana crea cero: la escena no se repite.
4. Misma semilla/día produce el mismo actor, origen y ruta sin escribir una
   coma en `GameState`.
5. El recorrido no cruza bloqueo y termina por navegación real.
6. El control con la misma amenaza y sin el registro B2 crea cero.
7. La traza del navegador expone `warning`, origen, fase y longitud de ruta;
   no obliga a inferirlos de una captura.

## Estado

**Entregado el 20 sep 2026.** El cierre y las medidas viven en
[`../historico/life-rounds/E0b-aviso.md`](../historico/life-rounds/E0b-aviso.md).
E0 completo sigue abierto por el pago, la semana posterior y las transiciones
de muralla; este encargo no los incluye.
