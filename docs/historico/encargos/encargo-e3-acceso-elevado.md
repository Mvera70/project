# E3 · Acceso elevado de la guardia — contrato antes de ejecutar

## Estado comprobado el 22 sep 2026

G-27 ya entrega el modelo con 14 peldaños, lo publica y lo muestra en partidas
históricas reales; la huella de la escalera está cerrada para peatones. Por
tanto el punto 1 del orden de abajo **ya está entregado como arte visual**. No
hay que repetir el modelado ni llamar otra vez a Astra para empezar el puesto
navegable. La autorización anterior de Vera fue sólo para ese modelo; la subida
se permitió diferir si resultaba costosa.

La costura física es más seria de lo que sugiere mover el actor en Y:
`life/physics.ts` da a toda celda bloqueada un collider de altura 2, mientras
el suelo de la plataforma aprobada está a 1,02. Bajar la flecha histórica
desde 2,3 a la mano del guardia sin rehacer/filtrar el volumen de su propio
bastión la estrellaría contra piedra invisible. Antes de programar, medir
posición y trayectoria de un arquero equipado en la plataforma, y fijar cómo
se mantienen cerradas las demás celdas y los proyectiles de otros puestos.
No reducir `WALL_HEIGHT` global ni conservar 2,3 diciendo que la flecha sale
de la mano.

## Hallazgo

El bastión G-26 tiene plataforma visual a cota 1,02, pero es macizo y no
ofrece subida. `garrison.postSpot()` coloca la guardia en suelo interior;
`terrainOf` cierra la celda construida; `Body` y `Actor` sólo expresan X/Z y
`world/cast.ts` apoya el actor en el terreno. `archery.ts` lanza la flecha desde
una altura fija de 2,3, independiente de la posición dibujada. Un desplazamiento
vertical de la malla o un cambio de origen de flecha **no** cierra esta fase:
seguiría faltando un trayecto recorrible y la coherencia de colisiones.

## Límite y orden

La entrega mínima honesta es **un puesto elevado en cada bastión utilizable**,
sin abrir a peatones la celda del muro ni fingir que toda la muralla dispone
de adarve. El adarve continuo sobre tramos de muro es una ampliación distinta:
el muro actual mide unos 0,34 de grosor, frente al diámetro 0,64 del cuerpo,
y exige pasarela, accesos y navegación por niveles. No se declarará E3 cerrado
como «adarve de toda la muralla» por completar sólo el bastión.

1. Arte, sólo modelo: proponer una revisión **candidata** del bastión aprobado
   con acceso desde la cara interior, sin sobrescribir/publicar G-26 antes de
   verla y aprobarla. Dar cotas de entrada, corredor, peldaños y plataforma en
   coordenadas locales reproducibles. La plataforma transitable está a 1,02;
   1,36 es la altura máxima de las almenas, no el suelo del puesto. La anchura
   útil del paso debe superar 0,64. Si la escalera necesita invadir la celda
   interior, declararlo y mostrar la ocupación en una escena con muro vecino.
2. Navegación, Terra: ruta privada suelo → entrada → subida → plataforma y
   retorno continuo, a velocidad acotada. Sólo puede tomarla un guardia
   asignado al bastión. Si la entrada no es alcanzable o está ocupada, el
   puesto no se ofrece; no se genera un falso guardia elevado. Civiles y
   atacantes conservan las colisiones actuales con la fortificación.
3. Render/combate, Terra: propagar la cota efímera del actor hasta su malla y
   efectos asociados, iniciar el puesto y el tiro sólo tras llegar arriba,
   usar un origen de flecha coherente con la plataforma y no permitir golpe
   cuerpo a cuerpo a través de la diferencia de nivel. La balística se vuelve
   a medir: no se conserva a ciegas la altura fija 2,3.
4. Revisión, Sol: pruebas de subida y bajada sin salto, ocupación, acceso
   denegado, colisiones, tiro y captura real de un asalto con trayecto completo.
   Contrastar coste y balance antes de abrir el adarve continuo.

## Criterios de aceptación

- Guardia sale de suelo accesible, sube por geometría visible y acaba sobre
  plataforma, sin teletransporte ni atravesar muros. Al terminar, baja.
- Cuerpo y malla comparten posición y cota; la flecha sale del arquero real.
- Un acceso obstruido no fabrica un puesto imposible ni abre paso a otros.
- El bastión sigue uniendo la muralla y conserva la silueta aprobada, salvo
  cambios explícitamente mostrados al dueño.
- Prueba automatizada y toma del juego real; E3 sólo se cierra al decidir y
  comprobar si «adarve» significa también pasarela continua sobre los tramos.

## Archivos previstos (no autoriza cambios por sí solo)

`src/derive/garrison.ts`, `src/render3d/life/{garrison,terrain,body,village,cast,archery,melee}.ts`,
`src/render3d/{contracts,renderer}.ts`, `src/render3d/world/cast.ts` y pruebas
focales. El acceso debe quedar encapsulado en un módulo propio. No se toca
motor, balance ni reglas de construcción para hacer caber una escalera.
