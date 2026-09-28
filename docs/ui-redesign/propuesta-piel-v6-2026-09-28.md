# Piel V6 · piezas generadas y revisión visual

28 septiembre 2026. **Propuesta para revisión de Vera; no aprobada ni publicada.**

Base del encargo: `origin/main`, commit `2d9eb5a`, documentos
[`piezas-de-la-piel-v5.md`](../encargos/piezas-de-la-piel-v5.md) y
[`propuesta-piel-v5-2026-09-28.md`](propuesta-piel-v5-2026-09-28.md).
Se monta sobre el casco documental V4. No se ha arrancado el juego.

## Abrir la propuesta

- [HTML de revisión: carro, tablón y crónica](laminas-v6-2026-09-28/index.html).
- [Las 35 piezas a tamaño de uso](laminas-v6-2026-09-28/pieces.html).
- [Comparación de las siete crónicas: sepia y color](laminas-v6-2026-09-28/chronicle.html).
- [Hoja completa en PNG](laminas-v6-2026-09-28/hoja-piezas-tamano-real.png).

| Lámina | 390 × 844 | 320 × 568 |
|---|---|---|
| Carro | [Captura](laminas-v6-2026-09-28/carro-390x844.png) | [Captura](laminas-v6-2026-09-28/carro-320x568.png) |
| Tablón | [Captura](laminas-v6-2026-09-28/tablon-390x844.png) | [Captura](laminas-v6-2026-09-28/tablon-320x568.png) |
| Crónica | [Captura](laminas-v6-2026-09-28/cronica-390x844.png) | [Captura](laminas-v6-2026-09-28/cronica-320x568.png) |

Las capturas tienen esas dimensiones de fichero, a escala 1. Los assets son
2×. Para juzgar su tamaño, abrir el HTML al 100 % de zoom. La imagen larga
puede aparecer reducida por el visor.

## Dirección artística

La referencia es [el mockup del 24 de septiembre](../visual-reference/ui-wood/mockup-cart-2026-09-24.jpg):
color pintado, contornos suaves y luz de arriba a la izquierda. Las ilustraciones
son nuevas; no se reutilizaron los objetos dibujados en ese mockup.

**Corrección de Vera: «los cerdos un poco menos infantil», «es la Edad Media».**
La primera variante se descartó. La entrega lleva dos cerdos con ojos pequeños,
hocicos alargados, pelo áspero y expresión neutra, junto a su comedero y cerca.
El criterio queda incorporado en la skill: proporciones naturales y materiales
de trabajo, manteniendo el dibujo a color.

Se conserva la estructura V4/V5: cabecera, arco solar, iconos de navegación,
Cinzel y Garamond, papel para leer y madera en el soporte del tablón. El carro
tiene fondo de papel. La veta no se repite en cada botón. El verde corresponde
a actuar; el botón apagado utiliza la misma silueta en verde grisáceo.

## Inventario entregado

Generado con **ImageGen integrado**, una imagen por pieza. El generador crea
el dibujo; la exportación solo recorta el margen alfa y ajusta dimensiones.

| Grupo | Piezas | Destino y tamaño de fichero |
|---|---:|---|
| Marcos y controles | 8 | `src/ui/redesign/`: pergamino 640×400, cinta 600×80, coste 360×88, placas 400×92, cierre 88×88, clavos 32×32 y 48×48 |
| Recursos | 5 | `src/ui/redesign/res-*.png`, 40×40 |
| Carro | 10 | `public/ui/art/cards/means-*.png`, 192×160 |
| Misiones | 5 | `public/ui/art/cards/mission-*.png`, 192×160 |
| Crónica piloto | 7 | `public/ui/art/{harvest,birth,death,built,pedlar,wedding,fire}.png`, 640×512 |

La subcarpeta `cards/` evita una colisión real: `chronicle-art.ts` ya usa
`means-*.png` para escenas de crónica de 640×512. Esos diez originales se
conservan. Sus miniaturas nuevas tienen la medida y el uso del carro.

Los tokens de imagen y sus medidas están añadidos en
[`tokens.css`](../../src/ui/redesign/tokens.css). Los componentes del juego
todavía no consumen los nuevos tokens. Las láminas sí los prueban mediante una
copia documental, `pieces.tokens.css`.

### Nueve partes

| Pieza | Corte en píxeles del PNG | Borde CSS |
|---|---:|---:|
| Pergamino | 56 | 28 px |
| Cinta | 28 | 14 px |
| Ficha de coste | 28 | 14 px |
| Placa activa/apagada | 36 | 18 px |

Se utiliza `border-image` con centro relleno y lados estirados. Las esquinas
quedan fijas. El muestrario prueba el pergamino a 280×150 y 440×210. Cierre y
clavos conservan proporción, sin nueve partes. El CSS nuevo coloca imágenes
y texto; no dibuja materiales, filigranas ni clavos.

## Correspondencia con el juego

- **Carro:** arado, dos cerdos, barril, hacha, relicario, hatillo del forastero,
  lanzas, arco/carcaj, atalaya y portón. Precios tomados de `MEANS_SPEC`.
- **Tablón:** setas, hierbas, cráneo de lobo, pico/cuerda/mineral y fardo de
  mercancías. Duraciones, costes y límites de personas de `EXPEDITION.MISSIONS`.
  La muestra se sitúa en verano: setas y veta disponibles, mercado bloqueado
  con 12 de plata frente a 15 de coste, hierbas ya fuera con Ada y Tom.
- Los títulos y descripciones salen del banco de `2d9eb5a`; la copia de
  consulta es `bank.snapshot.json`. No se ha modificado el banco.
- Los botones son demostraciones visuales: los selectores cambian la cifra,
  Give/Send muestran la placa apagada y cerrar devuelve al valle estático.
  No simulan las reglas ni escriben una partida.

### Las primeras siete crónicas

Antes de generar se abrió cada sepia y se leyó su línea. Se mantiene el
reparto de personajes, los gestos principales y la composición del entorno.

| Fichero | Línea representada en la revisión | Composición conservada |
|---|---|---|
| harvest | `harvest.good` | Segador, mujer atando gavilla, carro y valle al fondo |
| birth | `birth.named.daughter` | Madre y bebé sentados, padre detrás, puerta abierta |
| death | `death.old_age.named` | Anciano en cama, dos familiares junto a él |
| built | `built.house` | Tres carpinteros, estructura y tablones |
| pedlar | `fate.pedlar` | Buhonero a la izquierda hablando con una pareja |
| wedding | `fate.wedding` | Pareja, oficiante con rama y dos testigos |
| fire | `fate.lightning_fire` | Dos aldeanos con cubos junto al edificio que arde |

Las cifras y nombres interpolados son ejemplos de maqueta. Hay una captura
individual `cronica-<fichero>.png` para cada escena, además de la comparación.

**Punto de revisión pedido por Vera:** detener aquí la generación de crónica.
Quedan las otras 44 y las variantes de claves compartidas del §0 del encargo.
En particular, la siega no resuelve fiesta, matanza ni juglar; el buhonero no
resuelve factor, tratante, salinero ni calderero; el fuego accidental no resuelve
los distintos incendios del asedio. El mapa de claves sigue sin cambiar.

## Verificación y alcance

- 35 PNG con alfa comprobado y dimensiones exactas; hashes y tamaños en
  [`verification-assets.json`](laminas-v6-2026-09-28/verification-assets.json).
- Se inspeccionaron las capturas de carro, tablón, crónica y muestrario.
  Se corrigió un solapamiento de dibujo y descripción en el tablón.
- Ambas anchuras: sin imágenes rotas, desbordamiento horizontal ni texto
  cortado en los elementos medidos; cierre y controles de al menos 44×44.
  Las listas desplazan dentro de la ventana. A 320×568 el tablón prioriza un
  aviso legible y mantiene a la vista el retorno de la expedición.
- Comprobación de +, cambio de aspecto del botón y cierre. Resultados en
  [`verification-layout.json`](laminas-v6-2026-09-28/verification-layout.json).
- No se ejecutaron el motor, Three.js, build del juego ni suites largas.
  Es una validación del prototipo, pendiente de prueba táctil en dispositivo.

**Cambios de producto preparados:** PNG y variables de imagen. Los siete PNG
de crónica sustituyen localmente los originales pedidos; por conservar sus
nombres, una ejecución local del juego también los serviría. No se han tocado
componentes TypeScript, rutas, motor, banco de textos ni despliegue. Las claves
compartidas siguen pendientes y requieren su propia integración tras revisión.

## Reproducir y continuar

Desde la raíz del repositorio:

1. `python docs/ui-redesign/laminas-v6-2026-09-28/export-assets.py` exporta desde
   los maestros de ImageGen anotados en el manifiesto. Requiere que esos
   maestros existan localmente y Pillow. Los PNG finales ya están en el repo.
2. `node docs/ui-redesign/laminas-v6-2026-09-28/build.mjs` reconstruye los tres
   HTML con los PNG finales, fuentes y referencias locales. Usa el snapshot
   de textos incluido; no necesita descargar nada.
3. `node docs/ui-redesign/laminas-v6-2026-09-28/capture.mjs` captura con
   Playwright y Edge headless. No abre el juego.

Los prompts completos, fuentes y revisión de cerdos están en
[`manifest.generated.json`](laminas-v6-2026-09-28/manifest.generated.json).
Los originales anteriores se guardan en `laminas-v6-2026-09-28/originals/`.

La regla se mantiene en la skill compartida del repositorio
[`.claude/skills/piel-del-valle/SKILL.md`](../../.claude/skills/piel-del-valle/SKILL.md),
legible por Claude Code y Codex. Recoge el criterio medieval, la relación
imagen/contenido, la escala 2×, el control del alfa y el corte de revisión de
las siete crónicas. La aprobación de Vera precede a la integración funcional
y a cualquier nueva tanda de crónica.
