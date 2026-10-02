# La vida en porcentaje y lo que protege cada pieza (2 oct 2026, v5.81)

Medida de la ronda del daño (carril de física y combate, encargo del director
aprobado por Vera). Herramienta:
`npx tsx tools/reports/battle-report.ts --jerkins --seeds 7,11,21,42 --days 5 --relief`
(salidas en `artifacts/physics/K581-dano/`). Son 20 asaltos distintos por
configuración, porque cada jornada tiene su propia semilla de escena, y cada
asalto se corre sin peto y con peto. Lo que el motor hace con cada parte se
calcula **con el motor de verdad** (`advanceThreat` sobre una copia, con
`spared`).

## 1 · El sistema

- **Vida de 1 a 0** para cada cuerpo del asalto (`render3d/life/wounds.ts`).
- **Daño a cuerpo descubierto**: flecha 100 % (tumba de un tiro, como hasta
  hoy), lanza 34 % (tres golpes, como el cuerpo a cuerpo de antes), espada 55 %
  (dos golpes; nadie la lleva todavía).
- **Lo que protege cada pieza** contra cada arma, y con qué probabilidad hace
  rebotar el golpe entero (el rebote se tira con un hash del paso y del cuerpo,
  nunca con azar del motor):

  | Pieza (edad) | Flecha | Lanza | Espada |
  |---|---|---|---|
  | Peto de cuero (Cuero) | protege 15 %, no rebota | 10 %, no rebota | nada |
  | Cota y casco (Hierro) | 45 %, rebota 20 % | 35 %, 5 % | 40 %, 10 % |
  | Placas (Acero) | 70 %, 45 % | 55 %, 20 % | 60 %, 15 % |
  | Arnés (Caballeros) | 85 %, 70 % | 75 %, 35 % | 75 %, 25 % |

  El 15 % del cuero contra la flecha es de Vera: «el cuero protege un 15 %, la
  flecha quita 85». **Todo lo demás es `TUNE`** y lo nivela ella junto con lo
  demás. Cada pieza dice además qué zona cubre (`COVERS`). Hoy todo golpe da en
  el torso, así que no cambia nada; queda preparado para la ronda de las partes
  del cuerpo (`docs/ideas.md`).
- **El peto decide en la escena**: quien lo lleva aguanta un flechazo y cae con
  el segundo, y aguanta cuatro lanzazos en vez de tres. El parte trae `spared`,
  los que siguen en pie gracias a él, y el motor **ya no levanta a la mitad otra
  vez** (`settle`). Sólo lo cuenta en la crónica. Un parte sin `spared`, que es
  el de antes, conserva la regla vieja (`JERKIN_SAVE`).

## 2 · Antes y después (medias de 20 asaltos)

**Sin peto, el asalto da exactamente lo mismo que antes de esta ronda** en las
cuatro configuraciones: las mismas bajas, los mismos tumbados y los mismos
cercos tomados que la medida de v5.80 (`artifacts/physics/K5-petos/`). Los del
clan no llevan pieza, y a cuerpo descubierto la flecha sigue tumbando.

| Configuración | Caídos en la escena: sin → con peto | Asaltantes tumbados: sin → con | Cerco tomado: sin → con | El motor entierra: v5.80 con encargo → v5.81 con encargo |
|---|---|---|---|---|
| 6 arcos contra 12 (la del juego) | 0,60 → 0,55 | 9,35 → 9,40 | 8 → 7 de 20 | 3,00 → 2,75 |
| 6 arcos contra 36 | 1,80 → 1,70 | 17,7 → 19,25 | 18 → 19 de 20 | 6,20 → 6,40 |
| 10 arcos contra 24 | 0,70 → 0,50 | 23,1 → 23,1 | 3 → 3 de 20 | 1,45 → 1,50 |
| 10 lanzas contra 24 | 4,80 → 4,50 | 2,9 → 4,55 | 20 → 20 de 20 | 6,50 → 6,50 |

Lo que dice:

- **El peto pesa ahora lo mismo que pesaba en el motor**, pero en un solo
  sitio. Antes, el motor levantaba la mitad de los caídos, redondeando hacia
  abajo, y casi nunca levantaba a nadie. Ahora el peto aguanta un lanzazo más
  en la pelea. El resultado es parecido: dos o tres décimas de caído por asalto.
- **Donde se nota es en el cuerpo a cuerpo largo.** Con lanzas, los que llevan
  peto tumban un 57 % más de asaltantes (2,9 → 4,55). Eso entra al motor como
  `slain` y baja la fuerza del clan, aunque ese cerco cae igual.
- La crónica cuenta a los que el peto dejó en pie: 1, 2, 4 y 5 en 20 asaltos de
  cada configuración. Los que dan en la línea del motor (`raid.held.jerkins`)
  son los de los cercos que aguantan.

## 3 · Lo que se probó antes y no vale

La primera lectura del encargo fue que la flecha «quita un 15 %» de vida. Medido
en la configuración del juego:

| Flecha | Asaltantes tumbados | Cerco tomado |
|---|---|---|
| una flecha tumba (hoy) | 9,35 | 8 de 20 |
| quita el 50 % | 6,0 | 19 de 20 |
| quita el 34 % | 4,6 | 20 de 20 |
| quita el 15 % | 1,6 | 20 de 20 |

La muralla vive de matar de un flechazo: en cuanto la flecha no tumba, el clan
llega al portón y entra. Con cualquier valor por debajo de uno, mirar el asalto
pasaba a perderlo casi siempre. Vera corrigió la lectura («el cuero protege un
15 %»), y así la flecha sigue fuerte por cómo es el sistema, no como parche. Las
salidas se borraron con la medida buena. El informe guarda `--arrow-damage`
para repetirlo.

## 4 · Cómo se ve

Nada nuevo a la vista en esta ronda: la vida no se pinta. El herido que sigue en
pie recibe el gesto de golpe (`hit_take`), y el rebote no se ve todavía. Las dos
cosas están en `docs/encargos-3d.md`. Para la captura, el banco con sus filas
nuevas, «Asaltantes heridos en pie» y los petos con golpes al cuero, rebotes y
los que siguen en pie gracias a él: `k-img/v581-banco-vida.jpg`. El peto se ve
como en v5.80 (`k-img/k5-petos-cerco-sin-con.jpg`). **En el Chromium sin GPU
del contenedor la escena no llega a la pelea**: el banco enseña las filas a cero.
