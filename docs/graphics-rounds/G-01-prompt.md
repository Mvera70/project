# Ronda G-01 · Visor Three.js y banco de captura

Prompt derivado de `docs/design.md` v2.90, Anexo D. Estado: ejecutado y arbitrado
en v2.91; resultado en `G-01.md`. No reutilizar este prompt para iniciar G-02.

## Cabecera

Eres el agente de implementación de G-01. Debes probar que el GLB producido por
G-00 se carga y se representa en el navegador con la misma convención espacial,
y dejar contratos/capturas reproducibles para las rondas siguientes.

Lee `CLAUDE.md`, `docs/design.md` §1–4, D.0–D.2, D.5, D.7, D.10–D.11, el brief
G-01 y `docs/graphics-rounds/G-00.md`. No leas el historial completo ni los
briefs G-02 en adelante. Revisa `git status` y conserva todos los cambios locales.

## PARTE 0 — Cierres

G-00 ratificó Blender 5.2.1 LTS en segundo plano y produjo
`artifacts/graphics/G-00/axis-marker.glb`. La cabecera GLB es válida, pero P0
sigue parcial porque nadie lo ha cargado en Three.js. Chrome del sistema funciona
con Playwright. Blender puede devolver código 0 ante una excepción Python: no
uses su código de salida como única prueba de éxito.

La preparación detectó que Three.js 0.186.0 aún no tiene tipos alineados en
DefinitelyTyped. Usa la pareja comprobada `three@0.185.0` y
`@types/three@0.185.4`, fijada en `package-lock.json`. La modificación de
`package.json` y lockfile pertenece
al integrador/orquestador; si ya está hecha, consúmela y no la reescribas.
No añadas frameworks, controles de cámara ni librerías de snapshot.

## PARTE 1 — Contratos

Alcance principal:

- `src/render3d/contracts.ts`
- `tests/fast/graphics-contracts.test.ts`

Materializa literalmente los tipos de D.5. Añade `@render3d/*` a los alias de
TypeScript y Vite solo si es necesario; esos dos ficheros compartidos requieren
que el orquestador integre la modificación. No implementes un renderer vacío.

El test debe proteger propiedades reales: `GraphicsTarget` conserva identidad
compatible con la ficha existente; los contratos solo importan `GameState` como
tipo; ningún objeto de escena/cámara/reloj entra en el estado. No escribas una
prueba que solo repita una interfaz a mano.

## PARTE 2 — Visor y captura

Alcance:

- `tools/graphics/viewer.html`
- `tools/graphics/viewer.ts`
- `tools/graphics/capture.ts`
- `artifacts/graphics/G-01/`

El visor es una herramienta, no una pantalla de producción. Debe:

- Cargar por URL un GLB local mediante `GLTFLoader` y esperar su carga real.
- Usar WebGLRenderer y cámara ortográfica fija; encuadrar el recurso por su caja
  calculada, sin números particulares del marcador.
- Añadir fondo, luz y suelo neutros que no oculten los colores exportados.
- Exponer en `document.documentElement.dataset` estados `loading`, `ready` y
  `error`, más un mensaje interpretable para captura automatizada.
- Aceptar por query el recurso, ancho/alto lógico y un identificador de cámara.
- Renderizar de forma determinista a tiempo fijo. Sin reloj de pared, OrbitControls
  ni animación continua en esta ronda.
- Liberar geometrías, materiales, texturas y renderer al cerrar la página.

El capturador levanta un servidor Vite en puerto libre, abre Chrome headless,
espera `ready` o falla inmediatamente ante `error`, captura PNG y escribe un JSON
con URL de recurso, viewport, pixel ratio, cámara, caja calculada, versión Three,
duraciones y errores. Nada de sleeps arbitrarios. Prueba también un recurso
inexistente y conserva su diagnóstico sin confundirlo con fallo de la captura válida.

La ruta del GLB puede estar bajo `artifacts/` durante el piloto, pero debe
resolverse mediante el servidor y nunca `file://`. No copies todavía este recurso
de diagnóstico a `public/assets`.

Captura dos ejecuciones idénticas. Compara dimensiones y un hash de los PNG;
si el hash difiere en el mismo host, diagnostica antes de cerrar. No prometas
igualdad entre GPU o navegadores distintos.

## Evidencia y cierre

Entrega `docs/graphics-rounds/G-01.md` con:

1. Comando exacto y versiones.
2. Confirmación de carga de la escena GLB, nombres de objetos y caja observada.
3. Dos hashes de captura y tiempos.
4. Captura abierta y análisis concreto: orientación, colores, encuadre, sombras
   y diferencias frente al PNG de Blender.
5. Resultado de recurso inexistente.
6. Tests/typecheck/lint/build y cualquier desviación.
7. Hallazgos para ratificar, rechazar o promover en la spec.

**Qué falsaría la hipótesis:** que el GLB requiera reparación manual para cargar,
que la conversión de ejes invierta el marcador, que el visor necesite números
propios de ese recurso o que dos capturas idénticas difieran en el mismo entorno.
Si sucede, corrige la costura antes de G-02; no maquilles la captura.
