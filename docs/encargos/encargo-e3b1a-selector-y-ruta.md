# E3b.1a · Selector de la primera junta y ruta privada pura

**Estado:** implementado y verificado el 22 sep 2026. Es la primera entrega de código de E3b.1;
esta ronda no abre el juego. La [geometría candidata](../../art/recipes/e3b-bastion-joint-candidate/README.md)
ya pasó Blender, `game-dev asset inspect` y GLTFLoader aislados. E3b no se
cierra con esta ronda.

## Objetivo

Derivar, sin estado guardado, cuándo un bastión con escalera tiene **una salida
este local** hacia el primer tramo recto de muralla de piedra. Definir la ruta
del mismo guardia desde el pie de escalera hasta el centro de ese tramo y de
vuelta. La siguiente ronda conectará mallas, asignación y colisiones.

## Depende de

- `docs/design.md` §1–4, §7.4c, D.4, D.12, E.3/E.8 y
  [E3a](encargo-e3-puesto-navegable.md).
- `src/engine/world/bastion-access.ts`: su `bastionAccessOf` **manda** sobre la
  orientación de la escalera; no inventar otra.
- [Cotas del modelo](../../art/recipes/e3b-bastion-joint-candidate/README.md):
  suelo Y=1,02; giro local `(0,50;0,72) → (0,95;0,72) →
  (1,20;0,79) → (1,50;0,79)` en X/Z; ancho neto 0,70.

## Ficheros

Crear `src/derive/bastion-walkway.ts` y
`tests/fast/bastion-walkway.test.ts`. Ampliar
`src/render3d/life/elevated-post.ts` y crear
`tests/fast/elevated-wall-route.test.ts`. No tocar `src/engine/`,
`src/render3d/world/`, `public/assets/`, `art/catalog.json`, física ni el
reparto de la jornada. Si una prueba necesita un helper existente, usarlo sin
editar su contrato público.

## Contrato literal

```ts
export interface BastionWalkway {
  readonly access: BastionAccess;
  readonly firstWallId: number;
  readonly nextWallId: number;
  readonly side: BastionAccess;
}
export function bastionWalkwayOf(
  state: BastionAccessState, bastion: Building,
): BastionWalkway | null;

export function elevatedWallRoute(
  origin: Point, access: BastionAccess, approachY?: number,
): ElevatedPost;
```

`BastionWalkway` vive en `derive/`; `elevatedWallRoute` vive en
`render3d/life/elevated-post.ts`. Ambos son funciones puras. Los ID apuntan a
edificios existentes; no se crea un puesto, un guardia ni un campo guardado.

## Reglas

1. Pedir `bastionAccessOf(state, bastion)` una sola vez. Si da `null`, no hay
   pasarela. El este local se transforma a `side={x:access.z,z:-access.x}`;
   usar la rotación cardinal aprobada alrededor de `(0,5;0,5)`.
2. La celda vecina en `side` y la siguiente en la misma dirección deben ser
   muros de **piedra** vivos (`kind==='wall'`, `lostTick===null`, 1×1).
   Exigir la segunda para que el primer muro tenga continuidad recta en
   `buildDefence`. Ninguna obra puede ocultar o ocupar el bastión ni esas dos
   celdas. Si hay otra defensa viva transversal o diagonal al primer muro, no
   ofrecer esta variante recta: su ensamblado sería L/T/+/diagonal. La franja
   interior del primer módulo rebasa 0,27 celdas: su celda adyacente en la
   dirección `access` debe estar libre de edificios, ruinas y obras.
3. La ruta elevada conserva literalmente entrada y 14 peldaños de E3a hasta
   `exit=(0,50;1,00;1,02)` local. Sustituye el destino en plataforma por los
   cuatro puntos del modelo a Y=1,02. `post` es el último punto;
   `descent` es el reverso exacto de `climb`. No hay salto a través del pretil.
4. Esta API sólo **describe** posibilidad y trayectoria. No modifica
   `garrisonOf`, `garrisonPlaces`, `terrain`, `physics`, `src/engine/` ni el
   número/prioridad de puestos. Un selector positivo todavía no autoriza
   renderizar una pasarela o mandar un cuerpo por ella hasta integrar malla y
   colisiones en la ronda siguiente.

## Tests exigidos

- Cuatro orientaciones: misma escalera elegida por E3a, primer y segundo muro
  en el este local, ruta rotada hasta el centro del primer tramo y vuelta.
- Denegar si falta cualquier muro, es empalizada, ruina, obra, esquina/T o
  acceso E3a imposible. No elegir otra orientación para salvar el test.
- Comparar prefijo de subida con E3a, altura constante en el adarve, descenso
  inverso y avance acotado por `advanceElevated`.
- Ejecutar sólo tests focales, typecheck y ESLint de ficheros tocados. No abrir
  app, navegador, Blender ni GPU en esta ronda.

**Terminado cuando:** el selector y la ruta pasan esas pruebas sin cambiar el
estado del motor ni los GLB publicados. Entregar además un ejemplo de
coordenadas para las cuatro orientaciones y cualquier caso donde el contrato
no cuadre con el ensamblador; ese hallazgo se arbitra antes de E3b.1b.

## Resultado

Los cuatro ficheros previstos quedaron implementados. Tras negar también las
cuatro conexiones diagonales del ensamblador y ocupación del voladizo, pasan
26 pruebas focales
incluyendo E3a, `npm run typecheck`, ESLint focal y `git diff --check`. Con
origen `(10,10)`, el destino para accesos norte, este, sur y oeste queda en
`(9,50;1,02;10,21)`, `(10,79;1,02;9,50)`, `(11,50;1,02;10,79)` y
`(10,21;1,02;11,50)` respectivamente. El último punto local certificado
`(1,50;0,79)` centra la longitud del primer módulo, pero no la celda en Z;
la integración de E3b.1b debe conservar el corredor de la receta. El selector
todavía no activa malla, guardia ni colisiones.
