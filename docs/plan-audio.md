# Plan maestro de audio

**Fecha de registro:** 18 de septiembre de 2026
**Estado:** inventario en curso; hay una propuesta aprobada para el ambiente
principal, pendiente de que su fichero fuente esté disponible e integrado. El
resto de piezas sigue pendiente de producción y aprobación.

Este documento reúne el audio que necesita toda la aplicación: ambiente del
mapa, respuesta de interfaz, economía, vida de la aldea, hitos, fases y el
asedio que completa la meta de `design.md` §1b. Es una lista de producción, no
una orden de integrar todo a la vez.

## Ambiente aprobado, pendiente de integración · 19 de septiembre de 2026

La primera pista ambiental aprobada para sustituir el lecho sintético de viento
y río se generó con Higgsfield/Mirelo Text to Audio:

- **Job:** `b366ac0d-266d-4ba4-a842-477c0a942452`
- **Fuente prevista:** `src/ui/audio/valley-ambient.mp3` (no está en el árbol
  de trabajo y, por tanto, aún no se publica ni carga el juego).
- **Dirección:** río lejano, brisa suave, pájaros escasos y silencios largos;
  sin música, voces ni efectos protagonistas.
- **Uso previsto:** bucle continuo a ganancia baja; fragua, campana y acentos
  del juego siguen siendo eventos separados.

Cuando se recupere el fichero fuente, deberá cargarse al armar el
`AudioContext`, repetirse en bucle y cruzarse con el lecho sintético sin cortar
los acentos. Hasta entonces `src/ui/sound.ts` conserva el ambiente Web Audio
existente y el plan no declara una integración terminada.

## 1. De dónde se parte

El juego ya tiene sonido, pero **todo se sintetiza con Web Audio** en
`src/ui/sound.ts`; no existe ningún `.wav`, `.ogg` ni `.mp3` en `public/` o
`src/`. Hoy están cubiertos:

- viento continuo, con volumen distinto por estación;
- río continuo;
- golpe ocasional de fragua;
- campana ocasional de capilla o iglesia;
- trueno;
- un acento genérico para hitos;
- un acento genérico para encrucijadas.

Estos sonidos deben conservarse como respaldo hasta que cada archivo nuevo se
oiga bien **dentro del juego y en un móvil**. La primera prueba externa fue un
bosque completo y se descartó por cargado. La segunda, aprobada como dirección,
es una capa aislada de dos o tres pájaros lejanos, con llamadas suaves y
silencios largos (`dccda69f-3a48-4185-8bfc-37a1155f735f`, Mirelo, 8 s). Todavía
no está descargada ni integrada.

Hay una distinción importante:

- **Hito** existe hoy: primera capilla, primera fragua, primera construcción de
  una clase, máximo de población, década y siglo.
- **Cambio de fase o era** está planificado como
  `hamlet → village → town` en `plan-meta.md` A4/A5, pero aún no existe en el
  estado. Se puede producir su sonido ahora; no se conecta hasta que A4 exista.
- No hay una mecánica de «subir de nivel» independiente. Su equivalente real
  es el hito, el cierre de la muralla y el futuro cambio de fase.

## 2. Reglas de producción e integración

1. **Capas limpias.** Cada ambiente contiene una sola familia reconocible:
   pájaros, río, viento, lluvia, ganado o actividad humana. Nada de meter un
   bosque entero en cada archivo.
2. **Pocas capas simultáneas.** Objetivo: lecho base + clima + una capa de vida.
   El río, los pájaros, la fragua y la campana no deben competir todos a la vez.
3. **El juego no suena por cada tick.** Grano, madera, piedra y plata cambian de
   forma continua. Los acentos se disparan al recibir una cantidad visible, al
   aceptar un trato, al completar una obra o al cruzar un umbral; nunca por cada
   unidad producida.
4. **Una familia antes que veinte archivos.** Primero se aprueba un ejemplar
   reducido dentro del juego; después se generan sus variantes.
5. **Sin música dentro de los efectos.** Los SFX y ambientes deben llegar sin
   melodía, voz, narración, reverberación cinematográfica ni fundido añadido.
6. **Bucles discretos.** Para una fuente de 8 s se prepara un bucle con cruce
   corto en el navegador. Si la repetición se reconoce, se pide una toma más
   larga; no se tapa subiendo el volumen de otras capas.
7. **Entrega canónica.** Maestro sin pérdida para archivo y versión comprimida
   para el juego. En producción móvil se prioriza OGG/Opus o MP3; mono para
   ambiente y efectos localizables, estéreo sólo cuando aporte anchura real.
8. **Nombres estables.** `amb_` ambiente, `ui_` interfaz, `eco_` economía,
   `world_` mundo, `event_` suceso, `stinger_` hito/fase y `raid_` asedio.
9. **La preferencia de sonido manda.** Todo pasa por el motor de sonido actual;
   nada crea un segundo reproductor ni ignora `valley.sound`.
10. **La interfaz no es una máquina de premios.** Un toque corriente puede no
    sonar. La navegación usa como máximo una familia de roces de papel/madera;
    las compras, hitos y decisiones tienen más presencia. No se apilan sonidos
    al cambiar de panel, ni se toca una campana para cada botón.

Las duraciones de las tablas son objetivos de producción, no constantes de
balance. Se afinan al escuchar la pieza sobre el juego.

## 3. Prioridades

| Prioridad | Significado |
|---|---|
| **P0** | Primera tanda de validación. Uno por uno, antes de producir familias |
| **P1** | Núcleo audible del juego actual |
| **P2** | Profundidad y variedad; entra después de que P0/P1 funcionen en móvil |
| **P3** | Fases futuras: villa de piedra, asedio y final |

## 4. Inventario

### 4.1 Ambiente continuo

Son pistas de fondo, no escenas completas. Deben admitir volumen bajo durante
muchos minutos sin reclamar atención.

| ID | Pieza | Objetivo | Cuándo suena | Prioridad |
|---|---|---|---|---|
| `amb_birds_sparse_day` | Dos o tres pájaros pequeños y lejanos, con silencios largos | bucle 8–20 s | Día despejado; capa aprobada como dirección | **P0** |
| `amb_river_soft` | Corriente tranquila, sin aves ni viento | bucle 12–30 s | Siempre que el río esté en el mapa; reemplazo opcional del sintetizado | P1 |
| `amb_wind_spring` | Brisa ligera, hojas tiernas | bucle 15–30 s | Primavera | P2 |
| `amb_wind_summer` | Brisa seca y más abierta | bucle 15–30 s | Verano | P2 |
| `amb_wind_autumn` | Hojas secas aisladas, sin temporal | bucle 15–30 s | Otoño | P2 |
| `amb_wind_winter` | Aire frío, limpio y poco cargado | bucle 15–30 s | Invierno | P1 |
| `amb_rain_light` | Lluvia fina sobre hierba y tejados lejanos | bucle 15–30 s | Jornada lluviosa | P1 |
| `amb_storm_bed` | Lluvia fuerte y viento grave, sin truenos | bucle 15–30 s | Tormenta; el trueno sigue siendo un acento separado | P1 |
| `amb_snow_hush` | Aire amortiguado de nevada, casi silencio | bucle 15–30 s | Nieve | P2 |
| `amb_night_sparse` | Insectos muy leves y un ave nocturna ocasional | bucle 15–30 s | Noche fuera del invierno | P2 |
| `amb_village_murmur` | Actividad humana distante, sin palabras inteligibles | bucle 15–30 s | Aldea con población suficiente y de día | P2 |
| `amb_livestock_soft` | Ganado distante y muy esporádico | bucle 15–30 s | Corral con animales | P2 |
| `amb_forge_work` | Yunque irregular, fuelle muy leve | bucle/eventos espaciados | Fragua encendida; mejora del sintetizado | P2 |
| `amb_chapel_bell` | Campana pequeña, una llamada con cola natural | golpe 2–4 s | Capilla o iglesia; mejora del sintetizado | P2 |
| `amb_fire_crackle` | Fuego de edificio, sin gritos | bucle 6–12 s | Mientras haya fuego visible | P2 |

### 4.2 Interfaz y navegación

La interfaz de pergamino pide sonidos secos y suaves. No hace falta sonar en
cada toque: sólo cuando cambia de contexto. Abrir y cerrar un panel deben ser
dos variaciones del mismo gesto, no dos efectos llamativos; cambiar entre
Valley, Chronicle, People y Cart puede ser todavía más leve o quedar en
silencio si el panel ya está abierto.

| ID | Pieza | Disparador real | Prioridad |
|---|---|---|---|
| `ui_title_begin` | Inicio de un valle, golpe cálido muy corto | «Begin» en la portada | P1 |
| `ui_title_continue` | Retomar, más discreto que comenzar | «Continue» | P2 |
| `ui_panel_open` | Papel o tablilla que se despliega, muy corto y mate | Abrir Crónica, Gente, ficha o Carro | P1 |
| `ui_panel_close` | La misma familia, descendente y aún más discreta | Cerrar panel y volver al valle | P1 |
| `ui_tab_change` | Sólo un roce casi seco, o silencio si el panel no cambia de contexto | Cambiar de pestaña | P2 |
| `ui_chronicle_page` | Paso de hoja | Cambiar de año en la crónica | P2 |
| `ui_person_select` | Toque suave de madera/pergamino | Abrir la ficha de una persona | P2 |
| `ui_pause` | Cierre corto y apagado | Pausar | P2 |
| `ui_resume` | Apertura corta y ligera | Reanudar | P2 |
| `ui_speed_change` | Tic de rueda, una sola familia con variación de tono | Cambiar ×1/×4/×16/×64 | P2 |
| `ui_action_success` | Confirmación cálida, sin parecer una moneda | Acción aceptada por el motor | **P0** |
| `ui_action_refused` | Golpe apagado de madera, no alarma | Oferta o medio que no puede pagarse | P1 |
| `ui_offer_arrives` | Campanilla de camino, distinta de la capilla | Aparece una oferta de comerciante | P1 |
| `ui_offer_accept` | Intercambio breve de bolsa y ficha | Aceptar una oferta | P1 |
| `ui_offer_decline` | Papel que se retira | Rechazar o dejar pasar una oferta | P2 |
| `ui_crossroad_opens` | Dos notas de pregunta; reemplazo del acento actual | Se plantea una encrucijada | P1 |
| `ui_crossroad_decide` | Sello seco sobre pergamino | Se confirma una opción | P1 |

### 4.3 Recursos y economía

Estos efectos acompañan **cambios visibles y agrupados**, no la producción
semanal. La cabecera puede hacer el salto numérico mientras suena un solo
acento.

| ID | Pieza | Disparador propuesto | Prioridad |
|---|---|---|---|
| `eco_silver_gain` | Dos o tres monedas pequeñas, antiguas, nada brillante ni arcade | Plata recibida por trato o suceso | **P0** |
| `eco_silver_spend` | Una moneda pesada que deja la mano | Compra, corona o pago en plata | P1 |
| `eco_stone_gain` | Dos fragmentos de piedra cayendo en un montón | Entrega visible desde cantera o umbral de existencias | P1 |
| `eco_wood_gain` | Leños depositados, golpe hueco | Entrega visible de leña | P2 |
| `eco_grain_gain` | Grano vertido en saco o granero | Cosecha o trato importante | P1 |
| `eco_resource_spend` | Saco/atado retirado | Coste importante de grano o madera | P2 |
| `eco_morale_up` | Exhalación colectiva y pequeña celebración, sin voces claras | Fiesta o mejora notable del ánimo | P2 |
| `eco_morale_down` | Murmullo grave muy corto, sin diálogo | Caída notable del ánimo | P2 |
| `eco_faith_up` | Una resonancia de madera/campana muy contenida | Reliquia o hito de fe | P2 |
| `eco_population_arrival` | Pasos que llegan y se detienen | Llega o se queda alguien | P2 |

### 4.4 Lo que el jugador da al valle

La compra usa `ui_action_success` y, encima, un detalle breve del objeto. Así
los diez resultados se reconocen sin fabricar diez fanfarrias completas.

| ID | Detalle del objeto | Acto actual | Prioridad |
|---|---|---|---|
| `world_give_plough` | Madera y hierro apoyados en tierra | Dar el arado | P1 |
| `world_give_pigs` | Dos gruñidos breves y tranquilos | Dar la pocilga y los cerdos | P1 |
| `world_give_ale` | Tapón, barril y líquido corto | Dar el barril | P1 |
| `world_give_axe` | Hacha asentada en un tocón | Dar el hacha buena | P1 |
| `world_give_relic` | Caja pequeña y resonancia sobria | Dar la reliquia | P1 |
| `world_give_hand` | Pasos y hato que se posa | Convencer al forastero para quedarse | P2 |
| `world_give_arms` | Varias piezas de hierro, sin batalla | Dar armas | P2 |
| `world_give_bows` | Madera tensada y carcaj | Dar arcos | P2 |
| `world_give_tower` | Maderos pesados y primer martillazo | Dar la atalaya | P2 |
| `world_give_crown` | Metal pesado sobre madera y breve campana | Coronar a alguien | P1 |

### 4.5 Trabajo, edificios y vida diaria

| ID | Pieza | Disparador/uso | Prioridad |
|---|---|---|---|
| `world_build_start` | Primeros dos martillazos | Empieza una obra | P2 |
| `world_build_wood` | Trabajo de carpintería irregular | Obra de madera visible, a intervalos | P2 |
| `world_build_stone` | Maza y piedra, más grave | Obra o mejora de piedra, a intervalos | P2 |
| `world_build_complete_wood` | Viga asentada y herramientas que paran | Termina edificio de madera | P1 |
| `world_build_complete_stone` | Bloque final y cola sólida | Termina mejora de piedra | P1 |
| `world_wall_closed` | Portón/cerrojo y resonancia amplia | `wall.closed`, hito de peso 3 | P1 |
| `world_gate_open` | Goznes y madera pesada | Portón abre al amanecer | P2 |
| `world_gate_close` | Goznes, madera y tranca | Portón cierra de noche | P2 |
| `world_tree_chop` | Hachazo a distancia | Tala visible, con mucha separación | P2 |
| `world_tree_fall` | Crujido y caída amortiguada | Árbol que desaparece del mapa | P2 |
| `world_harvest` | Hoz y gavilla | Semana de cosecha | P1 |
| `world_mill` | Rueda/muela lenta | Molino en pie y activo | P2 |
| `world_well_bucket` | Polea, cubo y agua | Uso visible del pozo | P2 |
| `world_road_cart` | Ruedas pequeñas y pasos en el camino | Buhonero u oferta con carro | P2 |
| `world_road_horse` | Caballo tranquilo y arreos | Factor u oferta montada | P2 |
| `world_road_livestock` | Pezuñas y ganado conducido | Visita del tratante | P2 |
| `world_road_sack` | Saco pesado depositado | Visita del salinero | P2 |
| `world_birth` | Tela y respiración tranquila, sin llanto estridente | Nacimiento notable | P2 |
| `world_death` | Campana única, baja y distinta del hito | Muerte de persona nombrada | P1 |
| `world_building_lost` | Derrumbe corto de madera o piedra | Edificio arruinado | P1 |

### 4.6 Sucesos que ya existen

No todos necesitan un archivo exclusivo. Se pueden construir combinando
ambientes y efectos base; la columna «receta» evita generar dieciocho escenas
cerradas que luego no puedan mezclarse.

| Suceso del motor | ID o receta audible | Prioridad |
|---|---|---|
| Rayo e incendio | `event_lightning` + trueno + `amb_fire_crackle` | P1 |
| Riada | `event_flood_surge`, agua fuerte de una sola pasada | P1 |
| Lobos en el corral | `event_wolves`, aullido lejano + ganado inquieto | P1 |
| Boda | `event_wedding`, campana y celebración contenida | P2 |
| Buhonero | `ui_offer_arrives` + `world_road_cart` | P2 |
| Buena pesca | `event_good_catch`, agua y cesta | P2 |
| Tejado bajo la nieve | `event_roof_snow`, crujido y descarga de nieve | P2 |
| Fiesta de la cosecha | `event_harvest_feast`, gente lejana y mesa | P2 |
| Riña en la plaza | `event_quarrel`, voces ininteligibles y golpe seco | P2 |
| Oso en el bosque | `event_bear`, resoplido lejano; nunca rugido cinematográfico | P2 |
| Niño perdido | `event_child_lost`, llamada humana lejana sin palabras claras | P2 |
| Forastero que pasa | `eco_population_arrival`, pasos que siguen o se detienen | P2 |
| Fiesta del barril | `world_give_ale` + variante de `event_harvest_feast` | P2 |
| Matanza del cerdo | `event_pig_slaughter`, actividad fuera de plano, sin gore | P2 |
| Ratas en el granero | `event_rats`, correteo y grano movido | P2 |
| Visita del factor | `ui_offer_arrives` + `world_road_horse` | P2 |
| Visita del tratante | `ui_offer_arrives` + `world_road_livestock` | P2 |
| Visita del salinero | `ui_offer_arrives` + `world_road_sack` | P2 |

### 4.7 Hitos, décadas y cambio de fase

| ID | Pieza | Estado/disparador | Prioridad |
|---|---|---|---|
| `stinger_milestone_minor` | Ascenso corto y orgánico | Hito de peso 2 | P1 |
| `stinger_milestone_major` | Versión más abierta, sin fanfarria épica | Hito de peso 3 | **P0** |
| `stinger_decade` | Una marca de tiempo sobria | Década completada | P2 |
| `stinger_century` | Campana y resolución larga | Siglo completado | P2 |
| `stinger_phase_village` | El valle deja de ser caserío | Futuro A4/A5 | P3 |
| `stinger_phase_town` | La aldea pasa a villa de piedra | Futuro A4/A5; verdadero «cambio de era» | **P0 de concepto**, P3 de integración |
| `stinger_new_peak` | Celebración humana muy breve | Nuevo máximo de población cada diez | P2 |
| `stinger_crown_passed` | Corona y campana baja | Sucesión de la corona | P2 |

### 4.8 Amenaza, asedio y final

Esta familia pertenece a la meta y se produce antes de que todas sus escenas
estén implementadas, porque los clips de combate y el audio tardarán más que el
cableado. No se integra hasta que cada disparador exista.

| ID | Pieza | Uso futuro | Prioridad |
|---|---|---|---|
| `raid_warning_distant` | Cuerno muy lejano, una sola llamada | Aviso de hombres sobre la loma | P3 |
| `raid_preparation` | Trancas, pasos y herramientas | Preparativos antes del ataque | P3 |
| `raid_march_approach` | Pasos y equipo de un grupo distante | Bando hostil acercándose | P3 |
| `raid_bow_draw` | Arco tensándose | Aldeano o enemigo apunta | P3 |
| `raid_arrow_release` | Cuerda y salida | Flecha disparada | P3 |
| `raid_arrow_air` | Silbido muy corto y discreto | Flecha cercana a cámara | P3 |
| `raid_arrow_wood` | Impacto en madera | Flecha en portón/empalizada | P3 |
| `raid_arrow_stone` | Impacto seco en piedra | Flecha en muralla | P3 |
| `raid_arrow_body` | Impacto apagado, sin gore | Flecha alcanza cuerpo | P3 |
| `raid_sword_swing` | Barrido corto | Ataque cuerpo a cuerpo | P3 |
| `raid_sword_hit` | Hierro contra hierro/madera | Golpe bloqueado | P3 |
| `raid_shield_hit` | Madera, cuero y metal | Escudo recibe golpe | P3 |
| `raid_body_fall` | Cuerpo y equipo al suelo | Caída física | P3 |
| `raid_gate_hit` | Ariete/golpe pesado, con variantes | Daño al portón | P3 |
| `raid_gate_break` | Tranca, madera y derrumbe | El portón cede | P3 |
| `raid_wall_break` | Piedra y polvo | Se abre una muralla | P3 |
| `raid_fire_start` | Ignición y paja/madera | Casa incendiada durante asalto | P3 |
| `raid_victory` | Resolución breve y cansada, no triunfalista | El valle aguanta | P3 |
| `raid_sacked` | Caída grave y retirada | Saqueo pequeño; la partida continúa | P3 |
| `raid_defeat` | Cierre sobrio, sin música de tráiler | La villa cae | P3 |
| `ending_abandoned` | Viento, puerta y silencio | Final por abandono | P3 |
| `ending_last_death` | Campana sola y ambiente que se vacía | Final por última muerte | P3 |

### 4.9 Música, si se decide usarla

No es necesaria para empezar y puede estropear el carácter de «valle para
mirar de fondo» si está siempre presente. Si se produce, debe vivir en una
regleta separada de ambiente y efectos.

| ID | Pieza | Prioridad |
|---|---|---|
| `music_title` | Tema breve de portada, acústico y sobrio | P3 |
| `music_valley_day` | Capa musical muy escasa, con largos huecos | P3 |
| `music_valley_night` | Variante nocturna aún más desnuda | P3 |
| `music_crossroad` | Tensión tenue sólo mientras se decide | P3 |
| `music_raid` | Pulso de asedio que no tape impactos ni voces | P3 |
| `music_epitaph` | Cierre de partida | P3 |

## 5. Primera tanda recomendada

No se produce toda una categoría. Se generan y validan **uno a uno**, en este
orden:

1. `amb_birds_sparse_day` — ya existe una generación aprobada como dirección;
   descargar, preparar el bucle e introducirla a volumen muy bajo.
2. `ui_panel_open` — primera prueba de la textura sonora de la interfaz; no se
   producen aún las variantes de cierre ni pestaña.
3. `eco_silver_gain` — responde al ejemplo más claro del dueño: conseguir
   monedas, y permite juzgar el lenguaje económico.
4. `ui_action_success` — sólo después de aprobar la navegación; servirá para
   medios y ofertas sin convertir cada toque en una recompensa.
5. `stinger_milestone_major` — reemplaza un acento sintetizado que ya tiene
   disparador real.
6. `stinger_phase_town` — sólo como prueba conceptual del futuro cambio de era;
   se escucha y archiva, pero no se integra antes de A4/A5.

La puerta para pasar al siguiente es siempre la misma: escucharlo aislado,
escucharlo dentro del juego sobre móvil y comprobar que después de diez minutos
no reclama atención. Si falla, se corrige esa pieza; no se lanza el resto de su
familia.

## 6. Qué no hay que producir todavía

- Voces con frases: el texto de la crónica es la voz del juego y no está
  diseñado para doblaje.
- Un sonido por cada incremento semanal de recursos.
- Variantes de combate antes de aprobar un arco, un impacto y una caída base.
- Cuatro mezclas completas de bosque: las estaciones deben salir de capas.
- Una fanfarria de «nivel» separada: hoy duplicaría el hito sin tener mecánica
  propia.
- Gore sonoro explícito: igual que el gore visual de `plan-meta.md` E4, requiere
  decisión del dueño.

## 7. Registro de generaciones

| Fecha | ID del plan | Proveedor/modelo | Trabajo | Coste | Juicio |
|---|---|---|---|---:|---|
| 18 sep 2026 | prueba descartada | Higgsfield / Mirelo | `d249cedb-0628-47d8-8d59-3e7fc89e57d2` | 2 | Demasiado cargada: pájaros, hojas y brisa en una sola toma |
| 18 sep 2026 | `amb_birds_sparse_day` | Higgsfield / Mirelo | `dccda69f-3a48-4185-8bfc-37a1155f735f` | 2 | Dirección aprobada: pájaros escasos, lejanos y con aire |
| 18 sep 2026 | `ui_panel_open` | Higgsfield / Mirelo | `702c3d80-ff92-47a4-9c6d-a85a32eabac6` | 0,5 | Tanteo anterior al prompt canónico; pendiente de escucha, no se toma como patrón |
| 18 sep 2026 | `ui_panel_open` | Higgsfield / Mirelo | `d3daec51-5c35-426a-8d22-84d3d0028087` | 0,5 | Prompt canónico; pendiente de escucha y prueba dentro del juego |
| 18 sep 2026 | `ui_panel_open` | Higgsfield / Mirelo | `41230658-daff-4d8d-b93f-de731eaa790a` | 0,5 | Segundo intento: ataque y presencia de gama media reforzados; pendiente de escucha |
| 18 sep 2026 | `amb_birds_sparse_day` | Higgsfield / Seed Audio 1.0 | `18e505fc-ba53-4a60-8b8f-86117b1f4ca9` | 2,7 | Prompt original, sin cambios; pendiente de escucha |

## 8. Prompts canónicos de producción

### 8.0 Cómo se usan

Los prompts están en inglés porque los modelos de audio describen con más
precisión los materiales, la envolvente y las exclusiones en ese idioma. Cada
prompt final se forma copiando, **en este orden y como un solo párrafo**:

1. la cabecera de su familia;
2. el núcleo exacto de la fila correspondiente;
3. el cierre de esa familia.

Esto no es una abreviatura creativa: la suma de esas tres partes es el prompt
literal que se conserva con el activo. Si un proveedor admite *negative
prompt*, el cierre se coloca ahí; si no, se concatena al prompt positivo.

#### Paleta que manda

La interfaz debe sonar como un juego cuidado, no como foley crudo ni como una
máquina de premios. Sus sonidos combinan dos cosas:

- un gesto orgánico mínimo —papel, fieltro, madera, cuero o metal antiguo—;
- un cuerpo tonal muy leve y redondeado que hace agradable la respuesta en un
  altavoz pequeño.

La navegación cae entre **0,10 y 0,45 s**. Las confirmaciones importantes pueden
llegar a **0,70 s**. Sólo una llamada, un hito o un final conserva cola más larga.
No se pide que todo “suene medieval”: se pide coherencia, suavidad y baja fatiga.

### 8.1 Interfaz y navegación

**Cabecera `UI`:**

> Polished, pleasant game UI sound for a calm stylized medieval village simulation. Clean isolated one-shot for mobile speakers, intimate and understated, with a soft rounded transient and a very subtle warm tonal body.

**Cierre `UI`:**

> No music, no voice, no modern electronic beep, no arcade sparkle, no casino reward, no magical shimmer, no comedy, no exaggerated whoosh, no cinematic impact, no harsh treble, no bass boom, no long reverb, no background ambience, no fade-in, no fade-out.

| ID | Duración objetivo | Núcleo exacto del prompt |
|---|---:|---|
| `ui_title_begin` | 0,55 s | `A gentle beginning gesture: one warm felted wooden pluck with a tiny soft upward resonance, confident but humble, suggesting that a quiet world has just started.` |
| `ui_title_continue` | 0,35 s | `A familiar returning gesture: one low soft wooden tap followed by a barely audible warm lift, lighter and less ceremonial than starting a new game.` |
| `ui_panel_open` | 0,30 s | `A tiny smooth parchment flick layered with one muted felted-wood pluck, slightly rising, crisp enough to confirm that a panel opened but soft enough for frequent use.` |
| `ui_panel_close` | 0,24 s | `The restrained companion to the panel-open sound: a tiny parchment fold with one muted felted-wood pluck falling slightly in pitch, shorter and quieter than opening.` |
| `ui_tab_change` | 0,12 s | `An extremely light dry paper tick with a rounded felt touch, neutral in pitch, almost subliminal and suitable for repeated tab changes.` |
| `ui_chronicle_page` | 0,42 s | `One thin old-paper page turning cleanly from right to left, with a soft fingertip release and no book slam; elegant, close and controlled.` |
| `ui_person_select` | 0,18 s | `A soft fingertip tap on a small parchment portrait card, supported by a quiet warm wooden tick, friendly and personal rather than rewarding.` |
| `ui_pause` | 0,20 s | `A short damped wooden double-touch that settles downward and stops cleanly, conveying rest without sounding negative.` |
| `ui_resume` | 0,24 s | `A short warm wooden double-touch that opens slightly upward, the natural companion to pause, conveying gentle motion returning.` |
| `ui_speed_change` | 0,11 s | `One tiny polished wooden ratchet tick with a soft tonal center; neutral base version designed to be pitch-shifted slightly for the four speed settings.` |
| `ui_action_success` | 0,40 s | `A satisfying but restrained confirmation: one soft wooden mallet pluck followed by a quieter higher pluck, a gentle upward interval with no sparkle and no fanfare.` |
| `ui_action_refused` | 0,28 s | `A polite restrained refusal using the same wooden palette: one soft damped tap and a lower muted after-touch, informative rather than alarming or punishing.` |
| `ui_offer_arrives` | 0,65 s | `A courteous arrival cue: one small muted handbell-like bronze note with a soft leather-and-wood touch underneath, warm and distant, distinct from a church bell.` |
| `ui_offer_accept` | 0,42 s | `A compact agreeable exchange: a soft leather pouch movement, one old coin touch and a warm wooden confirmation pluck, balanced as one pleasant gesture.` |
| `ui_offer_decline` | 0,28 s | `A small parchment card sliding away with a quiet downward felted-wood touch, calm and final without sounding like failure.` |
| `ui_crossroad_opens` | 0,80 s | `A thoughtful decision cue: two sparse warm plucked notes with an unresolved gentle interval, supported by a very soft parchment movement; curious, not ominous.` |
| `ui_crossroad_decide` | 0,45 s | `A firm but elegant decision confirmation: one dry wax-seal press on parchment with a rounded low wooden pluck and a tiny settled resonance.` |

`ui_panel_open` generado el 18 sep se conserva como tanteo, pero el prompt de
esta tabla es el **canónico**: añade el cuerpo tonal agradable que faltaba en la
descripción puramente literal de pergamino y madera. No se vuelve a generar
hasta que el dueño lo pida.

### 8.2 Ambiente continuo

**Cabecera `AMB`:**

> Clean isolated ambience stem for a peaceful stylized medieval valley game. Natural, gentle, spacious and unobtrusive, designed to sit very low in a layered mix for many minutes. Even dynamics, no sudden foreground event, loop-friendly beginning and ending.

**Cierre `AMB`:**

> No music, no speech, no intelligible human words, no cinematic sound design, no dramatic animal call, no close microphone handling, no abrupt loud transient, no artificial reverb, no fade-in, no fade-out. Include only the requested sound family and leave generous acoustic space for other layers.

| ID | Duración objetivo | Núcleo exacto del prompt |
|---|---:|---|
| `amb_birds_sparse_day` | 16 s | `Only two or three small woodland songbirds at a comfortable distance, occasional soft natural chirps with long quiet gaps; calm daytime presence, never a dense chorus.` |
| `amb_river_soft` | 20 s | `Only a shallow slow river passing over small rounded stones, soft continuous water with subtle natural variation, heard from several metres away; no splashes and no waterfall.` |
| `amb_wind_spring` | 20 s | `Only a mild spring breeze moving fresh light leaves and soft grass, airy and delicate, with long smooth movement and no gust strong enough to demand attention.` |
| `amb_wind_summer` | 20 s | `Only a warm dry summer breeze across tall grass and mature leaves, slightly broader and calmer than spring, with very gentle natural movement.` |
| `amb_wind_autumn` | 20 s | `Only a cool autumn breeze through thinning leaves, with rare soft dry-leaf rustles, never a storm and never a pile of leaves scraping close to the microphone.` |
| `amb_wind_winter` | 20 s | `Only clean cold winter air moving across an open valley and bare branches, soft low wind with restrained texture, no blizzard, whistle or threatening gust.` |
| `amb_rain_light` | 20 s | `Only fine steady rain falling on grass, earth and a few distant wooden roofs, soft and even, with no thunder, no wind, no gutter torrent and no close individual drops.` |
| `amb_storm_bed` | 20 s | `Only sustained heavy rain and broad low wind around a valley, controlled and non-cinematic, with no thunder or lightning strike so those can be layered separately.` |
| `amb_snow_hush` | 20 s | `A very quiet snowy outdoor atmosphere: faint cold air, soft distant movement and the natural acoustic dampening of falling snow; almost silent but not digitally empty.` |
| `amb_night_sparse` | 20 s | `Only a sparse mild night layer with a few distant insects and one very occasional small owl far away, large quiet gaps, peaceful rather than mysterious.` |
| `amb_village_murmur` | 20 s | `Only distant gentle village activity: a few soft footsteps, indistinct human presence and rare quiet work movement, with no understandable words, laughter burst, market crowd or individual foreground action.` |
| `amb_livestock_soft` | 20 s | `Only a small medieval farmyard heard from a distance, with rare calm hen, pig and cow sounds separated by silence; no distressed animal, feeding frenzy or dense barn noise.` |
| `amb_forge_work` | 16 s | `Only a small working smithy heard from outside: widely spaced light hammer taps on an anvil and a barely audible hand bellows, irregular and unhurried, no roaring furnace.` |
| `amb_chapel_bell` | 3 s | `One small old bronze chapel bell struck once at a distance, warm imperfect metal tone with a natural modest decay, intimate village scale rather than cathedral scale.` |
| `amb_fire_crackle` | 10 s | `Only a modest wooden-building fire at medium distance, steady dry crackle with occasional small timber pops, no explosion, collapse, voices, wind or dramatic roaring flames.` |

### 8.3 Recursos y economía

**Cabecera `ECO`:**

> Pleasant compact game feedback sound for a calm stylized medieval village simulation. Clean isolated one-shot, tactile and organic, readable on mobile speakers, satisfying without becoming a reward jingle.

**Cierre `ECO`:**

> No music, no voice, no cash register, no modern currency, no arcade coin pickup, no casino sparkle, no magical shimmer, no comedy, no huge pile, no harsh treble, no bass boom, no long reverb, no ambience, no fade-in, no fade-out.

| ID | Duración objetivo | Núcleo exacto del prompt |
|---|---:|---|
| `eco_silver_gain` | 0,48 s | `Two or three small irregular medieval silver coins settling into a leather purse, with soft worn-metal contacts and one restrained warm tonal lift; valuable but humble.` |
| `eco_silver_spend` | 0,36 s | `One slightly heavy worn silver coin leaving a hand and landing softly on a wooden counter, with a short downward tonal body that feels deliberate rather than negative.` |
| `eco_stone_gain` | 0,48 s | `Two small dressed stone pieces placed onto a modest stone pile, dry rounded clacks with a soft earthy body, solid but not heavy or destructive.` |
| `eco_wood_gain` | 0,50 s | `Two short split logs set down together on packed earth, one warm hollow wooden knock and a quiet bark texture, orderly rather than dropped from height.` |
| `eco_grain_gain` | 0,65 s | `A short controlled pour of dry grain into a cloth sack, ending with a soft full rustle and a subtle warm confirmation tone.` |
| `eco_resource_spend` | 0,42 s | `A small tied sack and one light wooden bundle being lifted away from a counter, dry cloth and wood movement with a quiet settled downward tone.` |
| `eco_morale_up` | 0,72 s | `A tiny distant group exhale and two soft pleased human reactions without words, supported by a warm wooden upward interval; intimate, gentle and not celebratory shouting.` |
| `eco_morale_down` | 0,60 s | `A brief distant human hush and one soft low wooden resonance, subdued and compassionate rather than ominous, with no understandable speech.` |
| `eco_faith_up` | 0,80 s | `One quiet old wooden chime and a very soft small bronze overtone rising gently, contemplative and human-scale, never magical or sacred-cinematic.` |
| `eco_population_arrival` | 0,85 s | `A few calm footsteps on earth approaching from a short distance, cloth and a small travel bundle settling, ending in stillness; welcoming but not triumphant.` |

### 8.4 Lo que el jugador da al valle

**Cabecera `GIVE`:**

> Short pleasant diegetic object cue for giving something to a peaceful stylized medieval village. Clean isolated one-shot, close but gentle, natural materials, clear on mobile speakers. This detail will be layered quietly after a separate UI confirmation.

**Cierre `GIVE`:**

> No music, no voice, no reward jingle, no arcade sparkle, no magical effect, no exaggerated impact, no cinematic whoosh, no harsh treble, no long reverb, no background ambience, no fade-in, no fade-out.

| ID | Duración objetivo | Núcleo exacto del prompt |
|---|---:|---|
| `world_give_plough` | 0,70 s | `A small wooden hand plough with a worn iron tip being set carefully onto firm soil, one warm timber contact and a restrained iron touch.` |
| `world_give_pigs` | 0,90 s | `Two calm young pigs arriving beside a simple wooden pen, one soft friendly grunt each and a quiet hoof shuffle, no squeal or distressed animal.` |
| `world_give_ale` | 0,75 s | `A small wooden ale barrel set down gently, a cork settling and one brief liquid slosh inside, warm and convivial without tavern noise.` |
| `world_give_axe` | 0,48 s | `A well-made iron axe placed firmly into a chopping block, one controlled wooden bite with a soft worn-metal tail, useful rather than violent.` |
| `world_give_relic` | 0,80 s | `A small wooden reliquary box placed on cloth and opened, with a faint old bronze resonance, humble and contemplative rather than magical.` |
| `world_give_hand` | 0,90 s | `One traveller taking two final steps, lowering a cloth bundle to the ground and settling beside the village, quiet and human, no speech.` |
| `world_give_arms` | 0,72 s | `A few modest iron spearheads and hand tools wrapped in leather being set on a wooden bench, restrained metal contacts, no sword clash or battle.` |
| `world_give_bows` | 0,65 s | `Two wooden bows and a small leather quiver being placed carefully on a bench, a subtle string tension touch and soft arrow-shaft movement.` |
| `world_give_tower` | 0,80 s | `Two sturdy construction timbers set onto earth followed by one measured wooden mallet strike, suggesting an atalaya beginning without a building montage.` |
| `world_give_crown` | 0,85 s | `A small imperfect old metal crown placed onto folded cloth on a wooden table, one dignified warm bronze resonance, intimate rather than royal-fanfare grand.` |

### 8.5 Trabajo, edificios y vida diaria

**Cabecera `WORLD`:**

> Natural diegetic game sound for a peaceful stylized medieval village viewed from a comfortable distance. Clean isolated sound, soft realistic materials, restrained dynamics, readable on mobile speakers without dominating the ambience.

**Cierre `WORLD`:**

> No music, no narration, no modern machinery, no cinematic impact, no exaggerated bass, no harsh close-mic transient, no artificial reverb, no unrelated ambience, no fade-in, no fade-out.

| ID | Duración objetivo | Núcleo exacto del prompt |
|---|---:|---|
| `world_build_start` | 0,70 s | `Two measured wooden mallet strikes beginning a small timber construction, separated naturally, confident but not loud.` |
| `world_build_wood` | 2,0 s | `A short irregular phrase of quiet hand carpentry: one saw movement, two light mallet taps and a soft timber adjustment, with natural gaps.` |
| `world_build_stone` | 2,0 s | `A short irregular phrase of hand stonework: one modest chisel tap, one heavier dressing tap and small grit settling, controlled and unhurried.` |
| `world_build_complete_wood` | 0,85 s | `A final timber beam settling into place, one firm wooden mallet strike, then tools stopping; warm completion with no collapse or cheer.` |
| `world_build_complete_stone` | 0,95 s | `A final dressed stone block sliding gently into place, one measured mallet tap and a short solid stone resonance; stable and complete.` |
| `world_wall_closed` | 1,30 s | `A heavy wooden village gate closing, a thick timber bar dropping securely into brackets, followed by one broad low natural resonance; important but not cinematic.` |
| `world_gate_open` | 1,10 s | `A large wooden gate opening slowly on old maintained hinges, timber weight and a soft iron hinge movement, no horror creak.` |
| `world_gate_close` | 1,20 s | `A large wooden gate closing under control, timber meeting timber and a firm crossbar settling, secure rather than threatening.` |
| `world_tree_chop` | 0,45 s | `One distant iron axe strike into a mature tree trunk, softened by distance, with a brief wood bite and no falling tree.` |
| `world_tree_fall` | 1,80 s | `A medium tree cracking, leaning and landing on soft forest ground at a distance, natural branches and leaves, no gigantic cinematic crash.` |
| `world_harvest` | 0,95 s | `Several calm hand-scythe cuts through ripe grain followed by one tied sheaf settling, rhythmic but brief and not musical.` |
| `world_mill` | 8 s | `Only a small medieval mill working steadily at medium distance: slow wooden wheel movement, modest axle rhythm and soft grinding stone, loop-friendly and gentle.` |
| `world_well_bucket` | 1,60 s | `A wooden well pulley turning briefly, rope fibre, a small bucket touching water and one restrained splash, close but soft.` |
| `world_road_cart` | 1,60 s | `A small two-wheeled wooden handcart travelling a few metres along a packed-earth road, light wheel rhythm and two calm footsteps, then stopping.` |
| `world_road_horse` | 1,50 s | `One calm horse arriving at walking pace on packed earth, soft hoofbeats and modest leather tack, stopping without neighing.` |
| `world_road_livestock` | 1,70 s | `A very small group of livestock being led slowly along a dirt road, separated hoofsteps and one quiet animal breath, no distressed herd noise.` |
| `world_road_sack` | 0,70 s | `One heavy cloth sack of coarse salt being lowered carefully onto a wooden surface, dense granular shift and a soft fabric landing.` |
| `world_birth` | 1,10 s | `Quiet cloth movement, one relieved adult breath and a very soft newborn breath or tiny murmur, tender and restrained, no sharp crying.` |
| `world_death` | 1,80 s | `One small low village bell struck once, darker and softer than the chapel call, with a modest natural decay and silence around it.` |
| `world_building_lost` | 1,40 s | `A small damaged medieval structure giving way: restrained timber cracks, a little stone and dust settling, serious but not explosive or spectacular.` |

### 8.6 Sucesos existentes

**Cabecera `EVENT`:**

> Short natural event cue for a calm stylized medieval valley simulation. Diegetic, believable and emotionally clear from a distant isometric viewpoint, with restrained dynamics and no soundtrack.

**Cierre `EVENT`:**

> No music, no narration, no intelligible dialogue, no modern object, no trailer sound design, no giant impact, no horror sting, no comedy, no artificial reverb, no unrelated ambience, no fade-in, no fade-out.

| ID | Duración objetivo | Núcleo exacto del prompt |
|---|---:|---|
| `event_lightning` | 0,55 s | `One sharp lightning crack striking a wooden roof at medium distance, bright natural snap and brief timber splinter, leaving thunder and fire for separate layers.` |
| `event_flood_surge` | 2,0 s | `A sudden broad surge of muddy river water crossing shallow ground, carrying a little brush and grain, forceful but human-scale, with no waterfall.` |
| `event_wolves` | 1,80 s | `One distant wolf call answered by a second farther away, followed by brief uneasy farm-animal movement, tense but not horror-like.` |
| `event_wedding` | 1,80 s | `One small village bell, a few distant warm human reactions and hands meeting once in gentle celebration, no words, cheering crowd or music.` |
| `event_good_catch` | 1,10 s | `A small fishing net and wicker basket lifted from shallow river water with several fish moving briefly, modest and fortunate rather than comic.` |
| `event_roof_snow` | 1,50 s | `An old timber roof creaking under weight, then a broad soft sheet of snow sliding off and settling, no building collapse.` |
| `event_harvest_feast` | 2,20 s | `A small distant village gathering around a wooden table: restrained laughter without words, cups and table movement, warm but never a tavern crowd.` |
| `event_quarrel` | 1,40 s | `Two distant adults exchanging a few unintelligible tense vocal sounds, one wooden object knocked once, then abrupt quiet; no clear words or violence.` |
| `event_bear` | 1,60 s | `A real bear moving through brush at medium distance with one low breath and branch movement, wary and natural, no cinematic roar.` |
| `event_child_lost` | 1,60 s | `One distant adult calling softly across open land without intelligible words, followed by a long worried pause; human and restrained, not horror.` |
| `event_pig_slaughter` | 1,20 s | `Off-screen practical farm activity suggested by a wooden gate, quick straw movement and tools being set down, deliberately omitting animal pain, squeal and gore.` |
| `event_rats` | 1,20 s | `Several small rats moving quickly through dry grain and wooden boards inside a granary, subtle claws and grain rustle, no cartoon squeaks.` |

Los sucesos que la tabla de §4.6 define como receta no reciben prompt nuevo:
reutilizan literalmente sus componentes. Buhonero, factor, tratante y salinero
usan `ui_offer_arrives` más `world_road_cart`, `world_road_horse`,
`world_road_livestock` o `world_road_sack`; la fiesta del barril usa
`world_give_ale` y `event_harvest_feast`; el forastero usa
`eco_population_arrival`. Si al montar una receta falta un detalle, se añade
como variante corta de un activo existente, no como escena completa nueva.

### 8.7 Hitos y cambios de fase

**Cabecera `STINGER`:**

> Short pleasant musical game stinger for a calm stylized medieval village simulation. Handmade acoustic timbres, soft felted wood, quiet plucked gut strings and small imperfect bronze when requested. Clear emotional shape in very few notes, warm and memorable on mobile speakers.

**Cierre `STINGER`:**

> No voice, no choir, no full melody, no orchestral fanfare, no heroic brass, no trailer rise, no arcade level-up, no casino reward, no magical sparkle, no modern synthesizer, no heavy drum, no huge reverb, no background ambience, no fade-in, no fade-out.

| ID | Duración objetivo | Núcleo exacto del prompt |
|---|---:|---|
| `stinger_milestone_minor` | 0,85 s | `Three quiet felted wooden and plucked-string notes forming a small gentle upward shape, ending softly without a triumphant resolution.` |
| `stinger_milestone_major` | 1,45 s | `A warm low wooden note, two measured plucked-string notes rising above it, then one small imperfect bronze overtone; important and heartfelt, never grandiose.` |
| `stinger_decade` | 1,10 s | `Two calm low plucked-string notes separated by a breath, followed by one warmer settled note, suggesting time passed and work endured.` |
| `stinger_century` | 2,20 s | `One old medium village bell tone supported by two very quiet low plucked strings, broad and reflective, celebrating endurance rather than victory.` |
| `stinger_phase_village` | 1,55 s | `A soft timber knock becomes a three-note warm acoustic ascent on plucked strings, resolving gently into a modest small-bell overtone: a hamlet has become a village.` |
| `stinger_phase_town` | 2,10 s | `A solid dressed-stone contact, one low plucked-string foundation and a measured four-note acoustic rise ending in restrained bronze: the village has become a walled stone town, dignified but human-scale.` |
| `stinger_new_peak` | 0,95 s | `Two warm human-scale plucked notes and one soft higher wooden note, lightly optimistic, marking growth without sounding like points or a score multiplier.` |
| `stinger_crown_passed` | 1,35 s | `One low wood-and-metal placement sound followed by two calm bronze-and-string notes, solemn but hopeful, suggesting responsibility passing to another person.` |

### 8.8 Amenaza, asedio y final

**Cabecera `RAID`:**

> Natural restrained combat or danger sound for a stylized medieval village simulation viewed from an isometric distance. Clean isolated game asset, believable wood, leather, stone and iron, clear on mobile speakers, serious without spectacle.

**Cierre `RAID`:**

> No music unless explicitly requested, no narration, no intelligible battle cry, no modern weapon, no fantasy magic, no Hollywood trailer impact, no giant army, no exaggerated bass, no gore, no horror, no artificial reverb, no unrelated ambience, no fade-in, no fade-out.

| ID | Duración objetivo | Núcleo exacto del prompt |
|---|---:|---|
| `raid_warning_distant` | 2,20 s | `One imperfect animal-horn warning call from far beyond a ridge, medium-low pitch, human breath and natural valley distance, single phrase only.` |
| `raid_preparation` | 2,20 s | `A short controlled preparation phrase: a timber bar lifted, leather equipment tightened, three hurried but orderly footsteps and one tool set down.` |
| `raid_march_approach` | 3,0 s | `A small group of roughly a dozen people approaching on a dirt road, uneven boots, leather and modest equipment movement, no chanting and no huge army.` |
| `raid_bow_draw` | 0,60 s | `One wooden longbow drawn under controlled tension, subtle wood flex, string strain and leather hand movement, no release.` |
| `raid_arrow_release` | 0,30 s | `One longbow string released with a dry organic snap and a tiny wooden arrow departure, compact and realistic.` |
| `raid_arrow_air` | 0,38 s | `One arrow passing near the listener with a brief natural feathered rush, subtle and fast, no exaggerated whistle.` |
| `raid_arrow_wood` | 0,42 s | `One arrow striking thick old timber, short wooden bite, shaft vibration and quick decay.` |
| `raid_arrow_stone` | 0,35 s | `One arrowhead glancing off dressed stone, small dry stone chip and restrained metal tick, no ricochet spectacle.` |
| `raid_arrow_body` | 0,38 s | `One arrow striking layered cloth and leather with a muted physical impact, restrained and non-graphic, no cry and no gore.` |
| `raid_sword_swing` | 0,34 s | `One short iron sword swing through air, weighty but controlled, no oversized cinematic whoosh.` |
| `raid_sword_hit` | 0,50 s | `One modest iron weapon impact against another iron tool or blade, brief dull ring and hand-held weight, no shower of sparks.` |
| `raid_shield_hit` | 0,52 s | `One weapon strike against a small wooden shield faced with leather and a little iron, solid layered impact with quick decay.` |
| `raid_body_fall` | 0,75 s | `One clothed adult body with light equipment falling onto packed earth, soft weight, leather and one small metal movement, non-graphic.` |
| `raid_gate_hit` | 0,85 s | `One heavy timber impact against a reinforced wooden gate, deep wood strain, iron fittings moving slightly, strong but not explosive; suitable for small pitch and material variations.` |
| `raid_gate_break` | 1,65 s | `A reinforced wooden gate failing after pressure: crossbar crack, several thick boards giving way and iron fittings falling, readable but not a giant cinematic collapse.` |
| `raid_wall_break` | 1,80 s | `A small section of dressed stone wall cracking and collapsing inward, stone chunks and dust settling, village scale rather than castle demolition.` |
| `raid_fire_start` | 1,05 s | `A torch catching dry thatch and timber, quick ignition, several close crackles and fire beginning to hold, no explosion.` |
| `raid_victory` | 2,20 s | `A short exhausted resolution made from low plucked strings, one warm wooden pulse and distant relieved human breath without words; the village endured, no triumphant fanfare.` |
| `raid_sacked` | 2,10 s | `A restrained downward acoustic stinger with two low plucked-string notes, distant departing footsteps and one loose wooden object settling; loss, but life continues.` |
| `raid_defeat` | 2,80 s | `A sparse final acoustic fall: one low string, one old bronze tone losing energy and a final quiet timber creak, grave and human, no trailer boom.` |
| `ending_abandoned` | 3,20 s | `A quiet final scene of one wooden door closing at a distance, a few departing footsteps on earth and cold valley air remaining, no music and no voice.` |
| `ending_last_death` | 3,20 s | `One small low village bell struck once, its natural decay leaving a nearly empty valley atmosphere, compassionate and restrained, no choir or dramatic sting.` |

### 8.9 Música opcional

Estas piezas se generan con un modelo de música, no con el de efectos. Se
mantienen aquí para que el plan esté completo, pero no entran en la primera
tanda.

**Cabecera `MUSIC`:**

> Gentle instrumental game music for a calm stylized medieval English valley simulation. Intimate handmade acoustic ensemble, sparse arrangement, warm natural performance, low listening fatigue, designed to sit behind ambience and remain pleasant during a long idle session.

**Cierre `MUSIC`:**

> No vocals, no choir, no modern drums, no synthesizer, no orchestral trailer style, no heroic brass, no fantasy tavern cliché, no busy melody, no constant percussion, no sudden dynamic jump, no huge reverb. Loop-friendly ending.

| ID | Duración objetivo | Núcleo exacto del prompt |
|---|---:|---|
| `music_title` | 45 s | `A simple welcoming theme on soft plucked gut strings, low wooden flute and occasional bowed drone, four or five memorable notes, reflective and hopeful without sounding grand.` |
| `music_valley_day` | 60 s | `Extremely sparse daytime underscore: quiet plucked strings, rare wooden flute breaths and long open spaces, pastoral but not cheerful wallpaper, with ambience able to remain clearly audible.` |
| `music_valley_night` | 60 s | `An even sparser nocturnal variation using low bowed drone, a few soft plucked notes and large silences, peaceful and safe rather than mysterious or sad.` |
| `music_crossroad` | 40 s | `A restrained unresolved decision bed with low plucked strings, occasional quiet frame-drum heartbeat and open intervals, thoughtful tension without danger or urgency.` |
| `music_raid` | 50 s | `A small tense acoustic pulse from low frame drum, bowed drone and sparse plucked strings, village-scale danger with enough space for arrows, impacts and gates to remain dominant.` |
| `music_epitaph` | 45 s | `A tender closing piece on low plucked strings and one quiet wooden flute, simple descending motif followed by an open final interval, accepting loss without sentimentality.` |
