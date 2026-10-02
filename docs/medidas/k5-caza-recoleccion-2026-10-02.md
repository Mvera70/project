# K5 · Qué dejaría la caza y la recolección (2 oct 2026)

Medida antes de tocar el motor, como pide el encargo y la skill `goal` §4a.
`main` en `02b7a87` (la tanda de la noche, cerrada). Herramienta:
`npx tsx tools/reports/k5-report.ts` (12 semillas, 3 + 7i, × 60 años, `run` con
la política prudente, horas a ×1). La escalera de `pace-report.ts` (24 × 60) no
se mueve: aldea a las 40 h, villa cerrada a las 331 h.

El cazador del informe es **la cota de arriba**: toca todas las señales de caza
y acierta siempre. Dos variantes: con la honda sola —lo que el valle tiene sin
dar nada— y con arco y lanza (`bows`, `arms`) desde la fundación, como si se
hubieran dado el primer día.

## 1 · Lo que dice la caza

| caza | primera pieza grande | piezas por 10 h a ×1 (perdiz · conejo · ciervo · jabalí · oso) | grandes por 10 h |
|---|---|---|---:|
| honda sola | **nunca** (0/12) | 15 · 20 · 0 · 0 · 0 | **0** |
| arco y lanza | 2,6 h (12/12) | 11 · 14 · 6,5 · 5 · 0,1 | **11–12** |

**El ciervo, el jabalí y el oso sólo existen si se han dado el arco o la
lanza** (`WEAPONS` en `world/hunting.ts`). Con la honda, la caza son perdices y
conejos: 1 y 2 de grano cada uno, un adorno. Así que una piel que valga algo
sale **de un medio de defensa que el jugador pagó** y de una señal que tocó.

## 2 · Lo que aprieta en cada tramo (honda sola)

| tramo | gente | hambre (sem.) | grano (años) | obra esperando madera | invierno sin leña | caza por hambre (temporadas/10 h) | plata | setas abiertas | hierbas abiertas |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| caserío (< 12) | 7 | 1 % | 0,8 | 3 % | **0 %** | 1,2 | 2 | 47 % | 43 % |
| aldea, sin herrería | 23 | 4 % | 0,6 | 47 % | **0 %** | 0,9 | 6 | 55 % | 54 % |
| herrería, sin cerco | 41 | 4 % | 0,7 | 19 % | **0 %** | 0,8 | 7 | 49 % | 50 % |
| villa cerrada | 60 | 4 % | 0,6 | 3 % | **0 %** | 0,8 | 8 | 50 % | 50 % |

De qué se muere, por cada 100 h a ×1 del tramo:

| tramo | vejez | natural | hambre | frío | peste | violencia |
|---|---:|---:|---:|---:|---:|---:|
| caserío | 0 | 2,1 | 0,4 | **0** | 2,1 | 0 |
| aldea | 0 | 5,8 | **11,7** | **0** | 4,9 | 0 |
| herrería | 0 | 9,1 | **13,1** | **0** | 4,1 | 2,3 |
| villa cerrada | 0,4 | 13,7 | **18,1** | **0** | 3,9 | 1,4 |

## 3 · Lo que eso dice de cada material

- **El frío no mata a nadie** (0 inviernos sin leña en 12 × 60 años). Un cuero
  o un lino «para abrigar» no tendría nada que resolver: sería una barra más.
- **El hambre es lo primero que mata** desde que hay aldea (12–18 por 100 h) y
  el granero vive a 0,6–0,8 años. Un campo de lino en vez de trigo sería el
  dilema más duro de los tres, pero es un cultivo: necesita sitio en el mapa
  (el carril del valle natural) y se parece a la palanca de «cuánto se siembra»
  que v2.0 retiró por trampa.
- **La peste** mata 4 por 100 h, estable: es donde entrarían las plantas como
  remedio; las hierbas ya están en el tablón la mitad de las semanas y pagan
  ánimo y fe (la fe sobra, K8). Pide la enfermería de K11 para verse.
- **La plata falta toda la partida** (mediana 2–8) y **los asaltos ya matan**
  (1,4–2,3 por 100 h): las dos cosas en las que una piel puede pesar.

## 4 · La propuesta: el cuero primero

**El dilema, en una frase:** cada piel que trae la caza o se vende al buhonero
por la plata que siempre falta, o se queda en el valle como peto para los que
suben al cerco, que mueren menos en el asalto; y la plata del cuero vendido,
además, tienta al clan (`THREAT.WORTH_PER_SILVER`).

**Cómo se ve:** las pieles tendidas en un bastidor junto a la casa (cuántas hay
sin abrir un panel), el buhonero que las pide en la plaza con su señal, y los
de la muralla con peto de cuero. **Sin sitio nuevo en el mapa**: no toca el
contorno del valle natural.

**Por qué éste y no los otros dos:** sale de la maquinaria que ya hay —la caza
física para que salga, la oferta del camino (M-0) para venderla, la guarnición
(C2) y el parte de batalla (B4) para que pese— y ata la caza a la meta (§1b):
dar el arco abre el ciervo, el ciervo da la piel, la piel defiende el cerco o
paga la plata. El lino es el dilema más duro, pero pide mapa y vuelve a la
siembra; las plantas piden la enfermería de K11.

**Lo que hay que decidir antes de construir (Vera):** si el cuero va primero, y
si el peto es de la aldea (lo usa sola cuando avisa el clan) o se pide en el
tablón de la herrería (K8). El nivelado —cuánto vale una piel, cuánto salva un
peto— es suyo y va al final.

## 5 · Decidido por Vera (2 oct 2026, por el director)

Cuero primero, con el dilema tal cual: vender al buhonero por plata, que tienta
al clan, o guardar para petos. **El peto se pide en el tablón de la herrería**,
pagado, como las hachas y los herrajes; la aldea no se lo pone sola. Lino y
plantas esperan.

## 6 · Después (v5.75)

`npx tsx tools/reports/k5-report.ts --after --tap N`: 12 semillas × 60 años,
arco y lanza dados en la fundación, el jugador toca una de cada N señales de
caza (sorteadas con `hash32`, la misma en las dos columnas) y acierta siempre;
**guarda** no acepta nunca al buhonero de las pieles, **vende** lo acepta
siempre.

| señales tocadas | jugador | seis pieles (petos) | pieles al primer aviso del clan (mediana) | petos pagables al aviso | buhonero pidiendo pieles, por 10 h | plata del cuero, por 10 h |
|---|---|---:|---:|---:|---:|---:|
| todas | guarda | 6,5 h | 176 | 12/12 | 0,37 | 0 |
| todas | vende | 6,5 h | 73 | 12/12 | 0,32 | 7,8 |
| una de 3 | guarda | 18 h | 75 | 12/12 | 0,37 | 0 |
| una de 3 | vende | 20 h | 10 | **10/12** | 0,31 | 6,5 |
| una de 8 | guarda | 46 h | 26 | 12/12 | 0,32 | 0 |
| una de 8 | vende | 49 h | 4 | **4/12** | 0,22 | 2,6 |

**La primera versión no tenía dilema, y la medida lo dijo.** Con el buhonero
llevándose tres pieles por visita, el que vendía llegaba al aviso del clan con
86 pieles y el que guardaba con 92 (2 semillas × 10 años, todas las señales):
sube 0,4 veces por cada 10 h y la caza trae 12. Ahora se lleva **todas** (hasta
12), y vender es quedarse sin petos cuando el clan avisa, que es la mitad del
dilema que Vera eligió.

**Lo que no llega o no se mide todavía:**

- El cazador que toca **todas** las señales tiene pieles de sobra para las dos
  cosas: la caza grande da 12 por cada 10 h y nada se pudre. Si eso es un
  problema es nivelado (de Vera): `PER_KILL`, `PEDLAR_MAX_HIDES`, o que las
  pieles se estropeen.
- La plata vendida **tienta** al clan (`WORTH_PER_SILVER`), pero no se ha
  medido cuántos asaltos de más trae: con la política prudente y sin batalla
  física, un asalto entra siempre, y la cuenta saldría del dado y no del cuero.
- El peto sólo pesa **en un cerco que aguanta con parte de batalla**: sin nadie
  mirando, el asalto entra y el peto no cambia nada (B3). La propiedad está
  probada con el parte (`tests/fast/k5-hides.test.ts`).
- **Una partida sin caza no se mueve**: idéntica byte a byte (SHA-1 del estado
  a 30 años, semillas 7, 23 y 41) contra `main` en `02b7a87`.

## 7 · El lino, antes de proponerlo (v5.76)

`npx tsx tools/reports/k5-report.ts --flax`: 12 semillas × 60 años, prudente,
horas a ×1, sobre `main` con el cuero (`ea97cc5`). **El valle de hoy** y **el
contrafactual**: en cada siega se quita la parte de un campo (cosecha ÷ campos)
desde que la aldea tiene cuatro, que es lo que costaría un campo sembrado de
lino en vez de trigo.

| tramo | gente hoy → sin un campo | campos | en el tope (8) | cosecha / lo que se come | hambre (sem.) hoy → sin | muertos de hambre por 100 h hoy → sin | sitios libres para un campo a 18 de la plaza |
|---|---:|---:|---:|---:|---:|---:|---:|
| caserío (< 12) | 6 → 6 | 1 | 0 % | 1,37 | 7 % → 7 % | 3,7 → 4,0 | 470 |
| aldea, sin herrería | 22 → 21 | 3 | 16 % | 1,11 | 5 % → 9 % | **12,7 → 21,1** | 405 |
| herrería, sin cerco | 41 → 36 | 6 | 22 % | 1,36 | 5 % → 7 % | 16,0 → 18,5 | 355 |
| villa cerrada | **61 → 49** | 8 | **93 %** | 1,38 | 4 % → 5 % | 19,8 → 22,1 | 229 |

**Lo que dice:**

- **El grano no sobra nunca.** El factor, que sólo sube con más de dos años de
  grano en el granero, no subió **ni una vez** en 12 valles de 60 años. Cada
  cosecha da entre 1,1 y 1,4 veces lo que se come, y es todo el margen.
- **Un campo de lino cuesta gente, no sólo grano**: la villa cerrada se queda
  en 49 personas en vez de 61 (−20 %), y en la aldea los muertos de hambre
  pasan de 12,7 a 21,1 por cada 100 h. Ningún valle se acaba por ello.
- **La villa vive en el tope de campos** (8 de 8 el 93 % de las semanas): ahí
  un campo de lino o es uno de los ocho de trigo, o es un noveno que pide sitio
  y manos.
- **Sitio hay, hoy**: entre 229 y 470 celdas libres para un campo a menos de 18
  de la plaza. Con la forma natural del valle (otra sesión, v5.60–v5.64) eso
  puede cambiar: si el lino necesita sitio nuevo, se mide de nuevo sobre su
  contorno antes de fusionar.

## 8 · El lino, después (v5.76)

Decidido por Vera (2 oct): la tela sólo es ropa, de momento; se pide en una
sastrería con su tablón; el lino ocupa uno de los campos de trigo.

**Cuándo llega la sastrería** (`pace-report.ts`, 24 semillas × 60 años,
prudente): **70 h a ×1** (39–103 h, 22 de 24 valles), con el cuarto campo a las
68 h. Mueve la escalera, porque se come 90 de madera: la villa cerrada pasa de
331 a 350 h, la muralla de 157 a 165 h y la atalaya de 199 a 227 h; la
población final no cambia (mediana 52).

**La ropa abriga** (Vera, 2 oct, después de la primera versión: «no es sólo
ánimo; abriga en invierno, y por eso sube el ánimo»). El frío de hoy: ninguna
semana de invierno sin leña en 12 × 60 años, así que la mortalidad del frío no
se dispara nunca; lo que pesa es la leña que se quema (0,4 por persona y semana
de invierno). Con ropa, un cuarto menos, y +0,6 de ánimo por semana de
invierno.

**El dilema** (`k5-report.ts --linen`, 12 semillas × 60 años; «pide» encarga
lino y ropa cada vez que el tablón lo deja, «no pide» nunca):

| tramo | gente: no pide → pide | ánimo (mediana) | ánimo en invierno | ánimo < 40 | obra esperando madera | muertos de hambre por 100 h | lienzo por 10 h |
|---|---:|---:|---:|---:|---:|---:|---:|
| caserío (< 12) | 6 → 6 | 36 → 36 | 33 → 33 | 55 % → 55 % | 1 % → 1 % | 3,7 → 3,7 | 0 |
| aldea, sin herrería | 21 → 21 | 44 → 43 | 43 → 43 | 38 % → 40 % | **36 % → 26 %** | 10,6 → 10,1 | 2,7 |
| herrería, sin cerco | 41 → 34 | 62 → **67** | 63 → 68 | 10 % → 10 % | 15 % → 10 % | 12,7 → 16,8 | 6,8 |
| villa cerrada | **57 → 45** | 61 → **68** | 63 → **70** | 12 % → **7 %** | 5 % → 1 % | 20,5 → 21,6 | 8,5 |

(Con la primera ropa —+0,2 de ánimo todo el año, sin tocar la leña— la villa
se quedaba en 41 y el ánimo en 71, y la aldea doblaba sus muertos de hambre.)

Primer lienzo a las 75 h. **Ningún valle cae** en ninguna de las dos columnas.

**La primera versión mataba, y la medida lo dijo.** Con el lino quitando un
campo de los **trabajados** cuando había cuatro **construidos**, pidiéndolo
siempre caían **7 de 12 valles**: aldeas que habían menguado, con cuatro campos
y brazos para dos, donde el lino se llevaba media cosecha y entraban en la
espiral del hambre. Ahora el tablón sólo deja pedirlo si la aldea **necesita**
cuatro campos, y en la siega el lino sólo se siembra si **trabaja** cuatro; si
no, se queda sin sembrar y el trigo entero.

**Lo que no llega o no se mide todavía:**

- El campo de lino **no se distingue en pantalla**: se pinta como uno de trigo
  (`docs/encargos-3d.md`). El dilema se ve en el tablón, en la crónica y en el
  ánimo, no en el campo.
- El «pide siempre» es la cota de arriba: no se ha medido un jugador que pida
  el lino sólo los años de buena cosecha, que es lo que el dilema invita a
  hacer.
