# E1b · Contacto y reacción — 20 sep 2026

Siguiente prioridad elegida tras aceptar la primera tanda de modelos: hacer
legible el cuerpo a cuerpo que D4 ya resuelve. E1 sigue siendo P1.

## Alcance

`src/render3d/{clips,action-clips}.ts`, `src/render3d/life/{melee,raiders,cast,village}.ts`,
pruebas `combat-clips`, `melee` y documentación de estado.
No motor, daño, cadencia, navegación, publicación de modelos ni gore.

## Contrato

- `spear_thrust`: contacto desde el golpe contado, recuperación de 0,9 s.
- `hit_take`: reacción desde el daño recibido, recuperación de 0,5 s.
- Instantes en pasos de jornada, no reloj de fotogramas. Pose reproducible
  al saltar, repetir o retroceder. La caída gana siempre.
- D4 golpea cada 0,5 s: un gesto nuevo puede interrumpir al anterior. No se
  retrasa el daño para encajarlo en el clip.
- Si contacto y daño coinciden, 0,1 s de estocada y después reacción con su
  edad original; no se inventa un segundo evento. Si son distintos, manda
  el hecho más reciente mientras esté activo.
- La articulación insinúa el paso; no desplaza la posición física del actor.
  Sin armas publicadas no se valida contacto geométrico de punta y cuerpo.

## Puerta de comprobación

Pruebas de fechas, prioridad, regreso al reposo, cadencia conservada y poses
sobre el GLB publicado; typecheck/lint. Observatorio a 15 fps, participantes
y clips en traza, imágenes sucesivas inspeccionadas. No cerrar E1 entero:
`flee`, integración de armas y demás pendientes tienen alcance propio.
