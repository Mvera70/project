# Encargo de arte · los dibujos de la interfaz

**16 sep 2026.** Para la sesión de arte (la de Blender/Codex). Es lo que
`plan-piel.md` §4 necesita para que la interfaz se parezca a los prototipos
(`docs/ui-redesign/ui-prototypes/`). **Nada de esto bloquea la interfaz**:
cada dibujo tiene un respaldo escrito en el plan, y el arte «aparece» en el
juego cuando existe el fichero, como los aldeanos de V-15. Se puede entregar
de uno en uno.

---

## 1. El estilo, en una frase

**Grabado a una tinta**: línea de trazo, sin relleno ni color, sobre
transparente. Como las dos ilustraciones del prototipo 02 (la casa junto al
vado, el árbol nevado) y los retratos del 03. A 256 px de alto, línea de
1,5–2 px; a 100 px —que es como se ve en la crónica— tiene que seguir
leyéndose como una escena y no como una mancha. Nada de sombreado por
degradado; el volumen, con tramas de líneas si hace falta.

Formato: **SVG** (preferido, `fill="none"`, `stroke="currentColor"`, viewBox
cuadrado o 5:4) o PNG 512 px con transparencia. El color lo pone la interfaz
(`currentColor` = tinta), así que el dibujo no lleva ninguno.

Entrega en `public/ui/art/<nombre>.svg` y una línea por dibujo en
`public/ui/art/index.json` (`{"name": "wolf", "file": "wolf.svg"}`): la
interfaz lee ese índice y sólo usa lo que está listado.

---

## 2. Los dibujos de la crónica (22, cada uno 5:4)

Lo que ilustra cada entrada, según `plan-piel.md` §3.6. Una escena por
dibujo, sin texto dentro, sin personas reconocibles (son entradas de
cualquier año y cualquier aldea).

| Fichero | Escena |
|---|---|
| `founding.svg` | dos figuras de espaldas con un hato y una cesta, un río al fondo |
| `season-spring.svg` | un brote entre surcos |
| `season-summer.svg` | espigas altas y sol |
| `season-autumn.svg` | un árbol soltando hojas |
| `season-winter.svg` | un árbol desnudo con nieve (como en el prototipo 02) |
| `birth.svg` | una cuna, o un hato pequeño en brazos |
| `death.svg` | una cruz sencilla junto a un árbol |
| `harvest.svg` | gavillas atadas en un campo |
| `famine.svg` | un cuenco vacío sobre una mesa |
| `plague.svg` | una puerta cerrada con una marca |
| `fire.svg` | un tejado con humo y llamas de línea |
| `built.svg` | un tejado a medio levantar con vigas (como en el prototipo 02) |
| `lost.svg` | una ruina: dos muros y hierba |
| `road.svg` | un camino que se va entre árboles, una figura pequeña |
| `grudge.svg` | dos figuras de espaldas, separadas |
| `succession.svg` | un bastón apoyado en una silla vacía |
| `flood.svg` | el río fuera de su cauce, una cerca medio hundida |
| `wolf.svg` | un lobo junto a una cerca, de noche (luna) |
| `wedding.svg` | dos figuras de frente, una guirnalda |
| `pedlar.svg` | un carro con fardos |
| `fish.svg` | un cesto con peces junto al agua |
| `bear.svg` | un oso entre árboles |
| `child.svg` | una figura pequeña junto al vado |

---

## 3. Las piezas de la carcasa (7)

| Fichero | Qué es | Tamaño |
|---|---|---|
| `seal.svg` | sello de lacre: círculo irregular con un árbol dentro (como el del prototipo 02). Éste **sí lleva color**: `#5B1A1B` con el árbol en `#F1DEAE` | 48 × 48 |
| `oak-leaf.svg` | la hoja de roble del ornamento de la bandeja (prototipo 01) | 24 × 24 |
| `corner-left.svg`, `corner-right.svg` | los ornamentos vegetales de las esquinas de la página (prototipo 02) | 90 × 140 |
| `scroll-edge.svg` | la silueta curvada del borde superior de la bandeja (prototipo 01): un solo trazado cerrado, relleno `#2B1F17`, ancho completo | 390 × 26 |
| `capital-frame.svg` | el marco de la capitular: filigrana de esquinas para un cuadrado (prototipo 02), en trazo; el fondo rojo y la letra los pone la interfaz | 54 × 54 |
| `medallion-ring.svg` | el anillo del retrato: círculo con un ligero grabado (prototipo 03) | 90 × 90 |

---

## 4. Los iconos del sprite (10, opcional)

`plan-piel.md` UI-V0 dibuja unos iconos simples de trazo para poder cerrar.
Si la sesión de arte los quiere hacer mejor, van en `public/ui/icons.svg`
como `<symbol id="…">` de 24 × 24, trazo 1,5 px, `currentColor`: `people`,
`wheat`, `logs`, `face`, `mountains`, `book`, `footprints`, `oak-leaf`, `sun`,
`seal-tree`.

---

## 5. Lo que no se pide, y por qué

- **Retratos por aldeano.** Cuarenta y cuatro personas por valle y cada valle
  distinto: no se pueden dibujar a mano. La interfaz pone un monograma, y si
  el dueño quiere retratos, UI-V4b los renderiza desde el modelo 3D real de
  cada uno (en sepia), que ya existe. No hay nada que dibujar aquí.
- **Texturas de pergamino.** Las genera un script determinista
  (`tools/ui/parchment.py`); un PNG pintado a mano no sería reproducible.
- **Fondos, paisajes, nada del valle.** El 3D no se toca.

---

## 6. Cómo comprobar antes de entregar

1. Abrir el SVG a 100 px de alto sobre un fondo `#EADBC2`: ¿se lee la escena?
2. Ninguna capa con color salvo `seal.svg`.
3. `public/ui/art/index.json` sigue siendo JSON válido después de añadir la
   línea (`python -m json.tool public/ui/art/index.json`).

No hace falta tocar `src/`, ni Blender, ni `npm run art`. Un commit por tanda
(«crónica», «carcasa», «iconos»), con mensaje en español.
