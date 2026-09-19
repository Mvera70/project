# OBS-02 · Registro del piloto

17 septiembre 2026. Autorización del usuario: ejecutar el piloto, concluir y parar.
Se reutilizan grabaciones archivadas del renderer real. No se recompila ni ejecuta
la versión actual: se calibra la revisión de evidencia, no el arranque del juego.

Tres agentes nuevos `gpt-5.6-luna`, sin historial heredado y con el mismo encargo.
Primero guardan observación visual; después contrastan trazas en otro documento.
Se les ocultan informes anteriores y etiquetas antes/después. No deben leer este
registro hasta cerrar su contraste. No se les indica qué defecto concreto buscar.

## Casos y procedencia (clave del coordinador)

| Caso | Archivo original | Alcance |
|---|---|---|
| A | IA-14-walk/final-close | 61 imágenes, 4 s a 15 fps, semilla 11/año 20, lead 1, follow 3, zoom 0.06; posterior al arreglo |
| B | IA-14-walk/before | Mismos parámetros; anterior al arreglo |
| C | G-24-ford/seed7-after | 17 imágenes a 2 fps, semilla 7/año 1; vado con defecto de posición documentado |

Rutas originales relativas a `artifacts/graphics/`. Copias anónimas en
`artifacts/graphics/OBS-02-pilot/{A,B,C}`. Los PNG se copian sin modificación.
Las imágenes de detalle que produzca un revisor deben declarar recorte y escala.

Hash SHA256 del HTML archivado A:
`38DC9AB6049A8A8309B0A20174DF8488E7BBC440494B51EB10AEC8A6B5761F24`.
HTML archivado B/C:
`EBCDFB4B320C16B212C8A748081841FEB05B2A33E28C2138ED500E6F5C6530AE`.
Se verifican los archivos existentes; no se afirma que se hayan vuelto a generar.

SHA256 trazas copiadas:
- A: `0f2322190e31390df29a8f54f81d549bc40dddcbbe06c3ab7f1e9b8681244e07`.
- B: `f1a896d85ab99a06098fac10a6444ccb2b66a4a3e00c194f2040cf23d40c58a8`.
- C: `b3e10033b6a035eddd54d685dee0df2f7476d7c1a64ed1f4c2694132f0a3ce4c`.

## Criterio antes de recibir veredictos

Cada defecto conocido (marcha lateral, separación excesiva, vado desplazado) debe
localizarse en una secuencia concreta por al menos dos revisores y ser contrastado
por el coordinador. No cuenta como detección visual descubrirlo solo en telemetría.
No confundir separación excesiva con solape. Si el ejemplo no muestra claramente
un defecto, esa parte de la calibración es insuficiente, no un suspenso del modelo.
A es comparación mejorada, no un control certificado libre de cualquier anomalía.
La falta de un control negativo independiente limita la estimación de falsos positivos.

Lectura mínima pedida: 15 imágenes consecutivas de A y B, y vistas de C. Eso es
aproximadamente un segundo por tramo; no constituye revisión completa de los cuatro
segundos. Cada revisor debe enumerar la cobertura real. No se obliga a inventar
hallazgos. El coordinador conserva los informes iniciales, incluidos sus errores.

El coordinador ha vuelto a calcular orientación frente a velocidad (>60°, velocidad
>0.5): A 44/1089, B 485/1063. Es telemetría poblacional, incluye cuerpos fuera de
cámara y no prueba apoyo de pies ni separación. Inspección propia: secuencias A/B
0023–0037, frame B0030 original y C0000 original. Hojas de detalle y métricas en
`artifacts/graphics/OBS-02-pilot/coordinator/`.

No se realizará ampliación, arreglo ni una segunda ronda de calibración en este turno.
