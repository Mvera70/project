# E3b.2c · Integración selectiva del adarve

**Estado:** preparado tras el inventario E3b.2a. No se despacha hasta revisar
las medidas de los candidatos E3b.2b. Los candidatos son fuentes de geometría,
no una autorización para declarar transitable el anillo.

## Objetivo

Extender la primera junta E3b.1 a los tramos de piedra conectados del mismo
anillo: recta, giro, diagonal y portón. Un guardia asignado al bastión podrá
recorrer únicamente la parte continua y volver por ella. La muralla y el
portón conservarán el paso público y el combate actuales.

## Puertas de entrada

1. Cada variante candidata tiene suelo a Y=1,02, paso barrido de disco de
   radio 0,32 con ancho libre mínimo 0,70, apoyo visible y comparación con
   la pared o el portón reales. Una variante rechazada no se monta ni se
   marca como ruta.
2. Publicar sólo los GLB aprobados, con inspección de geometría, procedencia
   y coste. El catálogo y el manifiesto deben coincidir. Si falta un recurso
   en una biblioteca parcial, mantener la última ruta completa de E3b.1 o
   el acceso E3a; no dejar tablero flotante ni destino elevado sin suelo.
3. El caso de madera queda excluido: ningún tramo de empalizada recibe
   pasarela de piedra. Una brecha, ruina u obra interrumpe la ruta.

## Contrato de software

- Derivar la cadena desde edificios vivos y conexiones reales, sin guardarla.
  El selector actual en `src/engine/world/bastion-walkway.ts` sólo admite dos
  muros rectos; para E3b.2 crear la extensión pura en `src/derive/`, sin
  modificar reglas del motor, balance, esquema ni guardados. Usar la misma
  condición de diagonal efectiva que `defenceConnections` y no cruzar un
  codo cardinal inexistente.
- Representar cada enlace con celdas, variante, orientación y extremos de
  ruta. El plan de escena monta sólo piezas aprobadas y completas; no pasa
  ninguna pasarela por `buildDefence`, que reduce el grosor del muro a 0,34.
  El portón conserva su hoja móvil y gálibo público de 0,84.
- La ruta privada usa la escalera E3a validada, sigue el centro medido de
  cada tablero y regresa por la misma secuencia. La máscara pública de suelo
  permanece cerrada para civiles y atacantes. `garrisonOf` no crea puestos
  nuevos ni cambia prioridades.
- Física y dibujo comparten Y=1,02 y los mismos límites de parapeto. Las
  flechas propias deben salir del arco sin tocar su parapeto; la piedra ajena
  sigue interceptándolas. Al perderse una pieza, el guardia vuelve al último
  tramo seguro o al suelo antes de retirar su apoyo.
- Antes de pintar la franja interior, comprobar el tronco real y su
  desplazamiento. Un árbol que invade la pieza impide montarla hasta la tala
  ordinaria; no borrar árboles ni alterar la madera del motor.

## Orden y propiedad

1. **E3b.2c.1, selector y ruta pura:** `src/derive/` y pruebas focales.
   Prueba cuatro orientaciones, máscara 65, diagonales 16/32/64/128, portón
   65/128, brecha, madera, obra y obstáculo interior. Ninguna escena todavía.
2. **E3b.2c.2, escena y carga:** `src/render3d/world/plan.ts`,
   `src/render3d/world/buildings.ts`, `src/render3d/renderer.ts`, catálogo,
   manifiesto y pruebas focales. Sólo modelos aprobados en la puerta 2.
3. **E3b.2c.3, cuerpo y física:** `src/render3d/life/` y pruebas de recorrido,
   regreso, soporte y flecha. Mantener el respaldo E3a.
4. **E3b.2d, revisión real:** dos semillas, incluida una unión no recta y un
   portón, con traza temporal del mismo guardia, captura día/noche, errores y
   posición de flechas. La captura fija no acredita tránsito. Comparar la
   visibilidad mientras la tala despeja el borde de piedra.

**Terminado cuando:** el guardia sube, recorre un enlace no recto y el portón,
ocupa un puesto y regresa sin salto ni hueco; un tramo perdido corta el
recorrido; el paso del portón y la máscara pública siguen intactos; pruebas
focales, typecheck, lint y revisión en app confirman geometría, colisiones y
tiro en dos valles. Si alguna forma no alcanza estas condiciones, se informa
el segmento desconectado y E3b.2 sigue abierta.

## Auditoría de integración en seed 91 / año 80

La captura real mostró una separación entre el muro diagonal y la jamba del
portón. La escena ya deriva una junta visual de piedra para esa esquina y se
ha contrastado en captura con el portón publicado y con la variante ancha.
No convierte por sí sola el adarve en ruta transitable.

El corredor desplazado hacia el interior tropieza con las casas 169/298 y la
herrería 310. El barrido contra sus GLB reales confirma que moverlo hacia
fuera dentro de la misma celda tampoco da un paso apoyado de 0,70: la corona
del muro publicado mide cerca de 0,36 y el pretil ocupa el margen. La
evidencia reproducible está en
`artifacts/graphics/E3b2-candidates/interior-clearance-review/`.

Hay una familia **candidata** con el suelo sobre el eje de un muro ensanchado,
en `art/recipes/e3b-walltop-candidate/`. Su sección recta despeja esos
edificios en CPU, pero aún falta arte final, exportación, apoyo del portón,
salida del segundo bastión, transiciones mixtas, comprobación de las mallas
finales, física y revisión de coste. El selector identifica ahora ese
bastión intermedio como variante propia, sin aprobarlo como giro común.
Ninguna de estas piezas nuevas se publica ni abre el anillo hasta pasar las
puertas de entrada de este encargo.

La comprobación posterior de las 16 diagonales de ese valle, usando la huella
de la receta centrada con paso y pretiles (ancho exterior 0,90), no encuentra
contacto con edificios ni troncos. Es evidencia de sección y ocupación, no un
GLB montado: `artifacts/graphics/E3b2-candidates/interior-clearance-review/diagonal-0p45/`.
Hay candidatos separados para el apoyo del portón y para los dos bastiones.
El bastión 296 sólo enlaza cardinal con diagonal si su escalera se desplaza
0,65 hacia el exterior; conserva ancho y pendiente, y la franja nueva está
libre en esa semilla. La escalera actual no tiene gálibo bajo el nuevo tablero.
Su maqueta y barrido están en
`artifacts/graphics/E3b2-candidates/bastion296-mixed-review-01/`.
