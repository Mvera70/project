# El sonido del mundo — análisis (29 sep 2026)

**Qué es esto.** Vera pidió (29 sep 2026) empezar por «los sonidos de ambiente de
la vida, de la naturaleza»: todo lo que el juego ya dibuja o deja tocar y no
suena, sin fabricar nada todavía. Esto es **la lista y el análisis**; cómo se
procede lo decide ella. Está hecho contra el código, no contra el plan: tres
lecturas independientes (entorno y clima; vida y animales; edificios, sucesos y
combate), con `fichero:línea` en cada dato, contrastadas con los IDs que
`plan-audio.md` §4 ya listaba.

**Lo que hay hoy:** sólo la interfaz (`src/ui/sound.ts`, veinte MP3). El mundo
no suena nada. El trueno **ya tiene su disparador y no su fichero**
(`app.ts:882`), así que es lo más barato de todo.

---

## 1 · Las siete cosas que cambian el plan

1. **El reproductor no sabe hacer un ambiente.** `sound.ts` sólo lanza
   ficheros sueltos de una vez: sin bucles, sin capas, sin ganancia por capa,
   sin fundidos, sin posición. Antes de que suene un viento hay que hacerlo
   (§5, fase 0).
2. **No hay un flujo de sucesos.** Lo que se ve es *estado que se puede leer*,
   no eventos: no hay «acaba de caer un hachazo». Lo que ya se puede leer sin
   tocar nada, lo que necesita un descriptor pequeño y lo que necesita un
   gancho nuevo está separado en la columna **Lectura** de §3.
3. **A ×16 y ×64 el mundo pasa demasiado deprisa para sonar.** Una jornada son
   120 s a ×1 y **1,9 s a ×64**: el cielo puede cambiar, una puerta abrirse y
   cerrarse, el día y la noche alternarse cada dos segundos. El renderer ya
   aplana la luz a esas velocidades (`daylight.ts:225`, `LIGHT_STEADY`); el
   sonido tiene que hacer lo mismo o será un parpadeo.
4. **Dos relojes.** La pantalla dibuja una copia congelada del estado
   (`scenic-state.ts`, el «relevo» al anochecer): edificios, nacimientos y
   muertes se **ven hasta una jornada después** de que el motor los cuente
   (hasta 120 s a ×1). Un sonido atado al tick llega **antes que la imagen**.
   Lo que se pinta del estado vivo (fuegos, caída de árboles, el «+1» de la
   madera) no tiene desfase.
5. **El plan de audio está desfasado por los dos lados.** Pide sonidos de cosas
   que **no existen** (espadas, cuerno de aviso, caballo, carro, rueda de
   molino, muro que se rompe) y no pide cosas que **sí existen** (cascadas,
   hoguera de la plaza, la caza entera, expediciones, peste, la segunda puerta,
   los cambios de era —que ya se disparan hoy—). Detalle en §4.
6. **Algunas cosas suenan mejor de lo que se ven.** La forja no saca humo ni
   brillo; las aspas del molino no giran; la campana de la capilla está
   modelada y nadie la toca; nacimientos, muertes y funerales no tienen
   escena. Un sonido sin imagen es un fantasma: cada hueco de esos va a
   `encargos-3d.md` (regla de la skill `goal`, §4b).
7. **El sonido no puede gastar azar del motor** (CLAUDE.md): los ganchos son
   observadores de sólo lectura en la capa de render/vida. Y el combate ya es no
   determinista por decisión del dueño: sus sonidos van a los hechos vivos, no a
   la semilla.

---

## 2 · Qué se puede fabricar y qué no (dicho con honestidad)

La síntesis ha funcionado con **materiales y ruido con forma** —lo que gustó en
la interfaz— y funciona mal con lo que necesita una garganta. Esto decide qué se
fabrica aquí y qué habría que conseguir fuera:

| Familia | Síntesis propia | Nota |
|---|---|---|
| Viento, lluvia, nieve, tormenta, trueno, rayo | **Buena** | Ruido filtrado con envolventes. Es lo que mejor sale |
| Río, cascada, orilla, vado, riada | **Buena** | Ruido con formantes de agua; la cascada es más fácil que el río |
| Fuego, brasas, vapor, hoguera | **Buena** | Chasquidos aleatorios sobre un lecho de ruido |
| Trabajo (hacha, pico, martillo, azada, cubo, siembra), puertas, portón, pisadas, monedas | **Buena** | Es el foley de materiales que ya gustó |
| Combate sin voces (flechas, lanza, caída, portón, tablas) | **Buena** | Igual; sin sangre, pendiente de decisión (§6) |
| Campanas | **Buena** | Ya hechas para los hitos; bronce grave |
| Pájaros, insectos, grillos, ranas | **Dudosa** | Suenan a sintetizador fácilmente; hubo una dirección aprobada con Mirelo el 19 sep |
| Voces (murmullo de gente, risas, riñas, cántico), animales (vaca, cerdo, gallina, lobo, oso, cuervo, perro) | **Mala** | Una voz sintética es lo que más «infantil» o «de dibujos» suena. No lo recomiendo |

**Para lo malo hay tres caminos**, y la decisión es tuya: (a) generarlo con
Higgsfield (Mirelo ya se usó para pájaros: 0,5 a 2,7 créditos por toma; los
prompts están en `plan-audio.md` §8); (b) bibliotecas con licencia libre que
bajarías tú (esta máquina no tiene red); (c) **no ponerlo**: el murmullo de una
aldea se puede sugerir con su actividad —golpes, pasos, puertas, un perro lejano—
sin ninguna voz.

---

## 3 · La lista

**Son 80 filas** (algunas cubren varios sonidos: `amb_wind_*` son tres bucles, `world_footsteps_*` cinco superficies). Las que dicen «(no)» o «sin imagen» son las que **no** conviene fabricar todavía.

**Lectura** dice cómo se sabe *cuándo* suena, hoy:
**Hoy** = ya se puede leer desde `app.ts` sin tocar el render; **Descriptor** =
el dato existe dentro del renderer y hay que exponerlo (una función pequeña, no
un sistema); **Gancho** = no hay dato y hay que crearlo.
**Prio:** P0 lo primero, P1 el núcleo, P2 profundidad, P3 más tarde.
**Plan** dice si `plan-audio.md` ya lo listaba (ID) o **nuevo**.

### 3.1 · Lechos continuos (bucles)

| ID | Qué suena | Cuándo y cuánto (dato) | Lectura | Prio | Plan |
|---|---|---|---|---|---|
| `amb_wind_*` (3 bucles: brisa, racha, invierno hueco) | Viento. **Por cielo, no por estación**: fuerza despejado 0,3 · nublado 0,45 · lluvia 0,6 · tormenta 1,0 · nieve 0,25 (`wind.ts:29`) | `stats().sky` + estación desde el tick | Hoy | **P0** | `amb_wind_*` (aquí por cielo) |
| `amb_rain_light` / `amb_rain_heavy` | Lluvia fina y fuerte. Cuántas gotas = intensidad 0,45–1 | `stats().sky`; **la intensidad no sale** | Descriptor (intensidad) | **P0** | `amb_rain_light` |
| `amb_storm_bed` | Lecho de tormenta: lluvia pesada y viento grave, **sin** truenos | cielo `storm`; ~9 % de las jornadas de verano en un año normal | Hoy | **P0** | `amb_storm_bed` |
| `amb_snow_hush` | Aire amortiguado de nevada, casi silencio | cielo `snow` (invierno) | Hoy | P1 | `amb_snow_hush` |
| `amb_river` | Río. **El pueblo se funda siempre a 3–6 celdas del río** (`mapgen.ts:82`), así que casi siempre se oye | Cerca del centro de la vista: `viewCentre`, `viewHeight`; eje del río con `valleyAxis` | Hoy (posición) | **P0** | `amb_river_soft` |
| `amb_river_flood` | El mismo río, más fuerte y turbio | `floodOf`: 1,0 la semana de la riada, 0,5 la siguiente | Hoy | P1 | `event_flood_surge` |
| `amb_waterfall` | Cascadas (hasta 3: dos gargantas y una al lago) con su remanso | Posiciones calculables con `waterfallSites`; suben con la riada | Descriptor (posiciones) | P1 | **nuevo** |
| `amb_lake_lap` | Oleaje pequeño de orilla (el lago no existe en todas las semillas: 43 de 60 sí) | Orilla del lago cerca de la vista | Descriptor | P3 | **nuevo** |
| `amb_leaves` | Hojas de bosque al viento, sólo cuando hay bosque en la vista | Bosque cerca; sube con el viento | Descriptor | P2 | **nuevo** |
| `amb_birds_day` | Pájaros dispersos y lejanos (golondrinas, 3 bandadas) | 06:30–19:30; ninguno con tormenta o nieve; 0,3 con lluvia (`ambience.ts:135`) | Hoy | P1 | `amb_birds_sparse_day` (dirección aprobada) |
| `amb_night_summer` | Grillos e insectos | 21:00–03:30, sólo primavera y verano, sin lluvia (misma regla que las luciérnagas, `ambience.ts:142`) | Hoy | P1 | `amb_night_sparse` |
| `amb_night_cold` | Noche de otoño/invierno: casi silencio, un ave ocasional | Noche fuera de primavera y verano | Hoy | P2 | `amb_night_sparse` |
| `amb_village_murmur` | **El bullicio de la aldea, en varios niveles según la población**: casi nada al fundar (2 personas), un rumor a partir de una decena, un pueblo a partir de treinta o cuarenta. Sólo de día: de noche se duermen y desaparecen (no se dibujan) | `population(state)` (2 al fundar, ~63 a los 30 años, tope 80); visibles ahora: `stats().actors` | Hoy | P1 | `amb_village_murmur` |
| `amb_crowd_gather` | Más gente y más junta: asambleas, comida del mediodía (0,42–0,52), corro de la hoguera (0,58–0,66), boda, fiesta | Puestos `gather:`, `meal`, `hearth`; hasta 80 plazas | Descriptor | P2 | `event_harvest_feast` |
| `amb_fire_crackle` | Casa ardiendo: llamas y crujir; brasas después; vapor si la apagan | Estados `burnt:<id>` / `doused:<id>`; 3 días de llama y 4 de brasa (`BURNING`) | Hoy (estado) / Descriptor (posición) | P1 | `amb_fire_crackle` |
| `amb_hearth_plaza` | La hoguera de la plaza, con la gente en corro | `hearthAt(phase)`: encendida de 0,55 a 0,70 cada jornada | Hoy | P2 | **nuevo** |
| `amb_festival` | Plaza engalanada, gente lejana y mesa | `festivityOf` | Hoy | P2 | `event_harvest_feast` |

### 3.2 · Cielo y agua: los acentos

| ID | Qué suena | Cuándo (dato) | Lectura | Prio | Plan |
|---|---|---|---|---|---|
| `weather_thunder` (cerca, media, lejos) | Trueno. **Hoy el retraso es aleatorio** (0,4–2,2 s); debería salir de la **distancia real** del rayo al centro de la vista (`data-bolt-at`) | 2–7 rayos por jornada de tormenta; contador `stats().bolts` | Hoy (ya cableado, sin fichero) | **P0** | «trueno» |
| `weather_lightning_crack` | El chasquido seco del rayo, con el destello (0,46 s: parpadeo 0,07/0,05/0,06/0,06/0,22) | Cada rayo | Hoy (contador) | **P0** | **nuevo** |
| `weather_flood_surge` | La riada que sube de golpe | Semana del suceso `river_flood` | Hoy | P1 | `event_flood_surge` |
| `world_wade` | Salpicadura al vadear el río | Cuerpo sobre celda de vado/agua (`wadingCell`) | Descriptor | P3 | **nuevo** |
| `weather_puddle` | Gotas en un charco | Los charcos **no salpican** en pantalla: sonido sin imagen | — | — | (no) |

### 3.3 · Trabajo y vida (anclados a un gesto que se ve)

| ID | Qué suena | Cuándo (dato) | Lectura | Prio | Plan |
|---|---|---|---|---|---|
| `world_tree_chop` (×4) | Hachazo. Ciclo de 1,9 s, impacto al 52 % | **`cast.onStrike` ya existe** (madera/piedra) y hoy sólo mueve el árbol | Descriptor (consumidor) | **P0** | `world_tree_chop` |
| `world_tree_fall` | Crujido y caída (1,5 s; hasta 4 a la vez) | Caída al desaparecer una celda de bosque; **sin desfase** | Descriptor | P1 | `world_tree_fall` |
| `world_mine_stone` | Pico sobre roca (1,7 s, impacto al 50 %) | `onStrike` de piedra | Descriptor | P1 | **nuevo** |
| `world_hammer` | Martillazos de obra y de forja (1,6 s) | **El gesto `hammer` no tiene marcador de impacto**: hay que inventar uno por fase | Gancho | P1 | `world_build_*` |
| `world_wood_drop` | Leño que se deja: el «+1» de la madera | `woodGains()` **es el único flujo real de sucesos** que hay | Hoy | P1 | `eco_wood_gain` |
| `world_stone_drop` / `world_grain_drop` | Piedra y grano entregados | Contadores `stoneDeliveries`, `harvestDeliveries` | Descriptor | P2 | `eco_stone_gain` |
| `world_sow` / `world_hoe` / `world_spread` | Siembra (1,4 s), azada (2 s), estiércol (1,8 s) | Gestos de campo; sólo la siembra y el estiércol tienen marca | Descriptor / Gancho | P2 | **nuevo** |
| `world_harvest` | Siega: **no hay hoz** en pantalla; sólo el gesto genérico de revolver | Semana 35 | Descriptor | P2 | `world_harvest` |
| `world_douse` + vapor | Cubo de agua sobre la casa que arde (1,5 s, suelta al 55 %) | Gesto `douse` | Descriptor | P2 | **nuevo** |
| `world_drink` | Beber en el pozo o el vado (3 s) | Gesto `drink`. **La manivela y el cubo del pozo no se animan** | Descriptor | P3 | `world_well_bucket` |
| `world_door_house` | Puerta de casa que se abre y se cierra | Conjunto `activeDoors`; **a ×16 y ×64 cada ~2 s: hay que callarlo** | Descriptor | P2 | **nuevo** |
| `world_gate_open` / `world_gate_close` | El portón: abre a 0,06, cierra a 0,78 | `activeDoors` + bisagra | Descriptor | P2 | `world_gate_*` |
| `world_footsteps_*` (hierba, camino, piedra de la plaza, nieve, agua) | Pisadas. **No una por pie**: hasta 7–10 pies por segundo por persona. Una capa agregada según cuántos cuerpos caminan a la vista | Superficie ya calculada: `trample`, `map.path`, plaza, nieve, vado | Descriptor | P2 | **nuevo** |
| `world_coins` | Monedas que pasan de mano en mano | `life.payments` | Descriptor | P2 | **nuevo** |
| `world_quarrel` | Empujón y golpe seco de una riña | Escena `shove`/`brawl` y `quarrel_in_the_square` | Descriptor | P3 | `event_quarrel` (sin voces) |

### 3.4 · Animales

Sólo el perro tiene un gesto que suena (`bark`). El resto **no tiene animación
de voz**: cualquier sonido sería inventado a partir de su estado (`doing`). Los
tres animales de corral se ven **las 24 horas** (no se recogen de noche).

| ID | Qué suena | Cuándo (dato) | Lectura | Prio | Plan |
|---|---|---|---|---|---|
| `animal_dog_bark` | Ladrido | `life.dog.barking` (booleano) y ondas ya dibujadas | Descriptor | P1 | «ladrido» (encargos-3d) |
| `animal_hen` / `animal_pig` / `animal_cow` | Cacareo, gruñido, mugido esporádicos y lejanos; el mugido de la vaca al llegar el tratante | `life.beasts[].doing` (picotea, hoza, pace, rumia) | Descriptor | P2 | `amb_livestock_soft` |
| `animal_crow` | Graznido sobre los campos que maduran | Semanas 29–35, de día; hasta 8 | Hoy | P2 | **nuevo** |
| `animal_wolf` | Aullido: el lobo del corral (sólo la semana del suceso, en invierno) y la manada que cruza el monte (480 s de ciclo) | `wolfRaidToday`; manada decorativa | Descriptor | P2 | `event_wolves` |
| `animal_bear` | Gruñido de aviso (1,55 s). **Sólo sale tras cazar el jabalí** | `life/bear.ts` | Descriptor | P3 | `event_bear` |
| `animal_partridge` | Vuelo brusco de la perdiz (1,17 s) | Caza | Descriptor | P2 | **nuevo** |
| `animal_boar` | Carga y gruñido del jabalí | Caza | Descriptor | P3 | **nuevo** |
| Ciervo, conejo, zorro, patos, peces | Sin voz útil: los pasos del ciervo y del conejo al huir serían pasos | — | — | P3 | (no) |

### 3.5 · Sucesos del motor (22) y sus escenas

El motor tira un suceso casi cada semana en el valle maduro (~14 al año). De los
22, **sólo unos pocos tienen algo que se vea**. Un sonido sólo debería existir
si la imagen existe.

| Suceso | Qué se ve hoy | Sonido posible |
|---|---|---|
| `lightning_fire` | Casa ardiendo 3 días + 4 de brasa, y su derrumbe | Fuego (§3.1), derrumbe de madera. Los rayos son del cielo, no de este suceso |
| `river_flood` | El río sube; la gente al vado | `amb_river_flood`, oleaje |
| `wolves_at_the_coop` | Un lobo al gallinero; las gallinas huyen | Aullido lejano, gallinas asustadas |
| `wedding`, `harvest_feast`, `ale_feast` | Plaza engalanada y corro de gente (2 días); **sin baile ni ceremonia** | `amb_festival`; una **campana de capilla** sólo si Vera quiere (no hay imagen de campana) |
| `pedlar`, `factor_visit`, `drover_visit`, `salt_visit` | Llega andando con mula, monta puesto, monedas de mano en mano. **Sin caballo ni carro con ruedas** | `ui_offer_arrives` (ya está), monedas, mugido del tratante |
| `stranger_passes`, `minstrel`, `pilgrims`, `tinker`, `wise_woman`, `refugees` | Figuras que llegan y hablan. **El juglar no toca nada**: sin música que sonar | Pasos de grupo; nada de música |
| `quarrel_in_the_square` | Dos nombrados se encaran con globo | Golpe seco; sin voces |
| `bear_in_the_wood` | **Sólo tras cazar el jabalí** | Gruñido |
| `child_lost`, `good_catch`, `pig_slaughter`, `rats_in_the_granary` | Sólo gente reunida en el vado o la plaza | Murmullo de reunión; nada específico |
| `roof_under_snow` | **Nada** | — hasta que haya imagen |

### 3.6 · Comunidad y tiempo (lo que se cuenta)

| ID | Qué suena | Cuándo (dato) | Lectura | Prio | Plan |
|---|---|---|---|---|---|
| `stinger_era_village` / `stinger_era_town` | **Cambio de era, que ya existe**: aldea al levantar la forja, villa de piedra al cerrar el muro (`eraOf`) | Cambio de `eraOf` | Hoy | P1 | `stinger_phase_*` (el plan dice «futuro»: **está desfasado**) |
| `world_wall_closed` | El cierre de la villa (crónica de peso 3, una vez en la vida). **No es un hito hoy**: hoy sólo suena el primer muro | `wall.closed` en `report.entries` | Hoy | P1 | `world_wall_closed` |
| `world_build_complete` (madera/piedra) | Obra terminada | `report.built[]` **(llega antes que la imagen)** | Hoy | P2 | `world_build_complete_*` |
| `world_building_collapse` | Casa que se derrumba (día 2–3 del fuego); el resto de edificios cambia a ruina de golpe, sin animación | Fuego / `lostTick` | Descriptor | P2 | `world_building_lost` |
| `world_chapel_bell` | La campana de la capilla: modelada, **sin ningún disparador** | A decidir (§6) | Gancho | P2 | `amb_chapel_bell` |
| `world_death_bell` | Campana única y baja por una muerte con nombre | `report.deaths[].named` **(llega antes que la imagen)** | Hoy | P2 | `world_death` |
| `stinger_crown` | La corona pasa | `report.crown.crowned` | Hoy | P2 | `stinger_crown_passed` |
| `world_plague` | Un golpe sordo al empezar una peste (cruces en las casas) | `plague.begins` | Hoy | P3 | **nuevo** |
| Nacer, morir, llegar | **Sin escena**: aparecen y desaparecen en el relevo | — | — | — | (no hay imagen) |

### 3.7 · La caza

Señal en el mapa → aldeano con honda, arco o lanza → presa. Dura hasta 20 s y
fuerza ×1.

| ID | Qué suena | Dato | Lectura | Prio |
|---|---|---|---|---|
| `hunt_sling` / `hunt_bow` / `hunt_spear` | Disparo (arco 12 cel/s, honda 9; lanza cada 0,9 s) | `stepHuntShots` (impactos) | Descriptor | P2 |
| `hunt_hit` / `hunt_graze` | Acierto y roce | `hits` | Descriptor | P2 |
| `hunt_carcass` | Pieza caída (2,5 s) | `action: down` | Descriptor | P3 |

### 3.8 · El asedio (todo lo que se ve)

Es la parte mejor cubierta en datos —cada hecho tiene una marca de tiempo—, pero
**sin flujo de sucesos**: habría que comparar un fotograma con el anterior o
exponer los contadores de `life.defence`. Ocurre el 4,0 % de las semanas.

| ID | Qué suena | Dato | Lectura | Prio |
|---|---|---|---|---|
| `raid_march` | Pasos y equipo de la banda que llega (hasta 12 a la vista, 1,4 cel/s) | `raiders[].phase = 'coming'` | Descriptor | P2 |
| `raid_bow` | Arco que se tensa y se suelta (defensores; 1,5 s + 0,6 s; cada 2,1 s) | `lastShot`, `arrow.loosed` | Descriptor | P1 |
| `raid_arrow_air` | Flecha en vuelo (~0,8 s a 10 celdas) | `life.arrows[]` | Descriptor | P1 |
| `raid_arrow_body` | Impacto en cuerpo (una flecha derriba) | `downAt`, `arrowHits` | Descriptor | P1 |
| `raid_arrow_ground` | Flecha que se clava. **No sabe si es madera o piedra**: pararía en el suelo | `arrow.spent` | Descriptor | P2 |
| `raid_spear` / `raid_hit` | Lanza (0,9 s) y golpe recibido (0,5 s) | `thrustAt`, `hitAt` | Descriptor | P1 |
| `raid_fall` | Cuerpo al suelo (1,2 s + muñeco articulado) | `downAt`, ragdoll | Descriptor | P1 |
| `raid_gate_hit` | Golpe al portón (1 por segundo; 60 lo rompen; recula 0,45 s) | `gate.hits`, `gate.hitAt`; `siege().gate` (0–1) | Hoy (`siege()`) | **P0 del asedio** |
| `raid_gate_break` | El portón cede y salen 6 tablas | `gate.brokeAt` una vez; `siege().broken` | Hoy | **P0 del asedio** |
| `raid_planks` | Las tablas que asientan | Físicas de las tablas | Descriptor | P3 |
| `raid_flee` | Civiles que corren a casa (0,8 s de zancada; **sin gritos**) | `Dweller.flight` | Descriptor | P3 |
| `raid_loot` | Saqueo: sacos, cargas, escapar (1,8 s por saco) | `life.sack`, `ending()` | Hoy (`ending()`) | P2 |
| `raid_victory` / `raid_defeat` | El valle aguanta / la villa cae (8–12 s de escena final a ×1) | `raid.held` / `raid.stormed` | Hoy | P1 |
| `raid_horn` | **No existe**: sólo un aldeano que corre a avisar | — | — | (§6) |

### 3.9 · Interfaz: lo que falta

| ID | Qué suena | Prio |
|---|---|---|
| `ui_button_press` / `ui_button_release` | **El botón genérico, K (sello de cera): decisión de Vera del 29 sep.** Al apretar, el golpe sordo; al soltar, la cera que se despega. Hoy sólo suenan los momentos de `design.md` §11.10 | **P0** |

---

## 4 · El plan de audio contra el código

**En el código y no en el plan** (hay que darles ID): cascadas (2 de garganta y
1 al lago) con remanso y niebla · hoguera de la plaza y farolillos · la segunda
puerta (`means gate`) · cinco sucesos tardíos (juglar, peregrinos, hojalatero,
curandera, refugiados) · el final `dispersed` y la escena de 8–12 s del asalto ·
la **caza entera** (honda, arco, lanza, cinco especies) · expediciones (cinco
misiones y cinco finales) · el diezmo, la peste, las muertes por hambre y frío ·
los flujos de madera («+1/−N»), piedra y grano · cubo y vapor contra el fuego ·
las monedas de mano en mano · perro, zorro, patos, peces, cuervos, ciervos,
conejos y la manada de lobos del monte · **los cambios de era, que ya se
disparan hoy** · la corona (`CrownOutcome` existe).

**En el plan y no en el código** (no fabricar hasta que exista): **espadas**
(el cuerpo a cuerpo es lanza) · escudo que para un golpe (es adorno) · cuerno de
aviso lejano (sólo un aldeano que corre) · arco enemigo (los asaltantes no
tienen arcos) · muro que se abre (sólo el portón) · fuego durante el asalto (los
fuegos salen la semana siguiente) · flecha en madera o en piedra (no hay
material) · caballo y carro con ruedas · rueda o muela de molino (es un molino
de viento, con las aspas quietas) · cubo del pozo animado · siega con hoz ·
yunque y fuelle de la forja (sin humo ni brillo) · martillazos con marcador ·
nacimiento, muerte y funeral como escena · reliquia, hacha y mano como escena ·
`roof_under_snow`, `child_lost`, `good_catch`, `pig_slaughter` y `rats` con
escena propia · `ui_chronicle_page` (la crónica no pasa páginas).

---

## 5 · Lo que hay que construir para que algo suene

**Fase 0 · el motor de sonido (lo primero, y no es sonido).** Sin esto no puede
sonar un solo ambiente.
- **Bucles** con cruce corto, **capas con su ganancia**, y **fundidos** entre
  estados (el cielo, la noche, la población).
- **Compuertas**: por velocidad (a ×16 y ×64 sólo los lechos, y suavizados),
  por letargo (`catchingUp` es hoy local de `app.ts`), por pausa y por
  `valley.sound`.
- **Un oyente**: `viewCentre` y `viewHeight` ya salen por fotograma, y bastan
  para atenuar río, cascada, fuego y gente con la distancia y el zoom. Panoramización
  estéreo: más adelante.
- **Un descriptor del renderer** (`audioSnapshot()`, o campos nuevos en
  `GraphicsStats`) con lo ya calculado y hoy encerrado: intensidad del cielo,
  fuegos con su posición, puertas, contadores de la vida y el combate. Sin
  proyecciones: `__valleyLife()` sirve para depurar, no para esto.
- **Ganchos pequeños**: consumidor de `onStrike`, marcador de impacto del
  martillo, aristas de puertas, diferencias de combate. Todos de sólo lectura.

---

## 6 · Lo que decides tú

1. **¿De dónde salen las voces y los animales?** Generados (Higgsfield), de
   biblioteca libre que bajarías tú, o sin ellos. Mi recomendación: **sin
   voces**; el murmullo de la aldea se hace con su actividad; los animales, sólo
   si los generas.
2. **¿Sonido con posición?** Que el río se oiga más cuanto más cerca esté la
   cámara y el pueblo cuanto más zoom. Recomendado: sí, con la atenuación por
   `viewHeight`.
3. **¿Qué hace el sonido a ×16 y ×64?** Propuesta: a ×1 todo; a ×4 sin pasos ni
   puertas; a ×16 y ×64 sólo viento, lluvia, río y fuego, y con el tono
   apagado, como un avance rápido.
4. **¿Quieres dos mandos, uno para la interfaz y otro para el mundo?** Un fondo
   idle puede querer sólo el mundo, o sólo el silencio con los clics.
5. **Campana de la capilla.** Existe el modelo y no el disparador: ¿cada
   mañana y cada tarde? ¿sólo en bodas y muertes? ¿nunca?
6. **El cuerno de aviso** del asedio no existe. ¿Se añade (imagen y sonido) o se
   queda el aldeano que corre?
7. **Sangre y gore sonoro** (plan §6: «requiere decisión del dueño»). Hoy no hay
   sonido de carne: las flechas que derriban suenan a madera y a caída.
8. **Trueno por distancia**, en vez del retraso aleatorio de hoy. Recomendado.
9. **Niveles de murmullo por población.** Propuesta a medir, no fijada: casi nada
   por debajo de 6 personas, un rumor hasta ~20, un pueblo hasta ~45 y un
   bullicio a partir de ahí. Se afina midiendo poblaciones reales por año
   (`founding-report.ts`), no a ojo.

---

## 7 · Orden propuesto

| Fase | Qué | Filas de §3 (aprox.) | Por qué en este orden |
|---|---|---|---|
| **0** | Motor de sonido: bucles, capas, compuertas, oyente, descriptor | — | Sin él no suena nada |
| **1** | **Naturaleza** (síntesis buena): viento, lluvia, nieve, tormenta, **trueno y rayo**, río, cascadas, fuego + el botón K | ~13 | Es lo que Vera pidió primero y lo que mejor sale; el trueno ya está cableado |
| **2** | **Día y noche**: pájaros, grillos, noche fría, murmullo por población, hoguera | ~7 | Hace que el valle se sienta vivo mientras miras |
| **3** | **Trabajo y aldea**: hacha, árbol que cae, pico, martillo, leños, puertas, portón, pisadas, monedas, era y muro cerrado | ~16 | El foley que ya gustó; muchos con gancho listo |
| **4** | **Animales y sucesos**: perro, granja, cuervos, lobo, campana, riada | ~10 | Depende de la decisión 1 |
| **5** | **Caza y asedio** | ~17 | Lo más raro (4 % de las semanas) y lo que más ganchos pide |

Cada fase acaba como las demás: medida, prueba de propiedad del diseño, puerta y
papel. Ningún nivel se cierra a ojo: `SOUND` en `balance.ts` con su `TUNE` y su
medición.
