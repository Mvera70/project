# IA-4 · Animales con conducta propia

**16 sep 2026.** Cuarta fase de `docs/life-ai-implementation-prompt.md`.
Implementada por una sesión de Sonnet sobre `9e22079`, en paralelo con IA-3 y
con propiedad de ficheros repartida: esta fase sólo tocó `beasts.ts`.

**Estado: el mecanismo está entregado y dos fallos graves cazados, pero el
reparto del día está mal y queda una consolidación pendiente (§4).** No se
declara cerrada.

---

## 1. Qué se entregó

- **`SELF_ACTIVITIES` sustituye a `SELF_OFFER`:** cada especie tiene **varias**
  actividades propias, no una con otro nombre.
  - **Gallina:** `peck` y `scratch`, cortas (3–8 s) y de radio corto (0,5–1,2
    celdas). No se aleja del corral.
  - **Cerdo:** `root`, `forage`, `amble` y `lie`. Más lentas (5–30 s), radio
    0,7–2,0. **`lie` da descanso**, no sólo menos aburrimiento: tumbarse es una
    actividad y no la ausencia de una.
  - **Vaca:** `graze` con **cinco parches** de radio 1,2–3,2 —el prado, no un
    corral— y `ruminate`, quieta y larga, junto al ancla.
  La variedad sale de `decide()` sin tocarlo: ya elegía por utilidad entre las
  ofertas que se le dan, y ahora se le dan varias.
- **La vaca bebe en el vado** (`fordDrinkOf`), reutilizando `commons()` de
  `places.ts` sin duplicar la detección, y `BEAST_THIRST` le sube la sed. Sólo a
  ella: una gallina no va al río.
- **La vaca busca al grupo** (`herdPullOf`): si no tiene otra a menos de cuatro
  celdas, se inclina hacia el centro de masas del resto.
- **`feed`, `pet` y `chase` pasan de oferta pasiva a interacción de verdad**, con
  la secuencia de IA-2 completa: aproximación, acción, recuperación y
  liberación. La gallina se aparta en cuanto nota a alguien; el cerdo y la vaca
  se paran y miran, y sólo al contacto.

## 2. Los dos fallos graves que esta fase encontró

Los dos son de la propia fase y los cazó el agente midiendo, no razonando:

1. **`dweller.doing` se quedaba en `null` mientras un animal reaccionaba**,
   porque el bloque que lo rellena sólo corría si el paso normal gobernaba el
   cuerpo. El aburrimiento subía sin tope: **7,81 % de cuerpo-segundos con un
   impulso al máximo**, contra 0,00 % en IA-2. Arreglado con un relleno
   incondicional de `pauseHere()`.
2. **Un animal quieto podía quedarse quieto para siempre.** Con una sonda propia
   cazó **un cerdo inmóvil 18,3 segundos** junto a una puerta, cortándole el paso
   a una persona que iba al pozo. Y una segunda vuelta del mismo fallo:
   `act` y `recover` se alternaban más de sesenta segundos porque `recover` no
   era firme. Arreglado con `ACT_MAX_STEPS`, un `recover` que no vuelve atrás
   aunque la visita siga cerca, y un enfriamiento tras soltar.

El segundo es exactamente lo que el dueño del diseño describe como «los animales
están fatal»: un bicho clavado en medio del paso. Queda escrito porque lo
introdujo esta misma fase y se fue por medirlo.

## 3. Lo medido

**Las cuatro cifras de movimiento no se rompen** (`tools/reports/life-report.ts`, 3
semillas × 2 jornadas, 26 880 cuerpo-segundos; y confirmado a 6 × 3, 69 120):

| | IA-2 | IA-4 |
|---|---|---|
| centro en muro | 0 | 0 |
| círculo en muro | 19 · 0,07 % | 21 · 0,08 % |
| giros > π/2 parado | 82 · 0,31 % | 83 · 0,31 % |
| parados con impulso ≥ 0,9 | 1 · 0,00 % | 4 · 0,01 % |

**Sitios distintos por animal y jornada** (`tools/reports/life-report-species.ts`, nuevo).
Antes de IA-1 era exactamente **1** para todos: un animal volvía siempre al
mismo palmo.

| Especie | Media | Máximo |
|---|---|---|
| gallina | 4,4 | 14 |
| cerdo | 7,0 | 13 |
| vaca | 1,3 | 3 |

**Y el reparto del día, que es donde esta fase no llega** (semillas 7 y 23, dos
jornadas):

| | andando o nada | reaccionando a una persona | lo suyo |
|---|---|---|---|
| cerdo | 49,4 % | **38,3 %** | 12,3 % (`root` 8,8 + `forage` 3,5) |
| vaca | 50,8 % | **42,6 %** | 6,5 % (`graze` 6,1 + `ruminate` 0,4) |

Una vaca que pasta el 6 % del día y rumia el 0,4 % **no es** «pastar por parches
y rumiar», que es lo que el brief pide. Y pasar dos quintos del día reaccionando
a la gente no es cautela, es un tic.

## 4. La causa, y la consolidación que falta

El agente nombró la causa y es correcta: **desde `beasts.ts` no se puede leer
qué está haciendo la persona**, porque `village.ts` estaba cerrado para esta fase
(lo tenía IA-3). Así que «alguien que se ha parado a darle de comer» y «alguien
que se ha parado a rezar, a trabajar o a beber a un metro» **no se distinguen**,
y el animal reacciona a los dos.

Y de ahí sale la segunda divergencia: `beasts.ts` crea **su propio registro de
compromisos** en un `WeakMap` en vez de usar el de `village.ts`. Eso contradice
lo que IA-2 existe para garantizar —un solo registro, para que una persona y un
animal no puedan reservarse por separado—.

**Las dos se arreglan de una vez, y la hago yo cuando IA-3 suelte `village.ts`:**

1. pasar el registro de la aldea a `stepBeasts`, y borrar el `WeakMap`;
2. **condicionar la reacción a que la persona de verdad venga a eso** —que su
   `doing.offer.id` sea `feed`, `pet` o `chase`— en vez de a la simple cercanía;
3. volver a pasar `tools/reports/life-report-species.ts` y exigir que lo suyo suba por
   encima de lo que reacciona.

## 5. Verificación

```
npm run typecheck   → limpio
npm run lint        → limpio
animals, life-motion, life-body, life-navigate, life-terrain,
  life-commitments, life-beasts (nuevo, 9 pruebas)
  → 67 de 67 verdes, incluida la reconstrucción determinista
```

## 6. Captura

**Flaca, y dicho como es.** El comando del brief (`--advance 892 --zoom 1.6`)
encuadra la plaza y el granero, y las gallinas viven junto a las casas, fuera de
cuadro. Lo que funcionó: `--seed 11 --settle 8 --advance 100 --zoom 6`, o sea el
**año 3**, cuando la aldea es una casa y la cámara la centra. Ahí se ven **dos
gallinas junto a la pared cambiando de sitio entre fotogramas** —picotean y
vagan, no están clavadas—, en `artifacts/graphics/IA/beasts/`.

Lo que **no** hay: ninguna secuencia con una persona acercándose y la gallina
apartándose, ni con cerdo o vaca en pantalla. La propiedad queda probada por las
pruebas unitarias, **no por captura**, y eso no es lo que el método pide.

Y un hallazgo de herramienta: **el zoom parece topar por encima de unas dos
muescas** —1,6 y 8 dieron el mismo encuadre—, así que acercarse a un animal
concreto en una aldea grande no se puede hoy. Es lo que hace falta primero para
juzgar si una gallina picotea como una gallina.

## 7. Qué observación refutaría esta fase

Un animal inmóvil más de unos segundos junto a una persona que sólo pasaba. Una
vaca que nunca se acerca a otras vacas. Un cerdo que sólo hace una cosa.
Reconstruir el mismo día con la misma semilla y ver otra reacción. Y la que la
tabla de §3 ya anticipa: un rebaño que pasa el día pendiente de la gente en vez
de comiendo.
