# IA-8 · La plaza que falló se descarta, el viaje tiene su plazo, y el labrador pisa su campo

**16 sep 2026.** Hecha por mí, a petición del dueño («sigue tú con esto, la IA
necesita más trabajo»). Cierra el **punto 1** de la lista abierta —la pieza que
faltaba desde IA-6— y el **0b** que dejó IA-7.

---

## 1. Lo que cambia

**Descartar la plaza que ya falló** (`Dweller.failed`, `Chooser.shunned`,
`failedSeatKey`). Cuando un viaje se abandona —por no avanzar (`noProgress`) o
por plazo— la plaza concreta se apunta durante `SHUN_STEPS` (una ventana de
sorteo, 900 pasos) y `decide()` la salta: prueba las demás libres del mismo
sitio en orden y, si todas fallaron, pasa al siguiente sitio. **Se descarta la
plaza, no el sitio**: la primera versión descartaba el sitio entero y le quitaba
la capilla al devoto, que es quien viaja más lejos a rezar.

**El plazo vencido de las personas, que IA-6 retiró.** Entra ahora porque existe
el descarte. Y con una corrección que no estaba prevista: `until` se fija al
decidir e incluía el viaje, así que quien iba lejos llegaba tarde a su propio
plazo. El viaje tiene ahora su plazo propio, `Intent.arriveBy`: el tiempo
esperado por la ruta y el paso de quien va, **doblado y con cinco segundos de
gracia** (`JOURNEY_SLACK`, `JOURNEY_GRACE_STEPS`). `until` vuelve a ser sólo
cuándo acaba la ocupación.

**El labrador llega a su puesto, no a su alcance** (`PARCEL_REACH` 0,9 en vez
del `reach` de `work`, 1,6), y el temblor de los puestos de parcela baja de
±0,25 a ±0,15 celdas: con un cuerpo de radio 0,32, un puesto a 0,25 del borde
de su celda solapaba la vecina si estaba bloqueada y contaba como «círculo en
celda cerrada».

## 2. Lo medido

`tools/life-report.ts 7 23 97 11 42 --days 2` (cinco semillas, 62 400
cuerpo-segundos), contra IA-7 (tres semillas) y contra las variantes probadas
por el camino:

| | IA-7 | descarte por **sitio** | descarte por **plaza** | + temblor ±0,15 | + `arriveBy` (**final**) |
|---|---|---|---|---|---|
| centro en celda cerrada | 0 | 0 | 0 | 0 | **0** |
| círculo en celda cerrada | 0,09 % | 0,07 % | 0,12 % | 0,09 % | **0,06 %** |
| giros > π/2 | 0,37 % | **0,54 %** | 0,40 % | 0,42 % | **0,39 %** |
| parados con impulso ≥ 0,9 | 0,09 % | 0,08 % | 0,06 % | 0,06 % | **0,08 %** |
| labradores fuera de su campo | 13,6 % | 9,2 % | 9,8 % | 4,0 % | **6,5 %** |

Dos cosas que las cifras enseñan:

- **El descarte por sitio subía los giros a 0,54 %**, y era lo correcto a
  medias: quien abandona ahora se da la vuelta y va a otro lado, donde antes se
  quedaba clavado mirando a la plaza fallida. Con el descarte por plaza la
  vuelta es menor porque casi siempre hay otra plaza en el mismo sitio.
- **El plazo vencido ya no empeora nada** (0,06 → 0,20 % era la medida de IA-6
  sin la pieza). Con ella, 0,08 %.

Pruebas rápidas de la vida (`life-*`, `daylife`, `animals`, `villager-rig`):
**132 de 132 verdes**, 16 s. Cinco fixtures de `Dweller` ganan `failed: new
Map()`.

## 3. El devoto, y por qué no se ha tocado el listón

`el devoto reza al menos el doble que el resto` (IA-3) se puso roja dos veces y
verde dos veces **a lo largo de la ronda**, con cambios que no tocan el rezo.
Medido sobre seis semillas apagando de uno en uno el descarte, el plazo, el
alcance de parcela y el temblor: **la proporción va de 0,6× a 2,7×**. El rezo
es el 1 % del tiempo de la aldea y la muestra de la prueba —dos semillas, tres
segundos— apenas lo ve. Con el código final pasa (por poco) y se deja como
está, con el aviso escrito en la propia prueba: si se pone roja al tocar otra
cosa, no es una regresión del devoto. Lo que falta de verdad es o un sesgo del
devoto que se vea con una muestra barata, o una muestra mayor fuera de la
suite rápida. Está en `docs/task-log.md` §4.

**Y una lección de método, otra vez:** un `subprocess` de `npx vitest` desde
Python sin terminal se quedó colgado veinticinco minutos sin hijos vivos. El
bisect se hizo en primer plano con `sed` en dos minutos. Lo de IA-5 §3.1, en
otra forma.

## 4. Qué observación refutaría esta ronda

Una persona reintentando la misma plaza inalcanzable dos veces seguidas en
treinta segundos. Alguien que va lejos a una ocupación y la abandona antes de
llegar sin que nada se lo impida. Un labrador cavando a más de media celda de
su campo. Cualquiera de las cinco cifras peor que la columna final.
