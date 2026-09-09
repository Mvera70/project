# Ronda G-03 · Primer estudio de dirección artística

Prompt derivado de `docs/design.md` v2.92, Anexo D. Estado: listo para ejecutar.
No iniciar rig, animación ni G-04.

## Cabecera

Eres el agente de arte técnico de G-03. Debes producir dos direcciones visuales
originales y comparables para un rincón de The Valley, renderizarlas dentro de
Three.js y entregar evidencia que permita escoger o rechazar la dirección.

Lee `CLAUDE.md`, `docs/design.md` §1–4, D.0–D.4, D.8, D.10–D.11, el brief G-03
y los informes G-01/G-02. No leas el historial completo ni G-04 en adelante.
Revisa `git status`; hay trabajo paralelo en el motor que no debes tocar.

## PARTE 0 — Cierres

G-02 ratificó receta → Blender → GLB → Three.js → promoción. Usa ese pipeline.
La cadena local de P0 está cerrada; la prueba desde otro dispositivo continúa
pendiente y no bloquea la producción local. Todos los recursos de esta ronda
permanecen en estado `study`; aceptación visual corresponde al usuario.

Transferencia explícita autorizada, solo si hace falta para formas generales:
`tools/art/schema.ts`, `tools/art/index.ts`, `tools/art/blender-build.py`,
`tools/art/glb.ts` y `tests/fast/art-manifest.test.ts`. Puedes añadir primitivas
de uso general (`cylinder`, tejado/gable paramétrico o malla prismática simple),
jerarquía de nodos y resolución de recetas en subdirectorios. Ninguna rama del
generador puede preguntar por el id concreto de un recurso.

## PARTE 1 — Dos direcciones controladas

Alcance artístico:

- `art/recipes/palette.json`
- `art/recipes/village-kit/`
- `art/recipes/villager-study/`
- `art/catalog.json`
- `artifacts/graphics/G-03/`
- `docs/graphics-rounds/G-03.md`

Crea dos escenas con el mismo contenido, huellas, orientación, cámara, iluminación
y resolución. Solo cambian decisiones artísticas declaradas. Cada escena incluye:
una casa de madera/plaster con puerta legible, un campo con surcos, un tramo de
camino, dos o tres árboles y un aldeano junto a la puerta para fijar escala. Todo
debe estar sobre una parcela compacta, no sobre el mapa completo.

Direcciones a explorar:

**A · Cuento tallado.** Volúmenes robustos y algo irregulares; entramado oscuro,
yeso cálido, tejado pronunciado, árboles facetados en masas compactas; aldeano
con cabeza y manos enfatizadas, ropa de tonos terrosos y silueta muy clara.
Debe sentirse artesanal y vivido sin depender de texturas pintadas.

**B · Maqueta serena.** Geometría más limpia y redondeada; madera clara, cubierta
de paja, follaje más amplio, colores algo más luminosos; aldeano menos cabezón y
postura más naturalista. Debe conservar lectura en móvil y no convertirse en
miniatura realista o genérica.

No copies recursos, formas distintivas ni paletas de los juegos citados. Sus
referencias son cualidades de lectura y ambiente. Los modelos son originales y
se construyen desde recetas del proyecto.

Produce además un GLB cercano de aldeano A y otro B, con brazos, antebrazos,
manos, piernas, pies, torso y cabeza como piezas nombradas y separadas. Aún no
hay rig ni clips; la separación prueba que G-04 podrá comparar articulación
rígida y malla deformable. Postura neutra legible, sin cápsula provisional como
resultado final. No añadas género, oficio o edad que el fixture no declare.

## PARTE 2 — Escala, composición y paleta

Una unidad de escena sigue siendo una celda. La casa debe respetar una huella
declarada y la puerta debe caer en su borde lógico; el aldeano se apoya en Y=0.
Incluye un objeto de referencia de una celda en metadatos o evidencia, no como
decoración visible del resultado final. Nombra raíces y partes de forma estable.

`palette.json` asigna roles semánticos de D.3 y contiene A/B. El generador consume
colores desde las recetas resueltas; no dupliques hexadecimales en Python. Usa
materiales sencillos compatibles con glTF y rugosidad alta; sin texturas, nodos
propietarios, posprocesado ni efectos que oculten la forma.

Captura cada rincón en 390 × 640 CSS px y cada aldeano en 640 × 640, pixel ratio
1, misma cámara `iso-ne`. Añade capturas en escala de grises mediante el
capturador o una ampliación general de este. Las comparaciones deben conservar
la misma variable salvo la dirección A/B. No recortes a mano.

La casa, campo, camino y árbol deben distinguirse por forma en gris. Desde el
rincón completo deben leerse puerta, dirección del camino y presencia del
aldeano; desde el estudio cercano, manos/pies y dirección del cuerpo.

## PARTE 3 — Validación y evidencia

Usa `build`, `validate` y `report` por recurso. El catálogo conserva hashes,
procedencia original, estadísticas y estado `study`. Abre y revisa todas las
capturas finales, incluida la escala móvil y grises. Una imagen atractiva de
Blender no sustituye la vista Three.js.

El informe debe incluir:

1. Tabla A/B con decisiones, dimensiones, objetos, materiales y triángulos.
2. Hoja de contacto: A y B en móvil, grises y aldeanos cercanos.
3. Lectura concreta de silueta, escala, casa/campo/camino/árbol, oclusión y color.
4. Defectos clasificados como bloqueo, mejora o preferencia.
5. Qué dirección recomienda el agente y por qué, sin declararla aceptada.
6. Comandos y validaciones; desviaciones que deban subir a spec.

Ejecuta typecheck, pruebas rápidas relevantes, suite completa, lint y build.
No ajustes la suite por cambios paralelos. Detén G-03 si cualquiera de estas cosas
ocurre: la casa solo se reconoce por color, el aldeano desaparece a 390 px, la
puerta contradice la huella, la dirección solo resulta atractiva en Blender o
las diferencias A/B mezclan cámara/contenido con estilo.

**Terminado cuando:** ambas propuestas están producidas por el pipeline y pueden
compararse en una sola evidencia remota. P1 no se cierra hasta que el usuario
escoja, combine o rechace las direcciones sobre esas imágenes.
