# K5 · El peto en el asalto (2 oct 2026, v5.80)

Medida del carril de física y combate para el encargo del director: que el
peto de cuero de K5 (v5.75) se vea en la muralla y que la escena lo sepa, sin
duplicar lo que el motor ya hace. Herramienta:
`npx tsx tools/reports/battle-report.ts --jerkins --seeds 7,11,21,42 --days 5 --relief`
(salidas en `artifacts/physics/K5-petos/`). Cada jornada tiene su propia
semilla de escena, así que son **20 asaltos distintos por configuración**, y
cada uno se corre tres veces: sin peto, con peto en sombra y con peto que
decide (`JERKIN_EXTRA_BLOWS`, un golpe de más). Lo que el motor hace con cada
parte se calcula **con el motor de verdad** (`advanceThreat` → `settle` sobre
una copia), por la misma puerta que el juego (`PlayerAct` `battle`).

## 1 · La sombra es neutra

**80 de 80 asaltos** dan el mismo resultado con el peto en sombra que sin él
(misma bitácora de flechas, golpes, bajas y portón). Lo guarda además
`tests/fast/melee.test.ts` con cuatro disposiciones de pelea.

## 2 · Lo que pesa el peto (medias de 20 asaltos)

| Configuración | Caídos en la escena: sin peto → peto decide | Asaltantes caídos: sin → decide | Cerco tomado: sin → decide | El motor entierra: sin peto · con encargo (hoy) · peto en escena | Levantados por el motor en 20 asaltos |
|---|---|---|---|---|---|
| 6 arcos contra 12 (la del juego) | 0,60 → 0,55 | 9,35 → 9,40 | 8 → 7 | 3,00 · 3,00 · 2,75 | **0** |
| 6 arcos contra 36 (dura) | 1,80 → 1,70 | 17,7 → 19,25 | 18 → 19 | 6,30 · 6,20 · 6,40 | 2 |
| 10 arcos contra 24 (la de referencia) | 0,70 → 0,50 | 23,1 → 23,1 | 3 → 3 | 1,70 · 1,45 · 1,50 | 5 |
| 10 lanzas contra 24 | 4,80 → 4,50 | 2,90 → 4,55 | 20 → 20 | 6,50 · 6,50 · 6,50 | 0 |

Lo que dice:

- **El peto del motor casi no levanta a nadie en las peleas que da la
  escena.** `settle` levanta `floor(caídos × 0,5)`, y la escena tumba de 0 a 3
  por asalto: con uno caído, la mitad redondeada abajo es cero. En la
  configuración del juego, **cero levantados en veinte asaltos**. Y si el cerco
  cae, el motor no mira el parte (`storm`): ahí el peto no hace nada.
- **Dejar que el peto decida en la escena pesa lo mismo, o menos**: una
  décima o dos de caído por asalto. Donde se nota algo es en la pelea larga
  (6 contra 36): los del peto aguantan más y tumban un asaltante y medio más
  por asalto, y con lanzas, donde todo es cuerpo a cuerpo, **de 2,9 a 4,55
  asaltantes caídos** (+57 %). Eso sí entra al motor (`slain` baja la fuerza
  del clan), aunque el cerco de lanzas cae igual, 20 de 20.
- Lo que no cambia: los asaltantes por flecha. El peto sólo toca el cuerpo a
  cuerpo, que es lo único que tumba defensores (las flechas son de la aldea).

## 3 · Dónde vive el efecto

**En el motor, y en un solo sitio.** La escena enseña el peto, lo cuenta en
sombra (`jerkinTally`: golpes al cuero, caídos con peto, cuántos aguantarían
ese golpe) y publica `moments.battle.jerkinBlows` para el sonido, pero
**no decide**: el juego llama a `stepMelee` con cero golpes de más. Moverlo a la
escena pediría a la vez que el motor dejara de levantar caídos cuando hay
parte —si no, el peto contaría dos veces—, y eso es un cambio del motor, no
de este carril. Con la medida de arriba no hay prisa: las dos formas pesan
lo mismo hoy.

**Para el nivelado** (Vera, 2 oct 2026: «ahora se crean sistemas y todo se
nivelará junto después»): el redondeo hacia abajo de `JERKIN_SAVE` hace que el
peto no salve a nadie en un asalto con una sola baja. `JERKIN_EXTRA_BLOWS` (1,
`life/melee.ts`) queda como el valor medido y ajustable si algún día decide la
escena.

## 4 · Cómo se ve

Seis cajas colgadas del hueso `spine` (`render3d/world/jerkin.ts`): cuero,
hombreras más oscuras que ensanchan los hombros —lo que ve la cámara desde
arriba— y una bandolera y un cinto claros que ninguna ropa del valle lleva.
Una malla y un material compartidos: una llamada de dibujo por defensor con
peto. Capturas, con `bundle-game.ts` + `shot.mjs` (lo mismo que `npm run shot`):

- `k-img/k5-petos-cerco-sin-con.jpg`: el portón de la villa 7/60 en el asalto,
  sin y con el encargo (`&jerkins=1`), a 390×844 ampliado ×2.
- `k-img/k5-petos-vispera-escala-juego.jpg`: la víspera a la escala del juego.
- `k-img/k5-petos-banco-panel.jpg`: el banco con el mando «Petos».

**En el Chromium sin GPU del contenedor la escena no llega a la pelea** (la
vida va a un paso por fotograma, ver `battle-sandbox`): las capturas enseñan
el cerco con petos antes del choque, y las cifras del banco salen a cero. La
pelea con petos, a escala de móvil y en un aparato de verdad, queda por mirar.
