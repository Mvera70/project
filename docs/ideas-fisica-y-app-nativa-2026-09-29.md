# Combate físico y aplicación móvil · idea para después de AN-4

**29 sep 2026 · pendiente de decisión.** Vera quiere que The Valley pueda llegar
a ser una aplicación móvil distribuida como tal y que la simulación física del
combate sea uno de sus puntos fuertes. Antes de abrir esta línea se termina el
[programa de animación integral](plan-animacion-integral-movil-2026-09-29.md)
(AN-0 a AN-4). Esta nota conserva las opciones; no autoriza una migración, una
integración de Capacitor ni cambios en el combate actual.

## Punto de partida

- El juego usa TypeScript, Three.js y una PWA. La simulación semanal vive en
  `src/engine/`; la vida visible y el combate, en `src/render3d/life/`.
- Rapier ya mueve proyectiles, ragdolls y escombros durante las batallas
  (`life/physics.ts`). Se carga sólo cuando hace falta.
- El cuerpo a cuerpo decide los golpes por distancia y cadencia
  (`life/melee.ts`). La trayectoria de la flecha usa Rapier, pero su acierto
  contra un atacante se comprueba por proximidad (`life/archery.ts`). Por eso
  aún hay margen para que el contacto físico decida más del combate.
- El resultado de la batalla entra al motor mediante `PlayerAct`; esta
  frontera de `design.md` §1b se conserva al estudiar cualquier mejora.
- El juego funciona en iPhone e iPad, pero falta medir de forma sistemática
  los fotogramas y el coste de una batalla en dispositivos reales.

## Opciones a estudiar cuando terminen las animaciones

1. **Ampliar Rapier en el combate.** Probar colisionadores para combatientes y
   armas, eventos de contacto y, si aporta algo visible, movimiento cinemático
   para quienes pelean. Comparar los impactos, la lectura de las animaciones y
   el coste con la batalla actual. No hace falta aplicar cuerpos rígidos a toda
   la rutina cotidiana de la aldea para hacer esta prueba.
2. **Preparar una app móvil con el juego existente.** Evaluar Capacitor para
   distribuir en iOS y Android conservando Three.js y Rapier. Es un contenedor
   móvil con vista web: por sí solo no da un render nativo ni garantiza más
   rendimiento. La prueba debe incluir arranque, guardados existentes,
   suspensión/reanudación y una batalla en teléfono y tableta. Para compilar
   iOS se necesita macOS y Xcode.
3. **Reconsiderar otro motor con una causa concreta.** Si el combate deseado o
   el rendimiento objetivo no se consiguen con cambios razonables, o si Switch
   pasa a ser un destino firme, estimar el coste de trasladar render, vida, UI,
   herramientas y el puente con el motor de simulación. No se decide ahora.

## Posible edición para Nintendo Switch

Vera recuerda que Switch tiene pantalla táctil. En modo portátil, eso permitiría
aprovechar parte de la interacción táctil del juego. Si se quisiera ofrecer
también el modo TV, haría falta navegación completa con mandos y lectura a
distancia; existe la opción de estudiar una edición sólo portátil. Este interés
es exploratorio y no cambia la prioridad del programa de animaciones.

Capacitor cubre web, iOS y Android; empaquetar la PWA para móvil no produce una
versión de Switch. Un port exigiría acceso aprobado a las herramientas de
Nintendo y una solución de ejecución y render compatible con la consola. El
alcance real de reutilización del motor TypeScript se evaluaría entonces, sin
dar por necesaria ahora una migración de motor. Nintendo describe la pantalla
táctil y los modos de juego en su [ficha de Switch](https://www.nintendo.com/en-ca/gaming-systems/switch/system/)
y el acceso de desarrollador en su [portal](https://developer.nintendo.com/the-process).

### Estudio de portabilidad · 29 sep 2026

**Veredicto:** una edición para la Switch original es técnicamente posible
mediante un port a un entorno autorizado por Nintendo. El proyecto web actual
no tiene una exportación directa a Switch. La [solicitud de acceso a
Switch](https://developer.nintendo.com/register) y el hardware de desarrollo
son puertas previas a comprobar rendimiento o publicación en la consola real.
La información detallada del SDK no es pública; por eso esta evaluación no
certifica todavía un ejecutable ni un presupuesto de rendimiento.

| Ruta | Disponibilidad pública | Qué costaría en The Valley |
|---|---|---|
| **Unity** | [Soporte de Switch](https://unity.com/es/solutions/nintendo-switch) ofrecido por Unity; requiere aprobación de Nintendo y Unity Pro o clave de plataforma preferida. | Rehacer el render Three.js, la capa de vida, los efectos, la interfaz y el código del juego en C#. Importar los GLB es viable con [glTFast](https://docs.unity.com/en-us/asset-transformer-sdk/2026.1/manual/sdktips/export-guidelines), pero hay que validar rigs, materiales y clips en escena. Es la ruta con soporte de consola más directo de las dos estudiadas. |
| **Godot** | La [Fundación Godot](https://godotengine.org/consoles/) no distribuye un exportador abierto para Switch; W4 Games ofrece [middleware comercial](https://www.w4games.com/w4consoles) para desarrolladores aprobados. | Rehacer esas mismas capas en GDScript o en otro lenguaje que soporte el port elegido. Godot [importa GLB y animaciones](https://docs.godotengine.org/en/4.0/tutorials/assets_pipeline/importing_scenes.html) de forma directa. W4 anuncia soporte de C# en Switch todavía en beta; conviene verificarlo antes de elegir C# para todo el juego. |

Ambos motores permiten sacar también versiones para móviles; si se hiciera
uno de estos ports, podría servir de base común para móvil y Switch. Eso
implicaría sustituir la aplicación web actual por una implementación nueva del
juego. Godot [documenta exportación a Android](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_android.html)
e iOS, aunque [marca el soporte móvil de C# como experimental](https://docs.godotengine.org/en/latest/getting_started/step_by_step/scripting_languages.html); Unity
[documenta iOS, Android y Switch](https://unity.com/features/multiplatform).
La vía Capacitor sigue siendo mucho menor para publicar primero en móvil, pero
no constituye un primer paso técnico hacia el port de consola.

**Qué se podría conservar:** diseño, reglas, datos planos y serializables,
semillas, contratos de resultado de batalla y recetas de arte. El repositorio
tiene 106 GLB publicados; los animales y los cuatro clips humanos embebidos
son candidatos claros a importación. Habría que comprobar cada rig y material.
El formato de guardado se podría tomar como contrato para una migración de
partidas, pero otro motor no ejecutaría por ello el TypeScript actual.

**Qué habría que reconstruir:** el motor semanal tiene 76 ficheros TypeScript;
la vida 42, el mundo 35 y los efectos 27. Buena parte del suelo, la hierba y
los edificios se generan en código, no viven en GLB. Veinte de los 24 clips
humanos se fabrican en `action-clips.ts` durante la carga y habría que
hornearlos como recursos o reimplementarlos. También se rehacen la interfaz
HTML/CSS, persistencia, controles y el puente que mete los resultados del
combate en `PlayerAct`. Unity usa [C#](https://docs.unity3d.com/cn/6000.0/Manual/intro-to-scripting.html);
Godot ofrece [GDScript, C# y C++](https://docs.godotengine.org/en/stable/about/faq.html),
sin ejecución oficial directa de TypeScript.

**Rapier no se transporta automáticamente con el render.** Un port normal
resolvería el combate con la física del motor escogido —
[PhysX en Unity](https://docs.unity3d.com/cn/2022.3/Manual/PhysicsOverview.html)
o [Jolt/Godot Physics en Godot](https://docs.godotengine.org/en/4.6/tutorials/physics/using_jolt_physics.html)—
y conservaría las reglas de daño y el contrato de resultados. Mantener Rapier
como librería nativa exigiría una integración específica que no está validada
para este proyecto ni para el SDK de Nintendo.

**La pantalla táctil ayuda al diseño de entrada, no al port técnico.** Nintendo
[distingue los modos compatibles por juego](https://www.nintendo.com/sg/support/switch/playmode/index.html):
una edición sólo portátil podría conservar la interacción táctil; incluir TV
exigiría navegación con mando. Una app iOS/Android hecha con Capacitor no
reduce por sí misma el trabajo de portar Three.js y TypeScript a Unity o Godot.

**Próxima comprobación si Switch pasa de posibilidad a objetivo:** decidir
Switch original o Switch 2, portátil solo o también TV; obtener acceso de
Nintendo; escoger un motor tras importar un aldeano con sus animaciones y una
pequeña escena de batalla; portar un tick de simulación y comparar su salida
con el motor actual; finalmente medir esa escena en el hardware de desarrollo.
No iniciar una migración completa antes de esa prueba. El [portal de
Nintendo](https://developer.nintendo.com/home/developing-for-switch2) indica
que, a fecha de esta nota, aún no acepta solicitudes de acceso para Switch 2:
es un estado que debe volver a comprobarse si ése fuera el objetivo.

## Revisión posterior a AN-4

Con las animaciones nuevas integradas, escoger una batalla representativa y
registrar en móviles reales FPS, peor fotograma, memoria y coste separado de
física, vida y render. A partir de esa línea de base, definir qué contactos
deben cambiar de verdad el resultado, hacer una prueba acotada con Rapier y
compararla con la escena actual. La decisión de empaquetado móvil se toma con
la misma escena corriendo dentro del contenedor candidato. No se fija un
umbral numérico antes de medir los dispositivos objetivo.

**Referencias técnicas para esa revisión:**
[Capacitor](https://capacitorjs.com/docs),
[entorno iOS/Android de Capacitor](https://capacitorjs.com/docs/getting-started/environment-setup),
[colisiones de Rapier](https://rapier.rs/docs/user_guides/javascript/advanced_collision_detection_js/)
y [controlador de personajes de Rapier](https://rapier.rs/docs/user_guides/javascript/character_controller/).
