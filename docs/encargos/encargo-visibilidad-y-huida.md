# Puntos 3 y 4 · Visibilidad del asalto y huida

Autorizados por el dueño el 20 sep 2026, después de `bcbeb3d`.
Implementación delegada en Sol; arbitraje, documentación y observación por el principal.

## Objetivo

3. Que el bosque no oculte el encuentro del portón y que los atacantes no se
   fundan entre sí. No es una tala ni un rediseño del bosque.
4. Mostrar `flee`: civiles que corren al entrar la partida, ciclo de 0,8 s del
   encargo de combate. No crear el saqueo completo de D6.

## Depende de

Modelos y agarres integrados, combate D4 independiente de arquería y clips E1/E1b.
Mantener los siete modelos aceptados. No cambios en motor, guardados, daño,
cadencia, resistencia del portón, gore, fuego ni decisiones de balance.

## Ficheros y propietarios

- Sol visibilidad: `src/render3d/{renderer,contracts}.ts`, `world/forest.ts` y un ayudante
  visual si hace falta; pruebas focalizadas de oclusión.
- Sol vida: `src/render3d/life/{village,raiders,cast}.ts`, ayudante de huida,
  `src/render3d/{clips,action-clips}.ts`, `src/render3d/world/cast.ts` y pruebas
  de cuerpos/huida/animación. Declarar cualquier ampliación antes de editar.
- Principal: este brief, índices, estado y evidencia de la ronda.

## Contrato y reglas

La oclusión sólo altera presentación: debe ser reversible, dependiente de la
cámara y limitada a árboles interpuestos ante objetivos del asalto. Fuera del
encuentro se conserva el bosque. No alterar obstáculos ni posiciones físicas.

API ratificada de oclusión: `Forest.reveal(camera: Camera, targets): number`,
con `targets: readonly { x: number; y: number; z: number; radius: number }[]`.
Una lista vacía restaura el bosque; `revealedCount` expone el recuento.
Devuelve árboles atenuados. Robledal opaco + lote atenuado, materiales propios,
sin cambiar posiciones originales ni activos compartidos. Actualizar después de
la cámara, también al capturar; registrar el recuento en la traza. Los objetivos
cubren el portón y el frente real de atacantes, no sólo el centro de la puerta.
Opacidad final 0,06 (la captura mostró acumulación oscura con 0,18) y radio
de puerta 2 celdas: parámetros visuales `TUNE`, no balance. Resultado ratificado
en las tomas finales del informe de ronda.

Los atacantes son cuerpos: corregir su participación en separación, no añadir
offsets a sus mallas. Excluir caídos y desaparecidos. Mantener el tope existente
de corrección y la prohibición de empujar dentro de sólidos. La corrección puede
cambiar quién llega a alcance; documentarlo sin compensar con balance.

La huida es estado efímero de la jornada, no una nueva decisión del motor.
Sólo civiles vivos y fuera de interiores; no desertan los defensores. Activarla
por entrada hostil real, no por una puerta rota sin supervivientes dentro.
Navegar suelo alcanzable, no desplazarse en línea recta atravesando casas.
No inventar víctimas ni consecuencias persistentes. La animación debe expresar
carrera, acompañar distancia recorrida y no correr en el sitio al detenerse.

## Tests exigidos

### Contrato de vida ratificado

`life/flee.ts`: `Flight { since, route, target }`,
`beginFlight(body, land, threat, shelter?, seed, step): Flight | null` y
`stepFlight(body, flight, land, around): boolean`. `Dweller.flight` es opcional
para compatibilidad con fixtures. La activación usa el hecho existente
`anyEntered(raiders)`: actualmente nace al pasar de `breaking` a `inside`,
inmediatamente antes de cruzar visualmente. No se redefine B4 en esta ronda.

Destino propio sólo si aleja de la amenaza; alternativa en suelo alcanzable.
Interrumpir coherentemente actividad, compromisos y cargas. Al llegar, quedarse
refugiado mientras persista la amenaza; no volver a trabajar entre enemigos.
Finalizada la amenaza o jornada, volver a las rutinas. `flee` se sirve sólo al
moverse, con pose quieta al detenerse, y no pertenece a `combatClip`.

Parámetros iniciales escénicos `TUNE`: alternativa a 6 celdas, multiplicador de
paso 1,55, llegada a 0,45 (umbral de seguimiento existente), ciclo 0,8 s y zancada
0,44 celdas. No modifican cifras del motor; deben contrastarse en la observación.
La escala del aldeano participa en el reloj de distancia igual que con `walk`.

Resolver raiders activos junto a cuerpos exteriores; medir `travelled` sobre
posición final, después del contacto. No cambiar el solucionador global salvo
defecto demostrado y ampliación explícita del brief.

### Propiedades

Conservación del estado del motor; reconstrucción determinista; no huida en paz,
ni de defensores o caídos; clip y movimiento concordantes. Separación de raiders
coincidentes con obstáculos y tope de desplazamiento. Oclusión reversible sin
ocultar árboles lejanos o detrás del objetivo. No rebajar tests para esconder fallos.

## Terminado cuando

Typecheck, lint y pruebas afectadas pasan. El observatorio muestra dos aldeas
con obstáculos/solapes medidos, y una secuencia cercana de huida a 15 fps.
Registrar comandos y límites; no sustituir una captura normal por el modo
diagnóstico que apaga todo el bosque. No push ni despliegue remoto.

## Línea base

`no-bows-final-23` de integración: 61 fotogramas, distancia mínima entre
atacantes activos 0, y 4026 pares-muestra por debajo de 0,3 celdas. No es un
umbral de aceptación: prueba que hay cuerpos exactamente superpuestos.
En `no-bows-7`, el bosque oculta visualmente el portón y los atacantes.
