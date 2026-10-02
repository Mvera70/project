# La fusión del día del 2 oct 2026

Informe de cierre de la tanda de día (skill `director` §3.4). Es la segunda del
día, después de la de la noche (`fusion-2026-10-02.md`). Una sesión de director
repartió, ordenó e integró. Trabajaron seis carriles de Claude: K5, combate,
fauna, valle natural, minería y cerco, y animales. Codex llevó a la vez la tanda
larga de modelos (Sol 6 dirige, Astra modela; encargo en
`docs/encargos/encargo-astra-tanda-larga-2026-10-02.md`) y fusionó sus PR por su
cuenta. Plantilla: `fusion-2026-10-02.md`.

## 1 · Qué entró, en qué orden

Horas de Madrid.

| Orden | PR | Versión | Carril | Qué trae | Toca el motor | Entró |
|---|---|---|---|---|---|---|
| 1 | #47 | v5.75 | K5 | El cuero de la caza: `village.hides`, el buhonero compra pieles, el peto se pide en la herrería | Sí | 12:11 |
| 2 | #49 | v5.80 | Combate | El peto en el asalto | No | 13:23 |
| 3 | #50 | — | Director | `docs/ideas.md`, el buzón de ideas de Vera, y su fila en `CLAUDE.md` | No | 13:46 |
| 4 | #51 | — | Director | El 15 % bien leído (el cuero protege, la flecha quita 85) y las partes del cuerpo | No | 13:59 |
| 5 | #52 | v5.81 | Combate | La ronda del daño: vida en porcentaje, daño por arma, tabla arma × pieza con rebote | No | 14:17 |
| 6 | #53 | — | Director | Los principios de Vera en `CLAUDE.md`: mirar `plan-meta` antes de afinar, equilibrio y no licencia, sistemas que conviven | No | 14:25 |
| 7 | #54 | v5.85 | Fauna | La fauna por estaciones: crías, aves de paso, invierno escaso, mariposas y jabalíes | No | 15:44 |
| 8 | #55 | — | Director | El encargo de la tanda larga de modelos para Codex | No | 15:50 |
| 9 | #48 | v5.73 | Valle | El valle con forma natural | Sí | 16:19 |
| 10 | #57 | v5.90 | Codex | B0: los quince accesorios (modelos) | No | 16:45 |
| 11 | #58 | v5.74 | Valle | Los usos del cinturón: bosque de ladera, rebaño en la falda, cantera | No | 17:02 |
| 12 | #60 | v5.89 | Cerco | El cerco sin salida: la puerta abre a suelo que llega a las gargantas | Sí | 17:20 |
| 13 | #59 | v5.90 | Codex | B0: los accesorios en la escena | No | 17:28 |
| 14 | #61 | v5.91 | Codex | B1: los tablones | No | 17:48 |
| 15 | #63 | v5.93 | Codex | B3: el peto de cuero integrado; las armaduras de metal, candidatas | No | 18:03 |
| 16 | #64 | — | Codex | B7: los modelos que no son animales | No | 18:16 |
| 17 | #65 | v5.86 | Minería | AR-2: la mina, el mineral y la Edad del Hierro | Sí | 18:35 |
| 18 | #66 | v5.95 | Codex | B5: accesorios de visitantes y expediciones | No | 19:09 |
| 19 | #62 | v5.100 | Animales | Los animales rehechos: caballo, cigüeña, polluelo, grulla, mariposa y nido | No | 19:28 |
| 20 | #67 | v5.92 / v5.94 | Codex | B2/B4: candidatos de la sastrería y de la mina, sólo modelos | No | 19:47 |
| 21 | #56 | v5.76 | K5 | La sastrería y el lino: comida contra tela, la ropa abriga | Sí | 19:53 |

Las PR de Claude entraron cada una con sus ocho trabajos de CI en verde sobre
su último commit y con `main` al día. La única excepción es #56, que se explica
abajo. Las de Codex las fusionó Codex.

## 2 · Cómo combinan

- **Cinco PR del motor, una detrás de otra:** #47, #48, #60, #65 y #56. Cada
  una metió el `main` de la anterior antes de su última vuelta de CI. Ninguna
  entró en paralelo con otra del motor.
- **K5 (#56) tuvo que meter `main` cuatro veces:** primero la falda (#58),
  luego la mina (#65) y por último #66 y #62 juntas. En el cruce con la mina,
  la mina pasa a ser §7.20 del diseño, porque §7.18 y §7.19 eran ya de la
  sastrería y de la regla de los encargos. El pasillo E3b, con las dos
  trayectorias juntas, sale de `it.fails`.
- **#56 entró sin otra vuelta tras #67.** Codex fusionó #67 seis minutos antes.
  `git diff 2cdc712c..61bfd58f` sólo cambia `art/recipes/`, `artifacts/`,
  `docs/changelog.md` y `docs/task-log.md`, sin código ni pruebas. GitHub la
  daba como limpia, así que la CI de 73142c4 seguía valiendo.
- **El cronómetro de `life-decide` («una jornada entera cuesta poco»).** Con K5,
  la semilla 7 a los 40 años es una aldea de 79 personas y 122 edificios; antes
  eran 36. La prueba pasó a medir de verdad el techo de V-13, ochenta agentes,
  y se pasó un 3 % en CI (7 731 ms contra 7 500). La sastrería no es la causa:
  sin ella, la jornada cuesta lo mismo. **Decidido por el director:** medir la
  mejor de tres jornadas, sin tocar el listón. Así salió en verde en CI. El
  coste está en la vida (`routeAroundBodies`, `resolve`, `bodyTraffic`).
- **Lo de Codex y lo de Claude se tocaron en el arte.** #62 chocó con #66 en
  `art/catalog.json` y en `public/assets/valley3d/manifest.json`. Se resolvió
  con lo de los dos lados: el manifiesto de `main` regenerado con
  `publish-assets`, con 146 entradas y ninguna perdida.

## 3 · Lo que costó y la regla que queda

- **Codex fusiona por su cuenta.** Siete PR suyas entraron sin pasar por la cola
  del director. Por su culpa #62 fue rechazada al fusionar: tenía los ocho en
  verde y #66 entró dos minutos antes. #56 tuvo que volver a meter `main`
  después de haber subido. **Regla para la próxima:** una PR que, desde la base
  de la CI, sólo recibe `art/recipes/`, `artifacts/` y documentos, y que GitHub
  da como limpia, no repite la CI. Se comprueba con `git diff` y se escribe en
  el informe, como con #67. Si llega código o pruebas, se repite la vuelta.
- **«Apuntado» sin escribir.** El director le dijo a Vera «apuntado» de seis
  ideas que sólo estaban en mensajes entre sesiones. De ahí nace
  `docs/ideas.md` (#50), con su regla.
- **El 15 % leído al revés.** «La flecha hace un 15 %» era «el cuero protege un
  15 %». Leído al revés, caían 20 de 20 cercos. Lo corrigió Vera el mismo día
  (#51). La lección: una cifra de Vera se repite con su sentido antes de
  encargarla.
- **#51 y #52 chocaron en `ideas.md`.** Fue culpa del director: escribió en un
  fichero que tenía otro carril abierto. Lo resolvió la sesión de los petos.
- **La hoja de los animales se mandó sin mirarla.** «¿En serio crees que esto
  está bien? Mira el pollo.» Desde entonces, el director abre la imagen antes
  de enseñarla. Hicieron falta cuatro vueltas más, y Vera la aprobó con «ahora
  sí».

## 4 · Lo que queda, por dueño

**De Vera (decisiones, nadie las toma por ella):**
- **El rey.** `design.md` dice «leader hasta la Edad del Hierro». Si el rey
  llega con la de los Caballeros (tabla AR), hay que retocar esa regla.
- **El precio de la mina.** La villa cerrada pasa de 329 a 362 h y la población
  baja de 56 a 50 (AR-2).
- **K5:** qué encargos de la plaza se mudan a su oficio (las hierbas, la veta
  alta, la lobera), y las plantas, el tercer material.
- **K12:** las cinco preguntas del establo y los cercados (`plan-meta.md`).
- **Gráficos:** la lectura en la tablet con `?aa=msaa`.

**De la vida:**
- La jornada de 80 agentes va justa (arriba, §2).
- Dos leñadores bloquean los huecos de la leñera y el porteador no carga
  (semilla 7, año 8; declarado en `life-trade.test.ts`).

**Del motor y del nivelado:**
- Pocas aldeas tienen vacas, así que el pasto de la falda casi no se ve.
- Hay menos sitio para campos cerca de la plaza.

**De Codex:** los candidatos de la sastrería y de la mina (#67) esperan a que
se integren, en una ronda aparte. K5 y AR-2 ya están en `main`.

**Del dispositivo:** la medida combinada en la tablet sigue sin hacerse.
