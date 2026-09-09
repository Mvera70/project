# Ronda G-02 · Pipeline reproducible de recursos

Prompt derivado de `docs/design.md` v2.91, Anexo D. Estado: ejecutado y arbitrado
en v2.92; resultado en `G-02.md`. No reutilizar este prompt para iniciar G-03.

## Cabecera

Eres el agente de implementación de G-02. Debes convertir el experimento
embebido de G-00 en un pipeline mantenible: una receta canónica genera un recurso,
lo valida antes de promoverlo y produce evidencia visible mediante el visor G-01.

Lee `CLAUDE.md`, `docs/design.md` §1–4, D.0–D.2, D.4, D.10–D.11, el brief G-02,
`docs/graphics-rounds/G-00.md` y `G-01.md`. No leas el historial completo ni G-03
en adelante. Revisa `git status`; conserva cambios locales y no edites
`docs/design.md`, `package.json` ni el lockfile.

## PARTE 0 — Cierres

G-00 demostró Blender 5.2.1 LTS y descubrió que código de salida 0 no basta.
G-01 demostró carga GLB con Three.js 0.185.0, cámara por caja y captura repetible.
Reutiliza `tools/graphics/doctor.ts` y `capture.ts` como consumidores; no copies
su lógica ni reemplaces sus contratos. El script Python materializado bajo
`artifacts/G-00` es evidencia, no fuente mantenible.

La cadena local de P0 está cerrada. La prueba externa desde otro dispositivo
sigue pendiente, pero no bloquea este trabajo local. No publiques artefactos ni
añadas servicios remotos.

## PARTE 1 — Fuente canónica y catálogo

Alcance:

- `art/recipes/axis-marker.json`
- `art/catalog.json`
- `tools/art/`
- `tests/fast/art-manifest.test.ts`
- `artifacts/graphics/G-02/`

La receta JSON es la fuente canónica de geometría, nombres y materiales del
marcador. No almacenes Python dentro del JSON. Debe expresar un conjunto pequeño
de primitivas declarativas suficiente para reconstruir el fixture asimétrico;
rechaza tipos, medidas, colores o nombres inválidos con mensajes precisos.

`art/catalog.json` registra como mínimo: versión de esquema, id estable,
estado (`study` en esta ronda), receta, generador, versión Blender verificada,
salida aprobada, dimensiones de caja, materiales, clips, conectores, estadísticas,
hashes y procedencia original. No pongas una fecha o hash falso antes de generar:
el comando de promoción escribe los resultados observados de forma atómica.

El `.blend`, `.glb`, renders, logs y reportes son generados en artifacts; no son
una segunda fuente. Ningún fichero bajo `public/assets/` se crea en G-02.

## PARTE 2 — Runner y etapas

Interfaz requerida desde la raíz:

```powershell
npx tsx tools/art/index.ts build axis-marker
npx tsx tools/art/index.ts validate axis-marker
npx tsx tools/art/index.ts report axis-marker
```

También puede existir `all axis-marker` como comodidad, pero las tres etapas
anteriores deben funcionar y fallar de manera independiente.

`build` valida primero la receta, genera Python en una carpeta temporal propia
de la ejecución y llama Blender en background/factory startup. Produce fuente
`.blend`, GLB, PNG de Blender y log. Exige marca explícita y todos los productos.

`validate` trabaja sobre el candidato, no sobre el último aprobado. Comprueba
como mínimo cabecera/versión GLB, JSON interno parseable, ejes/caja finitos,
nombres únicos, materiales esperados, conectores/clips declarados y carga real
en el visor G-01. Puede invocar el capturador con carpeta de salida parametrizable;
si `capture.ts` necesita esa ampliación, es transferencia explícita dentro de
`tools/graphics/capture.ts`. No valides solo reimportando con Blender.

`report` resume inputs, versiones, comandos, duración, archivos/tamaños/hashes,
objeto/material/triángulos y resultado de las validaciones. Solo después de
todas las validaciones promueve candidato a `artifacts/graphics/G-02/approved/`
y actualiza catálogo mediante archivo temporal + reemplazo. Un fallo deja intacto
el aprobado y el catálogo anteriores. La promoción debe ser idempotente.

No borres recursivamente rutas calculadas sin resolver y comprobar que están
dentro de `artifacts/graphics/G-02/`. Cada ejecución tiene id y carpeta; limpia
solo sus temporales conocidos. No mates procesos Blender ajenos.

## PARTE 3 — Pruebas y falsación

Prueba propiedades del contrato, no llamadas internas:

- catálogo y receta válidos y referencialmente coherentes;
- nombres/materiales/conectores/clips del catálogo corresponden a la salida;
- una receta con tipo o medida inválida falla antes de Blender;
- un GLB truncado no se promueve;
- una interrupción/fallo simulado conserva el aprobado y catálogo previos;
- reconstruir en carpeta limpia produce geometría, materiales y animación
  equivalentes aunque no exijas bytes idénticos de `.blend`;
- la captura Three.js del candidato carga, tiene orientación correcta y queda
  identificada en el informe.

No uses mocks para declarar que Blender o Three.js cargaron el recurso. Los casos
caros pueden vivir en el comando de evidencia si la suite rápida solo valida las
fronteras puras.

Entrega `docs/graphics-rounds/G-02.md` con comandos, árbol de outputs, hashes,
versiones, validaciones, tiempos, captura abierta y defectos. Ejecuta typecheck,
suite rápida, lint y build. Informa de cualquier ampliación de archivos.

**Qué falsaría la hipótesis:** requerir edición manual del `.blend`, poder
promover un candidato incompleto, que catálogo y aprobado diverjan o que el GLB
validado no cargue en el visor. Si ocurre, detén G-03 y corrige el pipeline.
