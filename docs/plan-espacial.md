# Aldea orgánica y recinto honesto

Encargo autorizado el 21 sep 2026. Dirección y núcleo: Astra; auditoría
independiente: Terra. Se ejecuta antes del ambiente cosmético por eras.

## Contrato

- Casas menos regimentadas mediante preferencias espaciales deterministas,
  no ruido por fotograma ni consumo del azar de subsistencia.
- Plaza estable y reservada, edificios comunitarios con acceso y calles libres.
- Caminos calculados desde accesos exteriores, evitando edificios y obras.
- Un recinto sólo se declara cerrado si no se puede salir con puertas cerradas.
  Un bosque no es una barrera; un río sólo lo es donde no se puede atravesar.
- Portón alineado con un paso utilizable, no con una orientación arbitraria.
- Variedad visual de viviendas conservando parcela, puerta y colisiones.
- Las partidas guardadas no recolocan edificios ni plaza. Las nuevas reglas
  afectan al crecimiento futuro; no se promete la misma trayectoria histórica.

## Reparto y orden

1. Astra: `engine/world/{placement,paths,plaza,works,upgrade}.ts`, helper
   espacial y pruebas. Corregir accesibilidad y cierre antes de adornar.
2. Terra: auditoría independiente de topología, terreno y navegación; entregar
   causas y casos de regresión, sin tocar el núcleo simultáneamente.
3. Dirección: integrar contratos con `derive/defence-gates.ts`, renderer de
   viviendas y pruebas; revisar diferencias entre motor y vida.
4. Cierre: pruebas focalizadas, tipos/lint, escenarios de varias semillas,
   capturas del juego real e informe de límites. No retocar economía para
   ocultar trayectorias nuevas. Sin publicación o despliegue implícitos.

## Evidencia exigida

Determinismo, no mutación de mapas, caminos sin edificios atravesados,
reserva de plaza/calles, cierre con una brecha negativa, bosque/vado/río,
orientación de portones, vivienda con puerta y huella intactas, materiales
compartidos sin contaminación y nieve reversible. Capturas en varias semillas.

## Implementación y estado de aceptación

**Fase espacial aceptada localmente** tras cerrar las incidencias de vida
atribuibles a esta ronda. La recuperación del 21 sep la dirigió Sol con
implementación acotada de Terra y sonda/ajuste mecánico de Luna; Astra quedó
reservado para 3D excepcional. Sin commit, publicación ni despliegue.

- Motor: accesos exteriores, máscara de volúmenes, exclusión de árboles bajo
  edificios, calles reservadas, viviendas por bandas/hash, plaza fundacional
  conectada, sala con separación y ampliaciones sin invadir plaza/anillo.
- Cerco: prueba topológica de cierre, puerta contrastada contra anillo final,
  defensas de ribera sobre marisma y continuidad más allá del corazón.
- Render: diagonales unidas sin invadir parcelas laterales, unión al portón y
  cuatro acabados de vivienda (tono y pendiente). Toda la estructura superior
  acompaña a la cubierta; puertas y huella no se desplazan, nieve reversible.
- Vida: `square:common` coincide con la plaza persistente, con puestos libres
  y alcanzables. El claro ofrece contemplación a mediodía, no un puesto de
  trabajo inelegible; los tres espacios comunes reciben visitas.

La skill `orquestacion-por-modelo` asignó el núcleo ambiguo a Astra y la
auditoría/corrección acotada a Terra. La orquestación por especificación conserva
decisiones y medidas en el documento canónico, actualizado a v4.28.

### Evidencia

- [Medida final del motor](medidas/spatial-engine.md): semillas 7/23/41 cerradas
  a los años 40 y 60, radios 13/14/11, una puerta. La 11 cae antes de construir;
  sí dispone de trazado viable, no se modifica economía o amenaza.
- [Auditoría de plaza](medidas/spatial-plaza.md): detectada una plaza falsa a
  6,71–21,21 celdas de la real. El claro se confundía espacialmente con ella.
- Capturas inspeccionadas del juego 3D, sin errores de página:
  `artifacts/graphics/spatial/final-seed-{7,23,41}-year-40.png`.
  `verified-seed-7-year-40.png` repite la comprobación tras el último arreglo
  de destinos de tala. Las anteriores `seed-*` son diagnóstico intermedio,
  no evidencia de aceptación.
- 27 pruebas focalizadas de grafo, vivienda, defensas y trazado verdes; tras
  añadir la regresión de tala, 24 pruebas de trazado y vida diaria verdes.
  Typecheck y lint verdes. Pruebas de guardado conservan replay determinista;
  catch-up temporal verde aislado, sin relajar su umbral.

### Lo que no se afirma

No hay contorno defensivo dinámico ni reubicación de guardados; la muralla aún
usa círculo rasterizado fijo. Un hueco legado se detecta, no se repara por
teletransporte. El río no recibe una muralla dibujada encima: agua no vadeable
puede cerrar físicamente, un vado nunca. Las entradas provisionales de partidas
sin portón real se conservan por compatibilidad, pero no certifican cierre.

No se promete eliminación de todos los atascos ni balance equivalente. El
trazado cambia trayectorias y ha descubierto pruebas generales rojas: el cierre
de la tanda deja sus resultados explícitos, sin rebajar umbrales ni declarar
que toda la suite pasa.

### Incidencias resueltas en la recuperación

1. **Entregas de leña:** la transición manual de tala a entrega saltaba la
   reserva compartida y daba 75 muestras sobre aforo. Sol acotó el contrato y
   Terra implementó reserva por puesto y espera local con carga conservada en
   `life/village.ts`. Recursos pasa 6/6 y aforo V-10 pasa en tres semillas.
   La sonda de Luna localizó la aparente congestión en personas separadas que
   el viejo test contaba como solapadas: IA-14 ya había reducido el radio
   físico a 0,19 por talla, manteniendo 0,32 para navegar. V-06 usaba el corte
   antiguo fijo de 0,60 y contaba 71.160/514.561 parejas cercanas; al medir
   la anchura visible de la malla (0,35 por talla frente a 0,38 de contacto),
   sólo 83/522.213 (0,016 %) penetran con el claro ya corregido. Se conserva
   el límite <0,1 %, sin tocar el resolvedor ni su `FIX_CAP`.
2. **Frecuencia social:** al separar la plaza verdadera del claro, sus visitas
   bajaron a 2/6 y 0/6. `work` en el claro era inelegible para casi toda la
   aldea; Terra lo sustituyó por `loiter`, actividad tranquila ya existente.
   Sin retocar `decide`, los tres sitios alcanzan la cota conservada de al
   menos 3/6 y V-10 pasa 9/9. El `it.fails` del claro vuelve a ser `it`.

La señal enterrada del granero sí queda corregida: la geometría de los sacos
invadía su edificio aunque el ancla estuviera fuera. Se comprueban bounds tras
girar y se aplica la altura de respaldo a toda la geometría. Las 40 pruebas de
`graphics-effects` pasan; no se ajustó un margen a ojo.

La pasada rápida de cierre obtuvo **1.682 verdes y 4 fallos** (169 s). Tres
eran aserciones antiguas `clips.length === 8` frente a los 15 clips existentes;
Luna sustituyó la cifra congelada por cobertura de `ACTION_CLIPS` y la prueba
aislada pasa 7/7. El cuarto fue la cota temporal de catch-up (2.227 ms frente
al límite de 2.000 ms) bajo la batería paralela; aislado pasa en 1.277 ms,
sin relajar el límite. No se repitió toda la batería tras estos dos controles.

Las jornadas anteriores también detectaron pendientes de avisos, ganado,
asedio, trastos y cobertura de `plague_blame`. No se atribuyen todos a esta
ronda ni se declaran todos preexistentes sin comparación. El aserto de suelo
prohibido de obras se ajustó a la excepción autorizada de defensa 1×1 sobre
marisma; la prueba sintética sigue rechazando agua/vado y solapamientos.
Esos rojos no se atribuyen a esta fase sin aislamiento; no se declara la suite
de jornadas global verde ni se publica la versión por implicación.

La pasada completa de jornadas se interrumpió tras más de diez minutos,
con `wall-rings` y `threat` aún ejecutándose, para no prolongar otra batería
general sobre fallos ya localizados. Sus procesos quedaron detenidos. No hay
resultado global final ni se ha medido de forma aislada si su tiempo es
regresión del nuevo trazado. La repetición que falta debe centrarse primero
en las incidencias de aceptación, no volver a lanzar todo indiscriminadamente.

La recuperación verificó recursos, distribución, viviendas y defensas (20/20),
V-06 completo (9/9), V-10 completo (9/9), tipos, lint y `git diff --check`. Las capturas
de tres semillas ya existentes siguen representando el trazado y el cerco:
la oferta del claro no modifica geometría. Los cambios permanecen locales.
