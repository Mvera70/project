# Encargo a Astra · los modelos 3D que faltan

**26 sep 2026.** Lo pidió Vera: «todo el tema de los assets en 3D, hazme una
lista y un prompt para pasárselo a Astra, que lo haga él». Por su regla de
delegación, **Astra hace sólo el modelo**: la receta, el GLB candidato y su
captura. La integración en el juego, el catálogo y la publicación los hace
después otra sesión.

Todo sale de `docs/encargos-3d.md`, de los briefs que ya existen y de lo que
hoy se dibuja por código a falta de modelo. Lo que ya está hecho no se repite
(ver el final).

---

## La lista, por prioridad

| # | Modelo (`id`) | Para qué | Qué se ve hoy | Brief | Presupuesto |
|---|---|---|---|---|---|
| 1 | **La sala del rey** (`hall`) | La casa del que lleva la corona, junto a la plaza | Una caja de 3×3 con tejado burdeos (`BUILDING_LOOKS.hall`) | `docs/historico/plan-rey.md` §8, completo: medidas, piezas, `hall_door`, pendón | ≤ 1 500 triángulos |
| 2 | **Los tres puestos del mercado** (`stall-pedlar`, `stall-factor`, `stall-salter`) | Lo que montan los visitantes mientras se quedan | Primitivas por código en `src/render3d/effects/stalls.ts` | Abajo, §A | ≤ 600 cada uno |
| 3 | **La cara de cantera** (`quarry-face`, tres estados) | Donde se pica la piedra; tiene que leerse como cantera y cambiar al picarla | Cantos sueltos (`rock.glb`) | Abajo, §B | ≤ 700 por estado |
| 4 | **El kit de roca de montaña** (`crag-1` a `crag-5`, `cairn`) | Los peñascos de las laderas y el mojón de cada entrada del valle | Icosaedros deformados por código (`src/render3d/world/mountains.ts`) | Abajo, §C | ≤ 80 cada peñasco, ≤ 200 el mojón |
| 5 | **El roble del valle** (`great-oak`) | El emblema del título, a la orilla del lago | Primitivas por código (`src/render3d/world/great-oak.ts`) | `docs/encargos-3d.md`, «El roble del valle» | ≤ 2 500 |
| 6 | **La casa quemada** (`house-burnt`) | La casa en pie tiznada tras el fuego, antes de caer a ruina | El fuego se pinta sobre la ruina; no hay estado intermedio | `docs/encargos-3d.md`, «E4 · El fuego» | Como `house` |

**Antes de empezar, Vera tiene que decidir dos cosas** (se le pregunta, no se
supone): si el **5** (roble) y el **6** (casa quemada) entran en esta tanda.
El 6 roza el fuego de E4, y lo que se enseña del fuego es decisión suya.

### §A · Los puestos

Una celda son 3 m; un aldeano mide 1,95 m (0,65 celdas). Cada puesto cabe en
**1 × 1 celda** y se monta delante del visitante mirando a la plaza (+Z hacia
el comprador).

- **El buhonero** (`stall-pedlar`): tenderete de dos postes con toldo a rayas
  (dos colores de la paleta, no más), un tablero con baratijas (cuencos, un
  rollo de tela, cintas) y un fardo en el suelo.
- **El factor** (`stall-factor`): mesa de caballete con un libro de cuentas
  abierto, una balanza de platillos y dos sacos vacíos doblados al lado.
- **El salinero** (`stall-salter`): tres sacos de sal apilados, uno abierto con
  la sal a la vista (blanca, un material aparte) y una pala de madera.

Tienen que leerse desde la cámara de reposo, que mira desde arriba y lejos: la
silueta y el color hacen el trabajo, no el detalle. La referencia de lo que ya
dibuja el código está en `src/render3d/effects/stalls.ts`, con las medidas.

### §B · La cara de cantera

Un frente de roca de **2 × 1 celdas** (6 × 3 m), de unos 2,4 m de alto, con
tres estados en tres GLB: **intacta** (bloque con grietas marcadas), **picada**
(una muesca escalonada y bloques cortados al pie) y **agotada** (el frente
rebajado, escombro y un bloque a medio sacar). Facetada, con la piedra de la
paleta (`stone`, `rock`). El pico ya existe (`pickaxe.glb`) y el golpe se mide
contra el borde de la roca: el frente tiene que tener **una cara casi vertical
mirando a +Z** para que el pico la toque.

### §C · El kit de roca

Cinco peñascos facetados de formas distintas (uno plano de losa, uno alto,
uno redondeado, dos irregulares), de **1 celda de ancho** en su escala 1: el
juego los escala de 0,15 a 1,3. Y el mojón: cuatro piedras apiladas de mayor a
menor, de 0,7 celdas de alto en total. Tiene que casar con la sierra facetada
que ya está en el juego (caras planas, luz dura). La paleta está en
`public/assets/models/palette.json`.

---

## Lo que ya está hecho y no se encarga

`bow`, `spear`, `arrow`, `shield`, `gate` (con `gate_door`), `plough`,
`fountain`, `axe`, `pickaxe`, `bastion` y sus variantes, `villager-neighbor`,
los candidatos del adarve (`e3b-*`), los once modelos de Vera del 25 sep
(lobo, oso, perdiz, jabalí, perro, mula, azada, cubo, flecha, escudo, pico) y
el zorro, que tiene esqueleto y **espera el visto bueno de Vera**: no es de
esta tanda.

---

## El prompt para Astra

Se pega tal cual:

````text
Eres Astra y vas a modelar en 3D para The Valley, un juego idle de una aldea
medieval en Three.js (repositorio en D:\DESARROLLO\PROYECTOS\VALLEY\project).
Tu trabajo es SÓLO el modelo: recetas, GLB candidatos y capturas de revisión.
No toques src/, tests/, el motor, public/assets/ ni art/catalog.json; no
publiques nada ni integres nada en el juego. La integración la hace otra
sesión después. No hace falta que Blender esté abierto: se construye en
segundo plano con el camino de tools/art.

Lee primero, en este orden:
1. docs/encargos/encargo-astra-modelos.md: la lista, las medidas y los
   presupuestos. Es tu brief.
2. docs/historico/plan-rey.md §8: la sala del rey, completa.
3. tools/README.md, sección «art/ — de la receta al GLB», y
   docs/encargos/encargo-fuente.md como ejemplo de cómo se escribe y se
   construye una receta (art/recipes/<id>/<id>.json, en metros, con los
   materiales de la paleta).
4. public/assets/models/palette.json: los únicos colores que valen.

Qué entregar, por cada modelo de la lista, en orden de prioridad (1 a 4; el 5
y el 6 sólo si el encargo dice que Vera los ha aprobado):
- La receta en art/recipes/<id>-candidate/<id>.json, reproducible.
- El GLB construido en artifacts/graphics/astra/<id>/<id>.glb, dentro del
  presupuesto de triángulos de la tabla.
- Una hoja de capturas en artifacts/graphics/astra/<id>/sheet.png: vista de
  tres cuartos desde arriba (la cámara del juego), frente, perfil, y el modelo
  junto a public/assets/models/villager.glb y house.glb para la escala.
- Un README.md corto en esa carpeta: medidas reales, triángulos, materiales, y
  lo que no llegó y por qué.

Reglas que no se negocian:
- Una celda son 3 m; un aldeano mide 1,95 m. Se mide en el juego, no a ojo.
- Estilo low-poly facetado, como el resto del valle: caras planas, sin
  texturas, color por material de la paleta.
- La sala del rey lleva la hoja de la puerta en una malla llamada
  exactamente hall_door, con el origen en la bisagra; sin ese nombre la puerta
  no abre.
- La cara de cantera tiene una cara casi vertical mirando a +Z, que es contra
  la que golpea el pico.
- Si te falta un dato, no lo inventes: apúntalo en el README como pregunta
  para Vera y sigue con el siguiente modelo.
- Trabaja en una rama propia (art/astra-modelos), commits por rutas
  explícitas, nunca git add -A, y no toques ficheros sin seguimiento que no
  sean tuyos (deliverables/, .codex-remote-attachments/).

Al acabar, di en español qué modelos están, cuántos triángulos tiene cada uno,
dónde están las capturas y qué preguntas quedan para Vera.
````
