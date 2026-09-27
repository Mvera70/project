# E0c · La semana posterior al saqueo

## Objetivo

Que la primera semana después de un saqueo se lea distinta aunque la partida ya
se haya marchado: quedan reservas volcadas junto al almacén y, sólo cuando la
crónica confirma que se llevaron una cabeza de ganado, dos travesaños caídos
marcan el corral abierto. La escena representa pérdidas ya resueltas; no vuelve
a cobrarlas ni abre las opciones de `after_the_raid`.

## Depende de

- B2: `threat.arrivedTick`, `just_sacked` y las entradas `raid.open`,
  `raid.walled`, `raid.assault` y `raid.beast`.
- V-08: anclas reales de ganado junto a casas o campos.
- V-09/D6: `Prop`, las cargas `grain`/`bundle` y su renderer existente.
- La vida efímera y reconstruible del Anexo E.

Todo existe. No hace falta una malla, animación ni campo nuevo en el motor.

## Ficheros

Producción limitada a:

- un módulo nuevo en `src/render3d/life/` para derivar la huella;
- `src/render3d/life/village.ts` para incorporarla a los trastos de la jornada;
- `src/ui/debug.ts`, `src/main.ts` y `tools/graphics/observe-life.mjs` sólo para
  construir y observar el estado real de esta fase;
- pruebas focalizadas en `tests/fast/`;
- `docs/task-log.md`, `docs/encargos-3d.md` y el informe de ronda.

No tocar `src/engine/`, balance, esquema, catálogo, economía, daño, combate,
Rapier, activos ni las opciones de `after_the_raid`. Si hace falta otro fichero,
se declara antes de tocarlo.

## Contrato

- La huella está activa sólo si el valle sigue vivo, `just_sacked` está vigente,
  `threat.arrivedTick` existe y `state.tick === arrivedTick + 1`.
- Se reconstruye durante los siete días escénicos de esa semana y desaparece en
  el tick siguiente. Sus ids y posiciones no cambian entre esos siete días.
- Dos o tres cargas `grain`/`bundle`, fijas e inertes, quedan en suelo alcanzable
  junto a un granero o molino en pie; si no existe, junto a una casa. No pueden
  recogerse ni cuentan como inventario.
- Si hay una entrada `raid.beast` en `arrivedTick`, dos cargas `bundle` tumbadas
  señalan travesaños caídos junto al ancla real de ganado/casa. Sin esa entrada
  no se inventa un corral roto.
- Todos los puntos caben en suelo, quedan fuera de edificios y se derivan sólo
  del estado y del tick del saqueo. Si no existe un emplazamiento honesto, se
  reduce la escena antes que atravesar una pared.
- La función de depuración construye el mismo estado que deja el motor: llegada
  en la semana anterior, `just_sacked`, crónica de saqueo y opcionalmente
  `raid.beast`; no crea una segunda mecánica.

## Reglas

- Lectura pura: no escribir en `GameState` ni consumir RNG del motor.
- Sin teletransporte, porque ningún cuerpo se mueve en esta fase.
- Reutilizar `Prop` y el renderer actual. Nada de geometría o materiales nuevos.
- La huella no bloquea navegación, no ofrece objetos a los aldeanos y no
  persiste fuera de la semana contratada.
- No se muestra un saqueo que no ocurrió: `just_sacked` por sí sola no basta sin
  `arrivedTick` y una entrada de crónica del tick correspondiente.

## Tests exigidos

1. Activa exactamente en `arrivedTick + 1`; no en la llegada, dos semanas
   después, sin `just_sacked`, con el valle terminado o sin crónica de saqueo.
2. Produce 2–3 cargas de almacén fijas, en suelo válido y próximas a un edificio
   real; sin ruta/emplazamiento suficiente reduce el número sin inventar suelo.
3. `raid.beast` añade exactamente dos travesaños; sin esa entrada no aparecen.
4. Misma partida en cualquiera de los siete días devuelve ids y posiciones
   idénticos; otra reconstrucción da el mismo resultado.
5. Los trastos no entran en ofertas, no pueden recogerse y el estado serializado
   queda idéntico tras construir y avanzar la jornada.
6. Regresiones focalizadas de saqueo, animales, trastos y E0; typecheck y lint.

## Evidencia y terminado cuando

Rodar dos valles distintos con la misma semana en control y en pos-saqueo. La
toma debe enseñar reservas volcadas junto a un almacén real y, en el caso con
`raid.beast`, el hueco del corral mediante los dos travesaños caídos. Guardar
capturas y traza: cero errores de página, trastos dentro de edificios, cambios
de inventario, bloqueos o huellas persistentes en la semana siguiente.

**Falsaría el brief** que la diferencia sólo pueda descubrirse leyendo la
traza, que aparezca un corral roto sin pérdida de animal, que los aldeanos
recojan las supuestas pérdidas o que la huella sobreviva más de una semana.

No cerrar E0 completo: este encargo termina exclusivamente la fila **La semana
de después** de `docs/encargos-3d.md` §1.

