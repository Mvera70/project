# Integración y defensa sin arqueros · 20 sep 2026

Alcance autorizado: puntos 1 y 2 del siguiente paso, y detenerse al terminarlos.
[Brief](../../encargos/encargo-integracion-y-defensa.md). Integración delegada
en Terra y auditoría de recursos en Luna; revisión final y punto 2 por el principal.

## Punto 2 · Fallo reproducido y corregido

`createVillage` sólo pide Rapier cuando hay arqueros y atacantes. Sin embargo,
la llamada a `stepMelee` estaba dentro de `if (physics !== null ...)`. Un valle
sin arcos nunca entraba: ni el defensor ni el atacante sufrían daño de mano.

Las jornadas antiguas no lo veían porque `fight` en `assault.test.ts` construye
e inyecta un mundo de Rapier incluso en sus casos sin arcos. No probaban la
entrada normal del renderer.

La regresión nueva usa `createVillage` sin física inyectada, las semillas 7/23,
un puesto real asignado por la jornada y un encuentro colocado al alcance.
Antes del arreglo ambas pruebas fallan: `enemy.hits` es 0 donde debe ser 1.
Después, hay contacto en el paso 0 y ambos pueden caer al tercer golpe,
en el paso 30. Cero flechas y estado del motor idéntico antes y después.
El terreno libre y el encuentro colocado aíslan el enganche: no certifican rutas.

La corrección saca el bloque de cuerpo a cuerpo de la rama de física y lo
condiciona sólo a atacantes presentes. No se tocan alcance, daño, selección,
cadencia ni reglas del motor. Sí cambia el resultado antes incorrecto:
puede haber bajas en defensas sin arqueros que antes eran invulnerables.

## Punto 1 · Integración local

Se admiten sólo `bow`, `spear`, `arrow`, `shield`, `gate`, `plough` y `fountain`
desde sus directorios aprobados de G-24. No se remodelan ni se usa un proveedor.
Se mantienen los recursos anteriores y se actualiza el manifiesto con hashes.
Publicación significa `public/assets/valley3d/`, no despliegue ni push remoto.

## Verificación integrada

Auditoría independiente de Luna: siete GLB coincidentes con catálogo y fuentes
aprobadas, procedencia original del proyecto, conectores y bounds válidos.
El manifiesto pasa de 58 a 65 entradas: las 58 antiguas se conservan exactamente.
El publicador exige `--ids`, verifica el lote antes de escribir, rechaza colisiones
y destinos enlazados y escribe el manifiesto de forma atómica. No borra activos.

Los agarres de arco, lanza y escudo se verifican contra las manos del GLB real;
la lanza conserva la escala mundial, compensando la reducción heredada del rig.
La compensación se limita a modelos con `grip`: una prueba conserva la escala
anterior de la azada; las demás herramientas heredadas no cambian.
La hoja del portón gira desde su empty en ambos ejes; no desde su caja envolvente.
El cilindro de reserva de las flechas conserva su eje Y; el GLB usa +Z.

Verificación rápida: **111 pruebas en diez ficheros**, `npm run typecheck` y
`npm run lint`, verdes. Ficheros: `approved-assets`, `art-props`, `graphics-world`,
`melee-without-archers`, `melee`, `combat-clips`, `archery`, `raiders`, `garrison`
y `life-observation` (todos en `tests/fast/*.test.ts`). No suite larga ni balance.

Bundle aislado: `artifacts/graphics/G-24/integration-game/valley.html`;
62 recursos, 15,43 MB. Los avisos de `barrel` y `hall` corresponden a recursos
anteriores aún sin promover, no a los siete de esta ronda.

### Observación del renderer

Comando común: `node tools/graphics/observe-life.mjs --page
artifacts/graphics/G-24/integration-game/valley.html --year 30`, seguido de los
parámetros de cada fila. Salidas bajo
`artifacts/graphics/integracion-defensa-2026-09-20/`.

| Toma | Parámetros adicionales | Resultado |
|---|---|---|
| `no-bows-23` | `--seed 23 --means arms --raid 24 --assault --lead 23 --seconds 6 --fps 15 --follow -9001 --zoom 0.16 --out artifacts/graphics/integracion-defensa-2026-09-20/no-bows-23` | 71 personas y 12 animales; cero flechas, 6 impactos y 2 bajas propias al final |
| `no-bows-7` | `--seed 7 --means arms --raid 24 --assault --lead 16 --seconds 4 --fps 15 --follow -9001 --zoom 0.16 --out artifacts/graphics/integracion-defensa-2026-09-20/no-bows-7` | 69 personas y 19 animales; cero flechas, 11 golpes de puerta; sin contacto de melee en esta ventana |
| `armed-final-23` | `--seed 23 --means bows,arms,plough --raid 24 --assault --lead 23 --seconds 4 --fps 15 --follow 135 --zoom 0.12 --out artifacts/graphics/integracion-defensa-2026-09-20/armed-final-23` | 71 personas y 12 animales; arco sostenido, lanzas y escudos; 8 flechas, 5 enemigos caídos y 3 bajas propias |
| `no-bows-final-23` | `--seed 23 --means arms,plough --raid 24 --assault --lead 23 --seconds 4 --fps 15 --follow -9001 --zoom 0.12 --out artifacts/graphics/integracion-defensa-2026-09-20/no-bows-final-23` | Bundle definitivo, herramientas heredadas preservadas: 71 personas y 12 animales, cero flechas, 6 impactos y 2 bajas propias |
| `plough-final-23` | `--seed 23 --means plough --lead 23 --seconds 1 --fps 2 --follow 68 --zoom 0.16 --out artifacts/graphics/integracion-defensa-2026-09-20/plough-final-23` | Arado propio visible en el campo, coordenadas 32,45 / 57,55 |
| `plaza-final-23` | `--seed 23 --means plough --lead 0 --seconds 1 --fps 2 --zoom 0.18 --out artifacts/graphics/integracion-defensa-2026-09-20/plaza-final-23` | Fuente propia en la plaza; fase inicial 0,28 |

Las tomas tienen errores, drift, centros bloqueados y penetraciones
muestreadas en cero. Fase inicial 0,472 en 23 y 0,413 en 7; tick fijo 1458.
No certifican evolución persistente, FPS de dispositivo ni equilibrio.
Se inspeccionan secuencias de PNG, no sólo la traza: el portón propio y las armas
se leen en 23; el bosque tapa el encuentro de 7. Ese defecto visual sigue abierto.
La toma `no-bows-23` precede a la corrección final de tamaño de armas; su evidencia
es el enganche D4, no el tamaño. `armed-final-23` muestra los agarres corregidos.
Las tomas definitivas repiten la comprobación tras restringir la escala a `grip`.
Se inspeccionan los fotogramas 0/30/60 de combate y los PNG de arado/plaza.

Límite del publicador: las rutas actuales están verificadas dentro del proyecto
y no son enlaces. Queda endurecer la contención de fuentes del catálogo y de
padres de OUTPUT cuando el directorio todavía no existe; no es una garantía para
catálogos de terceros no confiables. La orientación de la flecha se revisó en
código, sin test runtime dedicado ni primer plano concluyente del proyectil.
No se reabre ningún otro punto.

## Fuera de alcance

No se abre el punto 3 (visibilidad y superposición de atacantes) ni el punto 4
(`flee`). No gore, nuevo clan, adarve, ragdoll, rotura artística del portón ni
nivelado. Los modelos aceptados se conservan tal cual.
