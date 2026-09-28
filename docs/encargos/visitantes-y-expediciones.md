# Visitantes y expediciones — encargo de modelos (28 sep 2026)

Pedido por el dueño del diseño con las llegadas nuevas y las expediciones
(v4.95): «si necesitamos nuevos modelos para los visitantes, expedicionarios y
ese tipo de cosas, hay que ir pidiéndolos». Hoy todos salen con el aldeano de
siempre y, el que carga, con el fardo genérico. Esto es lo que hay que darle a
Astra, en orden.

**Para todos:** estilo de los demás modelos (facetado, sin texturas, color en
los materiales). Una celda es un metro y pico; un aldeano mide 0,65 celdas.
Sin texto legible. Entran con `npm run art` y `publish-assets.ts` como el
resto.

## 1 · El tablón de misiones (`notice-board`) — el primero

Un tablón de avisos de madera en la plaza, con dos postes, tejadillo de dos
aguas y tres o cuatro papeles clavados. **Es un objeto que se toca**: abre la
ventana de las misiones, así que tiene que leerse desde lejos como «aquí hay
algo». Alto 1,3 celdas, ancho 0,9, fondo 0,3. Origen en la base, frente a +Z.

## 2 · Lo que distingue a cada visitante

Accesorios para el aldeano que ya existe, no figuras nuevas. Cada uno con su
punto de enganche (mano derecha, espalda o cabeza) como las armas de E1.

| id | Quién | Qué |
|---|---|---|
| `fiddle` | El juglar | Un violín con su arco, en la mano |
| `pilgrim-hat` + `pilgrim-staff` | Los peregrinos | Sombrero de ala ancha con concha; bordón alto con calabaza |
| `grindstone-pack` | El calderero | La piedra de afilar en su bastidor, a la espalda, con un par de ollas colgando |
| `herb-basket` | La curandera | Cesta de mimbre al brazo, con manojos que asoman |
| `bundle-pack` | La familia que huye | Un hatillo grande a la espalda (los adultos) |

## 3 · Lo que llevan los expedicionarios

| id | Misión | Qué |
|---|---|---|
| `forage-basket` | Setas, hierbas | Cesta llena, para la vuelta (sustituye al fardo genérico) |
| `rope-pick` | La veta alta | Rollo de cuerda al hombro y un pico |
| `trade-pack` | El mercado | Fardo atado con correas, más grande que el del buhonero |
| `hide-bundle` | La lobera | Pieles dobladas al hombro, para la vuelta |

Las lanzas de la lobera ya existen (E1).
