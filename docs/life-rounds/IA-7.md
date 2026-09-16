# IA-7 · Los labradores, dentro de su campo

**16 sep 2026.** Ronda corta, hecha por mí, a partir de lo que vio el dueño en
la demo v15: «los trabajadores ni siquiera interpretan el campo de trabajo y se
salen fuera de él para labrar el suelo». Medido antes de tocar nada: **el 96,1 %
de los segundos de labranza se pasaban fuera del campo**. No era una impresión.

---

## 1. La causa, en una línea

`life/offers.ts` trataba un campo como un edificio más: la oferta `work` se
colocaba en **la puerta** (`doorOf`), o sea en el borde exterior de la parcela,
y con la tolerancia de llegada (`reach`) la persona se plantaba una celda fuera
y se ponía a cavar el camino.

## 2. Lo que cambia

- **`parcelSeats()`** (`offers.ts`, nueva): reparte hasta `want` puestos por las
  celdas de la parcela, recorriéndolas en orden y con un temblor de ±0,25 celdas
  por puesto sacado de `hash32(id, 'parcel:n')` —presentación, nunca el motor—,
  descartando las que estén bloqueadas o en el borde del mapa.
- El sitio de un campo está en **su centro** y no en su puerta, y sus plazas son
  las de la parcela. Los demás edificios siguen usando la puerta.
- **`decide.ts`, y esto es lo que la ronda destapó de rebote:** el suelo de la
  convocatoria (`GATHER_FLOOR`, V-11) se aplicaba **antes** de los factores de
  hora, edad y casa y de lo pegajoso de la intención actual, así que 0,8 acababa
  en 0,3 y una pausa ya elegida (×1,35) le ganaba. Mientras la gente estaba en
  las puertas no se notaba; al moverla a los campos, la capilla de la semilla 7
  cayó a **14 de 26**, con los doce que faltaban parados a cuatro o seis celdas.
  **Un suelo que se multiplica después no es un suelo.** Ahora se aplica sobre
  el resultado final, con la única excepción de siempre (una necesidad por
  encima de `GATHER_URGENT`).
- `tools/life-report.ts` gana la quinta cifra: **labradores fuera de su
  campo**, para que no vuelva a crecer sin que nadie lo vea.

## 3. Lo medido

`npx tsx tools/life-report.ts 7 23 97 --days 2`:

| | antes | después |
|---|---|---|
| labradores fuera de su campo | **96,1 %** | **13,6 %** (50 de 367) |
| centro en celda cerrada | 0 | 0 |
| círculo en celda cerrada | 0,09 % | 0,09 % |
| giros > π/2 | 0,37 % | 0,37 % |
| parados con impulso ≥ 0,9 | 0,09 % | 0,09 % |

Las cuatro cifras de movimiento **no se mueven**. El 13,6 % que queda está
**justo en el borde**: la persona más lejana está a 0,86 celdas del linde, que
es la tolerancia de llegada (`reach`, 1,6 × 0,6) aplicada a un puesto de la
primera fila. Se ve como alguien cavando la linde, no el camino. Bajar la
tolerancia sólo para los campos es un cambio pequeño y va a la lista abierta.

Pruebas: `life-staging`, `life-motion`, `life-needs`, `life-orders`, `daylife`,
`life-models`, `animals`, `life-props` → **78 de 78 verdes**, 15 s. V-11 con el
suelo real: 4 de 4.

## 4. Qué observación refutaría esta ronda

Un labrador cavando a más de una celda de su campo. Una reunión de §11.8 por
debajo del 100 % de asistencia sin que haya una necesidad al límite. Cualquiera
de las cuatro cifras de movimiento peor que en IA-5.
