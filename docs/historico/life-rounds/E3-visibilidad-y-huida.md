# Puntos 3 y 4 · Visibilidad, cuerpos y huida · 20 sep 2026

Ronda cerrada. [Brief](../../encargos/encargo-visibilidad-y-huida.md).
Dos agentes Sol implementaron oclusión y vida/animación respectivamente;
Terra auditó y el principal arbitró y observó. No nuevos modelos ni proveedor de arte.

## Línea base

El robledal instanciado es completamente opaco: no hay selección de oclusores.
La especificación D.7 permite ocultación selectiva, no transparentar el valle.
En la semilla 7 el portón y la partida están tras las copas desde la cámara normal.

Los atacantes no participan en la misma resolución de contactos que los vecinos.
La toma previa `integracion-defensa-2026-09-20/no-bows-final-23` tiene 4026
pares-muestra activos a menos de 0,3 celdas y distancia mínima cero, en 61 frames.

Comando base de esta ronda:

```powershell
node tools/graphics/observe-life.mjs --page artifacts/graphics/G-24/integration-game/valley.html --seed 7 --year 30 --means arms --raid 24 --assault --lead 16 --seconds 30 --fps 2 --follow -9001 --zoom 0.16 --out artifacts/graphics/visibilidad-huida-2026-09-20/before-7
```

Primer `inside` en segundo 8,5 de toma (24,5 escénico). Portón recibe 60 golpes;
sin flechas ni bajas. Fase inicial 0,413, 69 personas y 19 animales, tick 1458.
No es una medida de balance: motor congelado y asalto forzado para observar.

Segunda línea base: mismo comando con `--seed 23` y salida `before-23`.
Ventana idéntica, 61 fotogramas: 3927/4026 pares-muestra a menos de 0,3 celdas
en semilla 7 y 4026/4026 en 23, mínimos cero en ambas. Son pares entre raiders
activos (sin `down`/`gone`), no porcentajes de fotogramas ni personas.
En 23 el portón alcanza 60 golpes y hay dos bajas propias, sin flechas.

## Verificación y cierre

La primera implementación pasa las propiedades de contacto, huida, clips y
oclusión. Se compara con el mismo comando base, cambiando página a
`artifacts/graphics/visibilidad-huida-2026-09-20/game/valley.html` y salidas
`after-7` / `after-23`. No cambia semilla, encuadre solicitado ni ventana.

| Semilla | Pares a <0,3 antes | Después | Distancia mínima después |
|---|---:|---:|---:|
| 7 | 3927/4026 | 47/4026 | 0,212 celdas |
| 23 | 4026/4026 | 0/3476 | 0,446 celdas |

La separación mejora mucho pero no garantiza distancia perfecta en un embudo:
se conserva el tope de corrección por paso, no se teletransporta el grupo.
El cambio tiene efecto físico: en 7 la entrada pasa de 24,5 a 27,5 s muestreados;
en 23, a 46 s, el portón aún lleva 32 golpes frente a los 60 anteriores y ha
caído un atacante. No se retocan alcance, cadencia ni daño para compensarlo.

En 7 se inician 56 huidas; 54 se ven corriendo en la muestra inicial, y dos ya
han alcanzado un destino cercano. A 36 s escénicos se han refugiado 55/56 y
a 46 s, 56/56. En 23 no hay entrada en esta ventana y no se activa ninguna huida.
Ambas tomas: cero errores, drift, centros bloqueados y penetraciones muestreadas.
La traza estándar cuenta penetraciones civiles/animales; la prueba de contacto
comprueba también atacantes frente a un muro.

Oclusión: 23–28 árboles atenuados de 411 en 7; ninguno en 23, donde el frente
no necesita aclararse. Al inspeccionar PNG 0/20 de 7, el 0,18 inicial todavía
oscurece por acumulación de copas: se ajusta a **0,06**, conservando selección y
geometría. No se apaga el bosque entero. La toma final confirma el ajuste.

La observación detecta además `flee` en un refugiado empujado por un vecino:
el movimiento pasivo no debe reactivar carrera. Se corrige la selección del clip
para dar prioridad a `flight.sheltered`; la toma final confirma la corrección.

### Evidencia final

Página final: `artifacts/graphics/visibilidad-huida-2026-09-20/final-game/valley.html`.
Todas las salidas siguientes están en esa misma carpeta de ronda; semilla 7,
año 30, `--means arms --raid 24 --assault`, motor fijo en tick 1458.

| Salida | lead / seconds / fps | follow / zoom | Resultado |
|---|---|---|---|
| `gate-final-7` | 25 / 2 / 2 | -9001 / 0.16 | 5 PNG: portón y frente legibles; 26 árboles atenuados estables, resto opaco |
| `flee-final-7` | 27 / 6 / 15 | 15 / 0.12 | 91 PNG: 56 huidas, 50 refugiados al final; cero muestras de refugiados con clip `flee` |
| `flee-close-7` | 27 / 4 / 15 | 118 / 0.07 | 61 PNG: carrera observada en secuencia; sin drift, centros bloqueados ni penetraciones civiles/animales |

131 pruebas focalizadas en 12 ficheros, typecheck y lint pasan. Incluyen
restauración de árboles con objetivos vacíos, contactos, llegada real al refugio,
cancelación de escena/carga/compromisos y reposo tras empujón pasivo.

### Límites

`restored-final-7` (lead 100, 1 s, 2 fps) todavía tiene 12 atacantes activos y
26–27 árboles seleccionados: **no demuestra el fin del asalto ni la restauración**.
La restauración queda cubierta por prueba, no por una película de cese de amenaza.
La huida usa `entered`, la transición existente tras romper el portón, anterior
al cruce físico; no redefine B4. Los defensores en puesto no abandonan su función.
Persisten algunos contactos estrechos en embudos y oclusiones por tejados;
no se promete resolver toda ocultación. Estas tomas no certifican FPS en móvil
ni balance de partidas. Quedan fuera ragdoll, gore, fuego, identidad del clan,
adarve y la transición completa al final. Sin push ni despliegue.
