# Dirección de interfaz de juego · 22 sep 2026

## Motivo

Vera considera que la piel actual se ha ido demasiado hacia un libro antiguo.
La referencia aportada (pantalla de Clash Royale) marca el **lenguaje de
interacción de un juego**: jerarquía inmediata, cifras que se leen de un vistazo,
acciones con peso claro, iconos reconocibles y respuesta visual al toque. Su
saturación, caricatura y abundancia de elementos no son una plantilla para The
Valley. El valle sigue siendo protagonista, con ambientación medieval en el
mundo y en unos pocos acentos de interfaz.

La forma de los controles acompaña al 3D voxel/low poly: botones y elementos
seleccionados pueden sobresalir con volumen corto y sombras claras. El **reloj
del sol se conserva**; Vera lo señala expresamente como la única pieza de la
interfaz que no quiere cambiar.

Esta dirección sustituye la premisa de que toda superficie sea pergamino
rasgado. El libro de la portada y la crónica pueden seguir contando la historia;
la interfaz de juego debe sentirse como controles del juego.

## Reglas de la nueva piel

1. **Lectura primero.** Una sans clara para acciones, navegación, fechas,
   contadores y títulos funcionales. La serif queda para el texto narrativo de
   la crónica; los adornos de letra no se repiten en cada chip y botón. Los
   títulos funcionales usan un corte de pantalla de peso medio: deben tener
   presencia sin la negrita gruesa que endurecía portada y paneles.
2. **Jerarquía táctil.** Cada pantalla muestra una acción principal evidente,
   secundarios tranquilos, estados activo/desactivado distintos y área táctil
   mínima actual. No se añaden controles ni economía para parecerse al ejemplo.
3. **Superficies ligeras.** Placas limpias con contorno y profundidad corta;
   botones importantes con relieve visible, sin convertir toda la pantalla en
   una colección de placas.
   Textura de papel muy sutil en crónica/portada; HUD, fichas funcionales y
   navegación prescinden del rasgado y de las rotaciones decorativas.
4. **Paleta propia.** La navegación usa siempre el mismo fondo oscuro de
   madera, con ámbar para selección. Los fondos de lectura son piedra cálida
   neutra con curvas topográficas en tinta tierra; las tarjetas conservan
   marfil cálido. Los paneles evitan dominantes verdes, azuladas u oliva; la
   navegación mantiene el fondo oscuro común señalado por Vera y el estado
   activo se reconoce por el acento ámbar.
5. **Hojas de las pestañas.** Personas, Crónica y las hojas que abre Valle
   (carro y fichas) nacen al 44 % de la altura visible, como el documento de
   decisión de la referencia del 23 de septiembre, y llegan
   hasta la barra inferior. Todas usan esa misma altura aunque el contenido
   sea corto; si es largo, se desplaza dentro de la hoja. Nunca quedan
   flotando ni se despliegan hasta el HUD. El tirador de la franja superior
   permite arrastrarlas hacia abajo para cerrarlas; los gestos en el centro
   desplazan el contenido. Las decisiones narrativas conservan su propia
   composición y ocupan el 56 % inferior de la pantalla, como la referencia;
   si el texto crece, se desplaza dentro del panel. Su cabecera permite
   arrastrarlo hacia abajo sin interferir con la lectura central.
6. **Popups para tareas breves.** Las elecciones pequeñas y confirmaciones
   puntuales, como escoger el arma antes de cazar, aparecen en un cuadro
   centrado. La navegación inferior y sus páginas conservan las hojas. El
   largo del contenido decide el tratamiento: una historia o lista que exige
   desplazamiento sigue en hoja.
7. **Movimiento útil.** Las pantallas y paneles entran con un desvanecido y un
   desplazamiento corto; al volver al valle entra sólo la navegación. Las
   pestañas iluminan su estado seleccionado. Las noticias nuevas y un máximo
   de seis filas entran una vez, sin repetir la animación por cada tick. Al
   cerrar una hoja con el tirador, ésta sigue el gesto hasta salir. Una
   decisión que señala un lugar nuevo desplaza suavemente la mirada sin
   alterar el zoom; cualquier gesto del jugador interrumpe ese movimiento.
   Ninguna de estas transiciones altera el estado del juego ni el reloj solar,
   y todas respetan `prefers-reduced-motion`.

## Alcance y orden

| Paso | Superficies | Criterio de salida |
|---|---|---|
| 1. Base compartida | tokens, tipografía, botones, chips, navegación, HUD | aspecto coherente en todas las rutas que usan estas primitivas |
| 2. Pantallas | portada, crónica, gente, ficha, carro, encrucijada, avisos, bienvenida, anales y epitafio | ninguna conserva por accidente una jerarquía de manuscrito para controles |
| 3. Revisión real | móvil estrecho y escritorio, partida nueva y avanzada, paneles, decisiones y estados | sin recortes, solapes ni pérdida de foco/contraste; demo lista para juicio de Vera |

No se cambia el motor ni el contenido de crónicas en esta ronda. El diseño
actual de `docs/design.md` §11 sigue mandando sobre qué información aparece;
esta revisión afecta a su presentación. La referencia visual no autoriza copiar
marcas, ilustraciones o iconos de otro juego.
