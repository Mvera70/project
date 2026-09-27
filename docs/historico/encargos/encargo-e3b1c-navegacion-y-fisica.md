# E3b.1c · Primer guardia sobre la junta y colisiones

**Estado:** implementado y verificado por pruebas focales el 22 sep 2026; pendiente de revisión en partida real tras autorización de app/GPU. Sigue a [E3b.1b](encargo-e3b1b-escena-selectiva.md).
Depende del selector y ruta de [E3b.1a](encargo-e3b1a-selector-y-ruta.md).
No cierra la continuidad del anillo E3b.2.

## Objetivo

El **mismo guardia del bastión** usa la escalera E3a, gira por la junta
publicada G-32, ocupa el centro del corredor del primer muro y vuelve por la
ruta inversa. El puesto independiente de ese muro conserva la regla actual de
suelo por ahora. No cambia el número ni el orden de puestos de `garrisonOf`.
Ni civiles ni atacantes pueden usar la ruta privada.

## Reglas de implementación

1. `garrisonPlaces` usa `bastionWalkwayOf` para el bastión del puesto. Sólo
   cambia `elevatedPostRoute` por `elevatedWallRoute` si
   `elevatedPostOf` ya comprobó entrada llana, disco y alcance. Conserva el
   `approachY` aprobado y la misma reserva de celda de entrada. Sin selector
   o entrada E3a viable, queda el comportamiento anterior.
2. Marcar explícitamente en `Manned` qué puesto usa la variante. Evitar
   deducirlo por coordenadas durante el combate. `Place` continúa en suelo;
   `Village` aplica la ruta elevada sólo al asignado. Al cancelar o perder
   una defensa, regreso y limpieza no dejan un cuerpo suspendido.
3. El mundo físico rebaja a Y=1,02 **ambas** celdas de apoyo: bastión y primer
   muro. Sólo en esta variante se reemplazan los diez obstáculos G-27 por los
   parapetos y almenas que siguen presentes en la receta abierta; la cara
   lateral de salida queda libre. El tablero de entrada tiene parapeto exterior
   desde X local=0,25 e interior Z=1,15…1,27. Girar los obstáculos con la
   misma matriz cardinal de E3a. La piedra de ambas celdas continúa sólida
   bajo la plataforma; no eliminar colliders genéricos ni rebajar otros muros.
4. La flecha nace en la mano del cuerpo que ocupa realmente el corredor y
   conserva tiro hacia fuera, zona ciega cercana e impacto en piedra ajena.
   Ragdoll usa la cota de ese cuerpo. Si el disparo propio choca con su
   parapeto, corregir la colisión a partir de la geometría y una medida,
   sin adelantar artificialmente el origen de la flecha.

## Ficheros previstos

`src/render3d/life/garrison.ts`, `src/render3d/life/village.ts`,
`src/render3d/life/physics.ts` y tests focales existentes/nuevos. Cambiar
`src/render3d/life/archery.ts` sólo si un test físico demuestra que hace
falta. No tocar `src/engine/`, GLB, recetas, catálogo, manifiesto o balance.

## Pruebas y límite de cierre

- Cuatro orientaciones; la misma plaza y un único defensor, trayectoria
  continua de entrada y vuelta; acceso imposible, muro perdido y obra
  conservan E3a o suelo. La máscara global sigue cerrada.
- Rapier focal: plataforma en las dos celdas, abertura real hacia el primer
  muro, obstáculos girados y flecha propia libre al salir; flechas bajas y
  otros muros siguen interceptándose. Reutilizar semilla controlada, sin
  medición de rendimiento.
- Typecheck, ESLint focal, `git diff --check`. Después hará falta observar
  una partida real, navegación, flechas y captura. Abrir la app o usar GPU
  para esa revisión requiere autorización expresa de Vera.

## Resultado

`Manned` conserva una marca explícita de variante y la primera celda del
adarve. El mismo guardia del bastión cambia de E3a a la ruta G-32 sólo cuando
el selector y la entrada de E3a son válidos; al perder la junta vuelve a E3a
o al suelo. Su mirada desde el primer muro apunta hacia fuera. La máscara de
suelo permanece cerrada. Rapier usa las dos celdas de apoyo a Y=1,02 y los
diez pretiles/almenas de las recetas abiertas, girados cardinalmente. La
prueba física dispara desde la posición real del grip del arco en las cuatro
caras, conserva piedra bajo plataforma y altura de la muralla siguiente.

Las cinco suites focales E3b/E3a afectadas pasan juntas: **55 pruebas**;
también typecheck, ESLint focal y `git diff --check`. Falta ver el trayecto
completo, la unión y el tiro en el navegador antes de aceptar visualmente
E3b.1. No se ha abierto la app ni utilizado GPU en esta ronda.
