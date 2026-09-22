# E3a · Guardia que sube al bastión

## Objetivo

Vera autorizó retomar el **puesto elevado navegable** el 22 sep 2026. La
escalera G-27 y su elección histórica ya existen. Un guardia asignado a un
bastión con acceso debe llegar por suelo, subir por la escalera visible,
ocupar la plataforma a cota 1,02, disparar desde su posición real si tiene
arco y bajar al dejar el puesto. El adarve continuo sobre los tramos de muro
queda fuera de E3a y no se presenta como terminado. Sol dirige/revisa y Terra
implementa; **no hay nueva intervención de Astra ni nuevo modelo 3D**.

## Depende de

- `docs/design.md` §1b, §2–4, D.4 y E.1/E.3/E.6/E.7.
- `docs/encargos/encargo-e3-acceso-elevado.md` y
  `art/recipes/bastion-access-candidate/README.md`: geometría, dirección,
  anchura y criterios de fallo.
- `docs/historico/graphics-rounds/G-27.md`: GLB aprobado, colocación y
  cierre de huella a peatones.

## Ficheros y propiedad

Terra puede crear `src/render3d/life/elevated-post.ts` y tocar
`src/render3d/life/{garrison,terrain,body,village,cast,archery,melee,physics}.ts`,
`src/render3d/{contracts,renderer}.ts`, `src/render3d/world/cast.ts` y pruebas
focales en `tests/fast/` o `tests/journeys/`. Tocar `src/derive/garrison.ts`
*sólo* si hace falta distinguir bastión de atalaya sin estado nuevo. No tocar
`src/engine/`, balance, mapgen, edificios, el GLB, catálogo ni publicación.
Si se necesita otro fichero, explicar la necesidad antes de editarlo.

## Contrato de ejecución

1. **Un único selector de acceso.** Usar `bastionAccessOf(state, building)`
   para que la ruta privada exista exactamente donde el plan muestra el GLB
   con escalera. `garrisonPlaces` ofrece el puesto elevado sólo si se alcanza
   desde la orilla de la guardia el pie de escalera y hay sitio para un disco
   de radio 0,32. Si falla, conservar la defensa a ras de suelo o no ofrecer
   ese puesto; nunca poner un guardia encima sin trayecto. La plaza de reparto
   de `dayPlans` sigue en suelo alcanzable.
2. **Ruta privada.** El guardia asignado llega a esa plaza por `pathTo` normal.
   Desde allí recorre una polilínea local del modelo, rotada con la misma
   transformación cardinal que el GLB. Entrada, catorce peldaños, salida y
   puesto están especificados en el README del modelo. Sólo ese guardia
   atraviesa la huella; la máscara global sigue cerrada para civiles,
   atacantes y otros guardias. Subida, ocupación y retorno son estados
   explícitos y reproducibles a paso fijo; no hay `object.position.y` animado
   únicamente en el renderer ni teletransporte entre entrada y plataforma.
   Si al cambiar de intención se abandona el puesto, se baja antes de volver
   al router de suelo. Un guardia caído no reaparece en la plataforma.
3. **Cota única.** El cuerpo efímero es dueño de la cota de pies o un estado
   asociado inequívoco; `Actor`, `Cast`, seguimiento, anillo y semilla de
   ragdoll leen la misma. Las otras personas no ganan una segunda altura por
   defecto. Excluir de empujones de suelo a quien está en la escalera o arriba,
   sin permitir que su X/Z atraviese la obra cuando vuelva a suelo. Mantener
   continuidad entre cota de terreno y primer/último apoyo; si la pendiente
   de una partida impide el empalme sin salto, no ofrecer el puesto elevado y
   medir cuántos casos afecta antes de cambiar el mapa.
4. **Disparo físico, no alto de mentira.** Un arquero sólo cuenta como ocupante
   y dispara tras llegar al puesto. Su origen X/Z/Y procede de esa posición y
   la pose del arma, no del `LOOSE_HEIGHT = 2.3` global. La celda del bastión
   necesita un collider compatible con suelo de plataforma a 1,02, en lugar
   del cubo genérico de altura 2 que bloquearía una flecha nacida a la altura
   de la mano. Mantener los colliders de muros y otras celdas. La salida de
   flecha debe separarse de la propia piedra sin volver atravesables las
   fortificaciones para proyectiles ajenos; medir trayectorias/impactos con
   varias semillas antes de aceptar. No reducir `WALL_HEIGHT` global.
5. **Combate por nivel.** Un atacante en suelo no alcanza en cuerpo a cuerpo a
   un defensor que ya está arriba. Mientras el guardia sube o baja, el
   contacto se evalúa desde su cota real, no por sólo distancia horizontal.
   El bastión sin escalera y todos los puestos de suelo conservan el contrato
   anterior. No modificar daño, cadencia ni resultado del motor por estética.

## Pruebas y falsación

- Geometría pura: cuatro orientaciones, entrada/catorce apoyos/plataforma,
  monotonía de subida y bajada, límite de velocidad por paso, continuidad de
  posición y cota. Pendiente incompatible, escalera inaccesible u ocupada
  niegan elevación; peatones normales siguen viendo ambas celdas bloqueadas.
- Jornada: guardia asignado sale del suelo, sube, permanece y baja sin salto;
  no dispara de camino; otra persona o un raider no toma la ruta; misma
  semilla/pasos reconstruyen el mismo estado.
- Física: flecha desde guardia elevado no impacta en su propio bastión al
  nacer y sí puede ser interceptada por otra pared; origen visual y físico
  coinciden. Ningún golpe de suelo mata a través de la altura.
- Captura del **juego real**, no del visor aislado: secuencia completa de
  entrada, subida, puesto y bajada en dos historias con acceso. Trazar cota,
  clip, puesto, disparos, errores, colisión y continuidad; si ninguna historia
  produce recorrido, no darlo por aceptado. Comparar al menos una defensa sin
  acceso con su comportamiento previo.
- `typecheck`, lint y pruebas focales durante implementación; suites amplias
  al cierre de la tanda, sin cambiar listones ajenos. Las dos rojas históricas
  de `assault.test.ts` no se atribuyen ni se silencian.

Terminado cuando el recorrido y el disparo se ven y se miden en una partida
real, sin abrir la escalera al resto ni falsear la cota de flecha. Si la física
del propio bastión requiere una ampliación no acotada, parar, conservar G-27
y documentar el límite; no introducir un arquero levitando como sustituto.
No hacer push ni desplegar por este brief.
