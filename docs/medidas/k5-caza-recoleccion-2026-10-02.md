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
