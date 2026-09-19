# E1 · El disparo único — 20 sep 2026

Entrega **parcial** de `docs/plan-disparo-unico.md`; E1 no se cierra.

## Revisión anterior al código

1. E1 sigue P1 y D6 P3. Primero defensa legible; después armas (E2) y adarve
   y apoyo real (E3). No hace falta decidir gore para mostrar una caída.
2. Conservar umbrales y registrar fallos conocidos es correcto, pero `it.fails`
   no demuestra que sean correctos. La cadencia responde a un cambio deliberado;
   bosque y elegibilidad requieren interpretación, no absolución automática.
3. El 26,7 % demuestra extinción bajo esa política, semillas y horizonte; no
   demuestra que el asedio llegue a tiempo. «Es §1b funcionando» es demasiado
   concluyente. Faltan edad, fase y preparación al caer y tiempo desde el aviso.
   No se repite aquí el banco largo ni se inventa esa distribución.
4. `prudent` sirve como referencia reproducible y miope, pero no como humano
   sensato si ignora un peligro anunciado. No invalida estabilidad ni contrastes
   bajo la misma política; sí limita afirmaciones sobre dificultad o «valle bien
   jugado». No tener lookahead no impide valorar información ya anunciada.

Sesenta semillas tampoco garantizan representatividad por sí solas. Los
contrafactuales de 16–31 pares son señales exploratorias, no una ordenación de
letalidad robusta demostrada. No se reescribe la evidencia histórica, ni se
cambia política, umbral o balance: esta revisión limita las interpretaciones.

## Contrato

La vida fecha `lastShot`, `blowAt`, `downAt` y `Gate.hitAt` en pasos de 1/30 s.
El reparto resta el origen al último paso terminado. `clipTime` mantiene reloj
y distancia y añade tiempo de evento, cíclico o acotado. `Cast` usa `LoopOnce`
y final sostenido; entrar/salir de combate no depende del historial de mezclas.
La pestaña que despierta puede mostrar directamente la pose que toca.

Cuatro gestos procedurales sobre los huesos publicados: tensado sostenible
1,5 s, suelta 0,6 s, contacto/recuperación de portón 0,6 s y caída 1,2 s.
La palma cambia ya en fase cero: **no hay dedos articulados ni arco**.
El primer disparo conserva disponibilidad inmediata; añadir preparación inicial
habría cambiado la pelea. Entre disparos: 18 pasos de suelta y 45 de tensado,
los 63 existentes. Resistencia de puerta y daño sin cambios.

Ambos bandos caen desde el impacto mortal. Un defensor caído no dispara ni lo
empuja la separación de vecinos. Es coherencia del cuerpo caído, no nivelado;
puede cambiar resultados que antes incluían disparos póstumos. Motor intacto.

## Observación reproducible

Bundle: `npm run bundle -- --out artifacts/graphics/E1/game`.
Comando común: `node tools/graphics/observe-life.mjs --page artifacts/graphics/E1/game/valley.html --year 30 --means bows,arms --raid 24 --assault`.
Añadir argumentos de cada fila y `--out artifacts/graphics/E1/CARPETA`:

| Carpeta | Argumentos | Resultado |
|---|---|---|
| `defence-7` | `--seed 7 --seconds 30 --fps 2 --follow -9000 --zoom 0.45` | 69 personas, 19 animales; 8 flechas, 7 impactos, 6 atacantes caídos, 2 bajas propias; 60 golpes, puerta rota y entrada |
| `defence-23` | `--seed 23 --seconds 30 --fps 2 --follow -9000 --zoom 0.3` | 71 personas, 12 animales; 31 flechas, 12 impactos, 9 atacantes caídos, 3 bajas propias; sin golpes ni entrada |
| `archer-7` | `--seed 7 --lead 12 --seconds 8 --fps 15 --follow 66 --zoom 0.12` | Caídas y defensa, bosque tapa parte de la visión |
| `archer-23` | `--seed 23 --lead 14 --seconds 6 --fps 15 --follow 135 --zoom 0.16` | Pose final de arco: mano cerca del rostro, suelta y recuperación |
| `gate-7` | `--seed 7 --lead 12 --seconds 4 --fps 15 --follow -9000 --zoom 0.16` | Aproximación y caída horizontal; la ventana no alcanza el golpe de puerta |
| `gate-36` | `--seed 36 --lead 18 --seconds 4 --fps 15 --follow -9000 --zoom 0.16` | 31 personas, 11 animales; golpe visible, **sin malla de portón allí**: no valida contacto contra madera |

Resúmenes: cero errores de página, drift, centros bloqueados y penetraciones
muestreadas. PNG inspeccionados en secuencia: archer-23 0000/0010/0020/0060;
archer-7 0000/0025/0045/0105; gate-7 0000/0005/0010/0040;
gate-36 0000/0003/0008/0014. Cada carpeta contiene visor, traza y resumen.
Las tomas generales preceden el ajuste final de palma/antebrazo; archer-23 y
las dos últimas lo incluyen. Un último ajuste del reloj de caminar no afecta
las imágenes: Cast ya calcula la zancada por distancia.

**Límites:** motor congelado, vida y renderer reales. No certifica evolución
persistente ni cadáveres entre jornadas. Treinta segundos no dan una tasa de
victoria; cero anomalías muestreadas no prueba ausencia entre muestras.
La semilla 36 muestra el gesto pero también un portón lógico sin representación;
no se presenta esa toma como contacto visual satisfactorio.

## Verificación

Typecheck y lint pasan; **98 pruebas rápidas pasan** en Vitest focalizado: combat-clips, graphics-clock, graphics-world,
archery, melee, raiders, life-observation, garrison. Pruebas sobre el GLB real:
misma pose tras salto, repetición, retroceso y otro clip previo; caída horizontal
sostenida, tensado cíclico y suelta desde el nacimiento. Golpe fechado igual
que el contador de la puerta, sin reinicio en pasos sin golpe.

`npx vitest run --config vitest.journeys.config.ts tests/journeys/assault.test.ts`:
7 pruebas pasan en unos 65 s, incluida no mutación del motor. No se ejecutan
suite completa ni banco de balance en esta ronda.

## Pendiente explícito

**Que el portón acuse.** Requiere edificios/renderer, excluidos por el brief.
Ampliación solicitada, pendiente de respuesta. `hitAt` prepara el hecho real,
no una reacción terminada. Faltan también `spear_thrust`, `hit_take`, `flee`,
armas, adarve, contacto preciso de manos (el alcance mecánico es grupal),
adaptación al terreno, ragdoll y persistencia de cadáveres. Sangre/fuego/saqueo
siguen siendo decisiones del dueño. Registro actualizado en `encargos-3d.md`.
