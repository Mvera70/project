# Integración y defensa sin arqueros · 20 sep 2026

El dueño autoriza **sólo los puntos 1 y 2**, y pide parar después:

1. Integrar los siete modelos aceptados (`bow`, `spear`, `arrow`, `shield`,
   `gate`, `plough`, `fountain`) y publicarlos dentro del proyecto.
2. Comprobar y corregir el cuerpo a cuerpo sin arqueros.

## Reparto y alcance

Terra: publicación selectiva, manifiesto, contratos visuales, renderer,
objetos del mundo y sus pruebas. Luna: auditoría independiente de archivos,
hashes e integración. Agente principal: `life/village.ts`, regresión
`melee-without-archers.test.ts`, comprobación integrada y documentación.

Las recetas y los modelos aceptados no se remodelan. Se conservan los demás
archivos publicados. No push, despliegue remoto, gore, huida, oclusión,
balance ni nuevas mecánicas. `deliverables/` pertenece al usuario.

## Contratos

- Cada GLB publicado coincide con el hash de su entrada de catálogo y tiene
  procedencia original. El publicador comprueba los archivos antes de escribir
  y permite limitar la operación a estos siete, sin borrar el catálogo existente.
- Las armas siguen las manos, conservan escala y usan sus conectores `grip`.
  Los proyectiles apuntan hacia su velocidad; fuente y arado usan su modelo
  en lugar de las representaciones provisionales.
- La hoja `gate_door` gira independientemente del marco y acusa los impactos.
  No se alteran el hueco lógico ni la resistencia del portón.
- El cuerpo a cuerpo depende de presencia, alcance y reloj de golpes, no
  de que Rapier se haya cargado para las flechas. Conserva daño y cadencia.

## Criterio de cierre

Hashes de los siete destinos, conservación de los antiguos, pruebas focalizadas,
typecheck/lint y bundle satisfactorios. Observación del juego integrado y del
asedio sin arcos; registrar límites sin convertir una muestra en tasa de victoria.
Al cerrar estos dos puntos se detiene el trabajo.
