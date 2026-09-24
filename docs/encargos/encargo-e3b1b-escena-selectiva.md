# E3b.1b · Primera junta visible, sólo escena

**Estado:** implementado y verificado el 22 sep 2026. Continúa [E3b.1a](encargo-e3b1a-selector-y-ruta.md)
y usa los [GLB G-32](../historico/graphics-rounds/G-32-e3b-candidatos.md).
No activa todavía la ruta en un cuerpo ni cambia física. E3b sigue abierta.

## Objetivo

Cuando `bastionWalkwayOf` sea positivo, mostrar el bastión con salida este y
el módulo de entrada sobre el primer muro, con una sola transformación
cardinal compartida. En todos los demás bastiones conservar G-27. No colocar
el módulo recto en el segundo muro en esta ronda: su ensamblado L/T/+ y la
prolongación de ruta se resolverán al ampliar la continuidad.

## Contrato

1. `planFor` consulta el selector y elige
   `e3b-bastion-joint-candidate` sólo si se cumplen sus reglas; conserva
   `bastion-access-candidate` cuando E3a es posible pero E3b no. El plan debe
   cambiar cuando aparezca, se pierda o entre en obra cualquiera de los dos
   muros. Nunca modifica `GameState` ni guardados.
2. La entrada publicada `e3b-walkway-entry-candidate` se instancia como hijo
   del mismo anclaje del bastión, desplazada una celda en +X local. Así el
   suelo de ambos se toca en la frontera de la celda para las cuatro caras.
   Mantener el muro existente visible bajo la pasarela; el GLB es una capa
   completa por encima de su corona. No pasarlo por `buildDefence`, que reduce
   el grosor a 0,34.
3. Ajustar `WANTED` y el anclaje Z de `buildFromAsset` para el nuevo ID. Si
   falta cualquier recurso en una biblioteca inyectada, el fallback debe ser
   explícito y seguro: ninguna pasarela flotante sin bastión candidato.
4. Los objetos deben llevar `buildingId` del bastión y retirarse al cambiar
   el plan. No añadir un segundo edificio del motor ni nuevos puestos. La
   sombra y el material siguen la convención del edificio actual.

## Ficheros previstos

`src/render3d/world/plan.ts`, `src/render3d/world/buildings.ts`,
`src/render3d/renderer.ts` y tests focales bajo `tests/fast/`.
No tocar `src/engine/`, `src/render3d/life/`, `src/render3d/world/defences.ts`,
recetas, catálogo, manifiesto ni GLB.

## Comprobación sin abrir la app

- Caso positivo en cuatro orientaciones, con unión de cajas de bastión y
  entrada en la cara del primer muro. Caso negativo si el selector deniega;
  pérdida/obra reconstruye el bastión original.
- Confirmar que el primer muro sigue usando `buildDefence`, sin reescalado de
  la pasarela. Inspeccionar con Three en Node la posición y nombres de los
  modelos, usando los GLB ya validados o geometría sintética.
- Tests focales, typecheck, ESLint focal y `git diff --check`. No lanzar app,
  navegador, Blender, GPU ni benchmark. La revisión visual en partida se
  hará tras navegación/colisiones y autorización específica.

## Resultado

`planFor` elige la variante sólo con selector positivo y reconstruye el bastión
si falta un muro o aparece una obra. El módulo de entrada comparte anclaje y
giro con el bastión en las cuatro caras; el muro original conserva
`buildDefence`. Una biblioteca parcial vuelve primero a G-27 con escalera y,
si tampoco existe, al bastión base, siempre sin entrada flotante. Pasan 28
pruebas focales, typecheck, ESLint focal y `git diff --check`. No se ha abierto
la app: queda pendiente [E3b.1c](encargo-e3b1c-navegacion-y-fisica.md).
