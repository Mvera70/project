# The Valley — Documento de diseño detallado

**v2.10 · 7 de septiembre de 2026, 19:26 (Europe/Madrid) · Sucede a `valle.md` (v1)**

Simulación idle de una aldea medieval para móvil.

> **Qué es este documento.** `valle.md` decide *qué* juego es. Este decide *cómo*
> se construye, con el detalle necesario para que varios agentes trabajen en
> paralelo sin consultarse entre ellos. Todo lo que aquí se afirma es
> vinculante; lo que no aparece, se decide en el módulo correspondiente y se
> documenta ahí.

---

## Registro de cambios

Este documento es la fuente de verdad del proyecto y cambia. Cada revisión nace
de implementar un módulo y descubrir que la especificación decía algo imposible,
ambiguo o falso — que es exactamente para lo que sirven los briefs. **Toda
entrada dice qué cambió y por qué**: el motivo es lo que evita que alguien lo
revierta dentro de seis meses creyendo que arregla algo.

| Versión | Fecha | Origen | Qué cambió |
|---|---|---|---|
| **2.0** | 6 sep 2026 | Diseño inicial | Documento detallado completo: modelo de dominio, balance verificado sobre 60 semillas × 200 años, 16 encrucijadas, 24 briefs. Única desviación de `valle.md`: mapa transpuesto a 36 × 56. |
| **2.1** | 6 sep 2026 | Revisión de M-01 | Tipo `RngBundle` inválido; alcance real de §12. |
| **2.2** | 6 sep 2026 | Revisión de M-02 | Grafo de dependencias invertido; `Grudge` incorporado; mortalidad no monótona; dos erratas de prosa. |
| **2.3** | 6 sep 2026 | Revisión de M-03 | Edad mínima por rol; rasgos incompatibles; constantes que solo vivían en prosa. |
| **2.4** | 6 sep 2026 | Revisión de M-04 | `leftTick`; edad derivada; `ageEveryone` eliminada; `FOUNDING.GRAIN` a 800. |
| **2.5** | 7 sep 2026, 13:34 | Revisión de M-06 | Orden del tick corregido; un solo escritor del ánimo; punto fijo de la fe roto; muerte inexplicada definida. |
| **2.6** | 7 sep 2026, 13:56 | Revisión de M-05 y M-09 | Componer crónica no consume aleatoriedad; **§9.4 nueva: la muerte de un nombrado**; semillas append-only; crisis de hambruna definida con fórmula. |
| **2.10** | 7 sep 2026, 19:26 | Puerta de M-08c | **Rango a 1–5**: la sucesión es el latido, no ruido; `fillCast` con vuelta atrás; la política `first` no es neutra; trampa de estación documentada. **Puerta superada.** |
| **2.9** | 7 sep 2026, 19:11 | Puerta de M-08b | **Cubrir una vacante no es elegir al mayor**; el diagnóstico del catálogo pasa a dos columnas; `quiet_years` fuera del reparto; deuda del bosque registrada. |
| **2.8** | 7 sep 2026, 18:53 | Revisión de M-08 | **Regla de elegibilidad episódica**; `grudge` mira opiniones; ratio `grainToHarvest`; A.1, A.13 y A.15 corregidas; la cobertura de vacantes tiene dueño. |
| **2.7** | 7 sep 2026, 14:18 | Revisión de M-07 | **La exención del techo se gasta en la primera pregunta**; criterio medible para el ritmo; epitafio con rencores sanados; `TERRAIN_CODE` como contrato de serialización. |

### 2.10 — Puerta de M-08c · superada

- **§12.9 · El rango sube de 1–4 a 1–5, media, y ninguna semilla por encima
  de 7.** El 1–4 lo fijé antes de que existiera el catálogo y era una
  suposición. Medido: la sucesión sola consume un tercio del presupuesto —7 por
  siglo, que es lo que da una tenencia de 13 o 14 años— y **eso es correcto**.
  La muerte del líder es el latido del bucle largo, no ruido que apretar.
  Subir el rango reconoce el presupuesto; sacar la sucesión de la cuenta lo
  habría disimulado.
- **§8.3 · `fillCast` con vuelta atrás.** El hallazgo más fino de la ronda:
  elegir `A` a ciegas y preguntar después quién lo odia acierta una vez de cada
  ocho, así que una plantilla puede cumplir siempre sus `requires` y no repartir
  jamás. Es contenido muerto que **ninguna medición de elegibilidad detecta**,
  porque las condiciones se cumplen perfectamente.
- **§8.2 · Trampa de estación, documentada.** La cosecha es la semana 35 y el
  invierno empieza en la 36: `season = winter` y «granero vacío» están
  anticorrelacionados. El fallo se cometió dos veces —A.1 y A.4— y la segunda
  fue reintroducirlo justo después de arreglar la primera. Las plantillas de
  escasez se apoyan en `grainToHarvest`, nunca en la estación.
- **§12.9 y §14.2 · La política `first` no es neutra: es acomodaticia.** Toma
  siempre la primera opción, que en casi todas las plantillas es la que no paga
  un coste presente. Nunca levanta la empalizada, así que `bandits` no se apaga
  jamás. Toda medición informa dos políticas y la verdad queda entre ellas.
- **§12.9 · La cadencia se medirá otra vez con la fundación real.** El banco
  actual reparte catorce casas y una fragua desde el tick 0, lo que abre desde
  el año 1 las puertas de `people > 30`, `has granary` y `has smithy`. Medir
  contra eso es calibrar contra un valle que no existe.
- **Anexo A.7 · `smith_feud` queda en 45**, comprobado: con 55 no dispara ni una
  vez en 2 000 años de aldea.

### 2.9 — Puerta de M-08b

- **§6.2 · Cubrir una vacante no es elegir al de más edad.** Error de redacción
  mío: «se elige por edad» se leyó como «el mayor», que es una lectura legítima.
  La consecuencia es una cascada: los oficios recaen en ancianos, los ancianos
  mueren pronto, la sucesión se dispara al doble de su ritmo natural —9,55 por
  siglo contra 3,6— y `succession` acaba siendo el 27 % de todas las
  encrucijadas. Ahora es una banda: `ROLE_MIN_AGE` a `ROLE_MAX_PREFERRED` (55),
  gana la mejor opinión media, desempata el más joven. Y un reparto que no se
  renueva tampoco deja ver a nadie envejecer, que es la mitad del bucle largo.
- **§8.1 · El diagnóstico del catálogo pasa a dos columnas.** La lección de la
  ronda: los disparadores episódicos atacaron la elegibilidad —del 70 % al 4 %—
  y **la cadencia apenas se movió**, de 36,4 a 35,4 disparos. Son métricas
  distintas: por debajo de cierta elegibilidad, quien fija el ritmo es el
  reposo. La segunda columna es disparos ÷ máximo que permite el reposo, y por
  encima del 70 % el remedio ya no es endurecer condiciones.
- **Anexo A.15 · `agedBetween` pasa de preferencia a filtro duro**, banda 20–60,
  con ensanche solo si no hay dos candidatos.
- **Anexo A.17 · `quiet_years` está fuera del reparto normal.** §8.6 la define
  como reserva y el Anexo no lo decía con claridad; en la baraja era una de cada
  seis encrucijadas.
- **§12.9 · La cadencia se mide excluyendo las dos plantillas de bosque hasta
  M-15**, con la deuda registrada y su disparador. Ajustar sus reposos ahora
  sería calibrar contra un artefacto: sin M-15 el bosque no mengua y su
  condición está congelada.

### 2.8 — Revisión de M-08

- **§8.1 · Regla de elegibilidad episódica.** El hallazgo de la ronda, y explica
  las cinco anomalías a la vez en vez de parchearlas una a una: **una plantilla
  cuyas condiciones son ambientales dispara siempre que el techo se lo permite.**
  Toda plantilla necesita al menos una condición que sea falsa casi siempre y se
  vuelva cierta por un suceso. Las ambientales dicen quién puede recibir la
  pregunta, no cuándo se hace. Con diagnóstico medible: fracción de ticks
  elegibles por plantilla, por debajo del 1 %.
- **§12.9 · El aserto que manda es 1–4 encrucijadas por generación.** El
  porcentaje pegado al techo es diagnóstico. La medición de M-08 dio 8,9 por
  generación: el doble del máximo, y por eso el catálogo se lee repetitivo.
- **§8.2 · `{k:'grudge', min:N}` mira las opiniones, no el registro.** Un
  `Grudge` no existe hasta cruzar −50, así que `min: 30` y `min: 40` eran
  insatisfacibles y las cuatro plantillas de disputa eran contenido muerto.
- **§8.2 · Nuevo ratio `grainToHarvest`** = `grain / (people · semanas hasta la
  cosecha)`. Es la magnitud que ya define la crisis en §8.6, y es la que las
  plantillas necesitan para preguntar «¿llegamos?».
- **Anexo A.1 · Condición corregida.** Pedía `grainYears < 0.25` en invierno, y
  el invierno empieza en la semana 36, **justo después de la cosecha**: pedía el
  momento más vacío en el momento más lleno. Además `grainYears` está acotado
  por arriba por la capacidad del granero, no por la cosecha. Ahora usa
  `grainToHarvest` y exige invierno avanzado. A.2 dependía de la bandera que
  solo pone A.1 y caía con ella.
- **Anexo A.13 · `strangers_at_the_ford`**: reposo de 10 a 20 años y condición
  episódica `morale ≥ 55`. Disparaba al 89 % de su máximo posible.
- **Anexo A.15 · El reparto de la sucesión prefiere de 25 a 55 años.** Con
  `anyNamed` se encadenaban ancianos: 11 sucesiones por partida contra las 5 que
  corresponden a una generación de 20 años.
- **§6.2 y §17 M-10 · La cobertura de vacantes tiene dueño.** Ningún brief la
  tenía asignada. Sin ella, una aldea que pierde al cura fundador no vuelve a
  tener cura nunca.

### 2.7 — Revisión de M-07

- **§8.6 · La exención del techo se gasta en la primera pregunta.** El fallo de
  la ronda, y era de diseño, no de implementación: §6.6 dice que la sucesión se
  dispara «siempre» al morir el líder y §8.6 que una crisis salta el techo, sin
  decir que la exención es **por episodio y no mientras dure la condición**. Con
  el líder muerto y sin sucesor, la encrucijada se disparaba cada dos ticks para
  siempre — 6 578 veces en 20 partidas. Una hambruna dura meses y un puesto
  vacante dura hasta que alguien lo toma: una exención que valiera todo ese
  tiempo convierte la decisión en un menú.
- **§8.6 · Criterio medible para el ritmo.** Contar encrucijadas por partida no
  basta: lo que importa es qué fracción de los intervalos queda pegada al techo.
  Si manda el reloj, el jugador percibe un metrónomo en vez de un mundo. Umbral:
  40 %, y **subir el techo es el último remedio**, no el primero.
- **§9.4 · El epitafio admite rencores sanados**, con orden de preferencia de
  cuatro escalones. Un arco cerrado es tan buen epitafio como uno abierto: *«They
  had not spoken for seven years, and then they had.»* Y se elige el rencor más
  **antiguo**, no el más hondo.
- **§8.3 · El reparto se resuelve en orden de dependencia**, no de declaración, y
  un ciclo devuelve `null` en vez de colgarse.
- **§3.5 · `TERRAIN_CODE` vive en `state.ts`, no en `balance.ts`.** Es contrato
  de serialización, no perilla: los bytes de toda partida guardada dependen de
  él. Un fichero cuyo propósito es que lo toquen no es sitio para algo que no se
  puede tocar nunca.

### 2.6 — Revisión de M-05 y M-09

- **§9.4 · Nueva sección: la muerte de un nombrado.** El hallazgo de la ronda.
  Al leer la crónica de veinte años se vio que la disputa del año 5, la
  reconciliación del 12 y la muerte del 14 del mismo personaje quedan como tres
  líneas sueltas que ningún lector enlaza: el personaje se muere sin haber
  existido. Ahora la muerte de un nombrado es de peso 3 y arrastra su rencor
  abierto más antiguo o su memoria de mayor peso. Es el mecanismo de las
  semillas de §8.5 aplicado a las personas: **el material narrativo no está en
  los sucesos, está en los enlaces entre sucesos separados por años.**
- **§9.1 · Componer no consume aleatoriedad.** La variante es función pura de
  semilla, clave, tick y un discriminante. Si cada render gastara una tirada,
  desplazar la crónica en pantalla y volver reescribiría la historia de la
  aldea. El flujo `chronicle` es fuente de semilla, no flujo que se avance.
- **§9.1 · La capitalización se resuelve al componer.** El mismo hueco va al
  principio en unas plantillas y a mitad de frase en otras; no se arregla
  escribiendo mejor.
- **§6.4 y §17 M-05 · Las opiniones hacia los muertos no se limpian**, contra lo
  que decía el brief. Que uno no perdonara a un muerto es material narrativo.
- **§3.4 · `DeathCause` enumerada, con `cold`.** Morir de frío se explica tan
  bien como morir de hambre; sin esa causa, esas muertes contarían como presagio
  y la fe caería sin motivo.
- **§3.6 · Las semillas son append-only**, con `firedTick` y `witheredTick`.
  Misma disciplina que `villagers` y `grudges`.
- **§8.6 · Hambruna proyectada, con fórmula.** Estaba en prosa y cada módulo
  habría interpretado una cosa.

### 2.5 — Revisión de M-06

- **§4.2 · `DEATHS` pasa a ser el paso 11 y `MOOD` el 12.** Con el orden
  anterior, las muertes de un tick llegaban al ánimo al tick siguiente y había
  que arrastrarlas en el contexto. Ahora el ánimo ve las muertes de su propio
  tick, y los nacimientos (13) usan un ánimo ya actualizado. Es el momento de
  cambiarlo: no hay partidas guardadas que invalidar.
- **§5.3 · El bono de ánimo de la cosecha sale de aquí.** Estaba escrito en dos
  sitios, §5.3 y §5.5. Con dos escritores, el ánimo se bifurca. Lo aplica el
  paso `MOOD` y nadie más.
- **§12.6 · `FAITH_DEVOUT_PRIEST` de 0.10 a 0.13.** Con 0.10, la deriva
  `(40 − 50)·0.01` lo cancelaba exactamente: cualquier aldea con cura devoto
  congelaba la fe en 50.0 clavado durante décadas. Un equilibrio está bien; un
  equilibrio en un número redondo parece un valor escrito a mano.
- **§5.6 · Definida la «muerte inexplicada».** El término existía en la fórmula
  sin definición: es una muerte entre los 5 y los 59 años por causa natural. Es
  la principal fuente de movimiento de la fe en años tranquilos.
- **§5.6 · La fe no lleva término estocástico**, y queda escrito por qué: en
  este juego lo que cambia en pantalla significa algo.
- **§5.4 · Anotada como cuestión abierta el tope de la madera**, con el criterio
  para decidirla después de M-14 en vez de ahora a ciegas.

### 2.4 — Revisión de M-04

- **§12.2 · `FOUNDING.GRAIN` de 900 a 800.** Con `BASE_STORAGE = 800` la aldea
  nacía por encima de la capacidad y perdía grano a merma desde el primer tick:
  se leía como un fallo. Verificado contra el modelo de calibración — extinción,
  años de extinción y mediana de pico no se mueven.
- **§3.4 · `Villager.leftTick`.** §5.7 hace que se marche gente y §3.4 prohíbe
  borrar a nadie del array; sin el campo, `DeathCause` tendría que mentir.
- **§5.7 · Solo se marchan anónimos.** Un nombrado que desaparece sin una línea
  de crónica es sacar un personaje de la historia sin contarlo, y ese momento
  pertenece al jugador.
- **§6.5 · La edad se deriva; en el borde del año no hay nada que incrementar.**
- **§17 M-04 · `ageEveryone` eliminada.** Era un no-op: la escribí como si la
  edad estuviera almacenada. Una función vacía en un contrato público es una
  invitación a que alguien la «implemente».
- **§17 M-04 · Corregido el test de hambre**, que atribuía a M-04 una extinción
  que provoca el paso 7 (de M-06), y la esperanza de vida, que hay que medir
  sobre la tabla pura o el umbral no se cumple.

### 2.3 — Revisión de M-03

- **§12.4 · `ROLE_MIN_AGE`.** §6.2 pondera por edad en las sucesiones y la
  fundación no: salían comadronas de diecisiete años.
- **§6.3 · `hardy` y `frail` son incompatibles.** Son ×0.7 y ×1.6 sobre la misma
  tasa; tener los dos es incoherente por construcción.
- **§12.2 y §12.4 · `MAX_NAMED`, `AGE_RANGES`, `MIN_FERTILE_WOMEN`.**
  Constantes que el documento usaba en prosa sin fijarlas, obligando a los
  módulos a inventarlas.

### 2.2 — Revisión de M-02

- **§17 M-02 · Grafo de dependencias invertido.** §8 necesita seis tipos de §3 y
  §3 necesita uno solo de §8. `Op` y `Condition` viven en `state.ts`.
- **§3.4 · `Grudge` y `PeopleState.grudges`.** §6.4 decía «con causa registrada»
  y no había dónde guardarla. Almacenado y append-only: una opinión que remonta
  por encima de −50 no borra lo que pasó.
- **§12.6 · `MORALE_GRAVEYARD`**, número citado en §7.2 que §12 no tenía.
- **§17 M-02 · Mortalidad no monótona.** Es una curva de bañera y el 0.060
  infantil es deliberado; el brief pedía monotonía y habría llevado a
  «arreglar» la demografía del juego.
- **§12.2 · Cálculo del margen fundacional explícito.**

### 2.1 — Revisión de M-01

- **§4.3 · `RngBundle`.** `interface` con tipo mapeado no es TypeScript válido.
- **§12 · Excepción declarada:** la tabla de edificios de §7.2 también es
  balance y se transcribe como `BUILDINGS`.
- **§17 M-02 · Alcance ampliado** con los tipos que §3 referencia sin declarar.

---

## 0. Cómo usar este documento

Está pensado para dos lectores distintos.

**Si vas a coordinar:** lee las secciones 1 a 4 y el capítulo 17 (briefs). Ahí
está el reparto y las dependencias.

**Si eres un agente asignado a un módulo:** lee, en este orden,

1. Sección 1 (decisiones cerradas) y sección 2 (convenciones) — obligatorio,
   son cortas.
2. Sección 3 (modelo de dominio) y sección 4 (el tick) — obligatorio, es el
   contrato común.
3. Las secciones de sistema que tu brief cite.
4. **Tu brief** en el capítulo 17. Es la fuente de verdad de tu tarea: define
   qué ficheros tocas, qué API expones, qué tests debes entregar y cuándo has
   terminado.

**Reglas de convivencia entre agentes:**

- No toques ficheros fuera de los que tu brief lista. Si necesitas un cambio en
  un fichero ajeno, escríbelo como nota en el PR, no lo hagas.
- No inventes números. Todos los valores de balance están en la sección 12 y
  viven en `src/engine/balance.ts`. Si necesitas uno que no existe, añádelo a
  ese fichero con un comentario `// TUNE:` y menciónalo en el PR.
- Los nombres de tipos, campos y funciones de la sección 3 y de los contratos de
  cada brief son **literales**. Otro agente está escribiendo código contra
  ellos ahora mismo.
- Todo texto que vea el jugador está en inglés y sale de un banco de plantillas,
  nunca escrito en línea en el código.

---

## 1. Decisiones cerradas

Las de `valle.md` siguen todas en pie. Estas son las que se cierran aquí.

| Decisión | Elegido | Motivo |
|---|---|---|
| Título | **The Valley** | El contenido va en inglés; el título acompaña |
| Idioma del contenido | Inglés (crónica, UI, nombres, topónimos) | Decisión de producto |
| Idioma del código | Inglés (identificadores, ficheros, comentarios) | Convención estándar; evita mezclas |
| Idioma de la documentación | Español | Es donde se piensa el juego |
| Ambientación | Medieval inglés | Nombres anglosajones, señor de Wealdmere |
| Derrota | **Solo población cero** | Nunca se pierde por no abrir la app |
| Presentación de datos | **Diegética primero** | El valle es el HUD; cifras solo al tocar |
| Unidad de simulación | **La semana** | 48 semanas/año; barato de simular siglos |
| Persistencia | IndexedDB, snapshot + registro de decisiones | Determinismo verificable |
| Escala del mapa | **36 × 56**, transpuesto | 56 × 36 no cabe en vertical; mismas 2 016 celdas (§7) |
| Catálogo inicial | 16 plantillas de encrucijada | Suficiente para validar el hito 0 |
| Fuente de letalidad | Las encrucijadas, no el mundo | Principio 2: el jugador es el cuello de botella |

**La última merece explicación.** La simulación base, jugada sin decisiones, es
poco mortal: 3 % de extinción en 200 años. Es deliberado. Si el mundo matara
solo, el jugador sería un espectador y el principio 2 se rompería. Lo que puede
destruir la aldea son las consecuencias de lo que el jugador elige: matanzas,
graneros perdidos antes del invierno, la reputación que corta la llegada de
forasteros. La sección 12.9 fija los objetivos de mortalidad que la suite de
balance verifica.

---

## 2. Convenciones del proyecto

### 2.1 Repositorio

```
the-valley/
├── src/
│   ├── engine/                 # simulación pura. No conoce el DOM.
│   │   ├── rng.ts
│   │   ├── time.ts
│   │   ├── balance.ts          # TODOS los números
│   │   ├── state.ts            # tipos del estado
│   │   ├── sim.ts              # orquestación del tick
│   │   ├── save.ts
│   │   ├── world/              # mapa, edificios, caminos, bosque
│   │   ├── people/             # aldeanos, rasgos, opiniones, demografía
│   │   ├── subsistence/        # trabajo, cosecha, consumo, ánimo, fe
│   │   ├── crossroads/         # esquema, condiciones, catálogo, resolución
│   │   └── chronicle/          # eventos y plantillas de texto
│   ├── render/                 # Canvas 2D. No modifica el estado.
│   ├── ui/                     # DOM, pantallas, controles
│   └── cli/                    # runner de consola (hito 0)
├── tests/
│   ├── fast/                   # segundos
│   └── balance/                # minutos, se lanza aparte
├── tools/                      # capturas Playwright, hojas de contacto
└── public/
```

### 2.2 Nomenclatura

- Ficheros y carpetas: `kebab-case.ts`.
- Tipos e interfaces: `PascalCase`. Funciones y variables: `camelCase`.
- Constantes de balance: `SCREAMING_SNAKE_CASE`, agrupadas en objetos `as const`.
- Identificadores de contenido (plantillas, rasgos, edificios): `snake_case`
  en minúsculas, estables para siempre — se guardan en las partidas.

### 2.3 TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.
- Prohibido `any`. `unknown` + validación en las fronteras (carga de partida).
- El estado del motor es **plano y serializable**: sin clases, sin `Map`, sin
  `Set`, sin referencias circulares. Objetos y arrays, y referencias por `id`.
  Esto no es preferencia estética: es lo que hace que guardar sea `structuredClone`
  y que comparar dos partidas sea un `diff`.

### 2.4 Prohibiciones en `src/engine/`

Un test de arquitectura las verifica leyendo los ficheros:

- `Math.random` — solo `Rng`.
- `Date`, `performance.now` — el tiempo entra como parámetro.
- `document`, `window`, `console` (salvo en `src/cli/`).
- `import` desde `src/render/` o `src/ui/`.

### 2.5 Git

Una rama por módulo: `mod/M-07-crossroad-engine`. El PR cita el identificador
del brief y lista qué criterios de terminado cumple.

---

## 3. Modelo de dominio

Este es el contrato común. Vive en `src/engine/state.ts`.

### 3.1 Estado raíz

```ts
export interface GameState {
  readonly version: number;        // versión del esquema de guardado
  readonly seed: number;           // semilla maestra
  tick: number;                    // semanas desde la fundación
  rng: RngBundle;                  // estados de los flujos aleatorios
  map: ValleyMap;
  village: VillageStats;
  people: PeopleState;
  buildings: Building[];
  works: ConstructionWork[];       // obras en curso
  crossroad: PendingCrossroad | null;
  seeds: PlantedSeed[];            // consecuencias diferidas
  flags: Record<string, number>;   // banderas de estado, valor = tick de expiración (0 = permanente)
  chronicle: ChronicleEntry[];
  history: DecisionRecord[];       // registro de decisiones del jugador
  weather: YearWeather;
  outbreak: Outbreak | null;
  ended: EndState | null;
}
```

### 3.2 Tiempo

```ts
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface Clock {
  tick: number;      // semana absoluta
  week: number;      // 0..47 dentro del año
  year: number;      // 0..N
  season: Season;
  seasonWeek: number; // 0..11
}
```

`weekOf(tick)`, `yearOf(tick)`, `seasonOf(tick)` son funciones puras en
`time.ts`. Nadie recalcula esto a mano.

### 3.3 Estadísticas de aldea

Exactamente cinco. Añadir una sexta requiere modificar este documento.

```ts
export interface VillageStats {
  grain: number;    // unidades. 1 unidad = 1 persona · 1 semana
  wood: number;     // unidades
  morale: number;   // 0..100
  faith: number;    // 0..100
  // 'people' NO se guarda: es people.villagers.filter(alive).length
}
```

### 3.4 Personas

```ts
export type VillagerId = number;

export type Role =
  | 'leader' | 'smith' | 'midwife' | 'priest'
  | 'woodward' | 'reeve' | 'herbalist' | 'stranger';

export type Trait =
  | 'ambitious' | 'devout' | 'spiteful' | 'craven' | 'generous'
  | 'stubborn' | 'cunning' | 'kind' | 'hot_tempered' | 'frail'
  | 'hardy' | 'greedy' | 'loyal' | 'proud' | 'secretive';

export interface Villager {
  id: VillagerId;
  name: string;             // 'Aelric' — solo los nombrados lo tienen no vacío
  named: boolean;
  role: Role | null;
  female: boolean;
  bornTick: number;
  diedTick: number | null;   // causeOfDeath ∈ natural | old_age | hunger |
                             //   cold | plague | fire | violence
  causeOfDeath: DeathCause | null;
  leftTick: number | null;  // se marchó del valle (§5.7); no está muerto
  traits: Trait[];          // 3..4, solo en los nombrados
  homeId: BuildingId | null;
  parentIds: [VillagerId | null, VillagerId | null];
  memories: Memory[];       // solo en los nombrados, máx. 12
  opinions: Record<VillagerId, number>; // -100..100, solo entre nombrados
}

export interface Memory {
  tick: number;
  kind: MemoryKind;         // 'lost_child' | 'was_blamed' | 'was_saved' | ...
  aboutId: VillagerId | null;
  weight: number;           // 1..5, decae con los años
}

export interface Grudge {
  fromId: VillagerId;
  toId: VillagerId;
  cause: MemoryKind;
  causeTick: number;
  formedTick: number;
  healedTick: number | null;
}

export interface PeopleState {
  villagers: Villager[];    // incluye a los muertos; nunca se borra a nadie
  nextId: VillagerId;
  namedIds: VillagerId[];   // vivos y nombrados, máx. 8
  grudges: Grudge[];        // append-only, igual que villagers
}
```

**Por qué no se borra a los muertos.** La crónica los cita cuarenta años
después, y las ruinas de una casa recuerdan quién la levantó. Un array de 400
aldeanos muertos ocupa nada.

**Por qué `leftTick` y no una causa de muerte.** Los que se marchan por §5.7 no
están muertos, y tampoco se pueden borrar del array. Un `diedTick` con una causa
«se fue» haría que la crónica mintiera al citarlos cuarenta años después. Están
vivos, en otra parte; la aldea simplemente ya no los cuenta. Vivo y presente es
`diedTick === null && leftTick === null`.

**Por qué el rencor se almacena y no se deriva.** Un rencor podría leerse de
`opinions` mirando quién está por debajo de −50, pero eso pierde las dos cosas
que lo hacen contable: la causa y el tick en que se formó, que son justo lo que
citan las plantillas de disputa (§8.2 `{k:'grudge'}`, §8.3 `grudgeAgainst`).
`grudges` es **append-only**, con la misma disciplina que `villagers`: un rencor
nunca se borra. Cuando la opinión sube por encima de −20 se le pone
`healedTick`, y ahí queda — la aldea recuerda que un día se odiaron.

### 3.5 El valle

```ts
export type Terrain = 'meadow' | 'forest' | 'water' | 'rock' | 'marsh' | 'cleared';

/** Contrato de serialización. Vive en `state.ts`, NO en `balance.ts`: no es una
 *  perilla. Los bytes de toda partida guardada dependen de estos valores y el
 *  orden no se puede cambiar nunca. */
export const TERRAIN_CODE = {
  meadow: 0, forest: 1, water: 2, rock: 3, marsh: 4, cleared: 5,
} as const;

export interface ValleyMap {
  width: 36;
  height: 56;
  terrain: Uint8Array;      // 36*56, índice = y*36 + x
  traffic: Uint16Array;     // desgaste acumulado por celda
  path: Uint8Array;         // 0 nada, 1 trillado, 2 sendero, 3 calzada
  ruins: Uint8Array;        // 0 nada, 1 ruina; permanente
  forestAge: Uint8Array;    // años desde la tala, para el rebrote
}

export type BuildingId = number;

export type BuildingKind =
  | 'house' | 'field' | 'granary' | 'chapel' | 'smithy'
  | 'well' | 'mill' | 'palisade' | 'wall' | 'church'
  | 'stone_house' | 'watchtower' | 'grave_yard';

export interface Building {
  id: BuildingId;
  kind: BuildingKind;
  x: number; y: number;     // esquina superior izquierda
  w: number; h: number;
  builtTick: number;
  lostTick: number | null;  // si !== null, es una ruina
  tier: 0 | 1;              // 0 madera, 1 piedra
  lit: boolean;             // el taller del herrero se apaga si se enfada
}
```

### 3.6 Encrucijadas y semillas

```ts
export interface PendingCrossroad {
  templateId: string;
  posedTick: number;
  cast: Record<string, VillagerId>;   // 'A' -> 17
  optionIds: string[];
}

export interface PlantedSeed {
  id: string;
  fromTemplateId: string;
  fromOptionId: string;
  plantedTick: number;
  firesAtTick: number;
  cast: Record<string, VillagerId>;
  condition: Condition | null;   // si falla al vencer, la semilla se marchita
  firedTick: number | null;      // append-only: las semillas no se borran
  witheredTick: number | null;   //   nunca, igual que villagers y grudges
}

export interface DecisionRecord {
  tick: number;
  templateId: string;
  optionId: string;
  cast: Record<string, VillagerId>;
}
```

### 3.7 Crónica

```ts
export type ChronicleKind =
  | 'founding' | 'season' | 'birth' | 'death' | 'harvest' | 'famine'
  | 'plague' | 'fire' | 'built' | 'lost' | 'arrival' | 'departure'
  | 'grudge' | 'succession' | 'crossroad_posed' | 'crossroad_taken'
  | 'consequence' | 'extinction';

export interface ChronicleEntry {
  tick: number;
  kind: ChronicleKind;
  templateKey: string;               // clave del banco de textos
  params: Record<string, string | number>;
  weight: 1 | 2 | 3;                 // 3 = titular de generación
}
```

La crónica guarda **claves y parámetros, no prosa**. El texto se compone al
mostrarlo. Así se puede reescribir el banco de textos sin invalidar partidas
guardadas, y traducirlo sin tocar el motor.

---

## 4. El reloj y el tick

### 4.1 Unidades

| Unidad | Equivale a | Tiempo real a ×1 |
|---|---|---|
| Tick | 1 semana | 15 s |
| Estación | 12 ticks | 3 min |
| Año | 48 ticks | 12 min |
| Generación | 20 años = 960 ticks | 4 h |
| Ventana de letargo | — | 4 h |

Velocidades disponibles: **pausa, ×1, ×4, ×16**. A ×16 un año son 45 segundos,
que es lo que hace tolerable revisar una partida larga.

El render tiene su propio reloj cosmético: **cada tick se representa como un día
completo** — amanecer, marcha al campo, regreso, noche. Un tick a ×1 dura 15 s y
ese es el ciclo de la multitud ambiental. No hay ninguna relación entre ese
reloj y la simulación más allá de la duración; el motor no sabe que existe.

### 4.2 Orden de resolución del tick

**Este orden es normativo.** Cambiarlo cambia el balance y rompe el determinismo
de las partidas guardadas.

```
tick(state, decision?) :
   1.  ADVANCE      tick += 1; recalcular reloj
   2.  ANNUAL       si week == 0:  tirar clima del año, comprobar peste,
                    comprobar incendio, migración de primavera, envejecer a todos
   3.  DECISION     si hay decision del jugador, aplicar la opción elegida
                    (efectos inmediatos + plantar semillas)
   4.  SEEDS        disparar las semillas cuyo firesAtTick <= tick
   5.  LABOUR       repartir la mano de obra; producir madera y puntos de obra
   6.  WORKS        avanzar obras; completar las que llegan a su coste
   7.  CONSUME      restar grano; calcular severidad de hambre; muertes por hambre
   8.  WINTER       si es invierno, restar leña; marcar frío si falta
   9.  HARVEST      si week == 35, resolver la cosecha
  10.  STORAGE      aplicar merma sobre el excedente
  11.  DEATHS       mortalidad por edad, con multiplicadores
  12.  MOOD         actualizar ánimo y fe
  13.  BIRTHS       nacimientos
  14.  WORLD        tráfico y caminos; rebrote del bosque; iluminación
  15.  CROSSROAD    si no hay una pendiente, evaluar el catálogo
  16.  CHRONICLE    volcar los eventos acumulados del tick
  17.  END          si no queda nadie vivo, marcar fin de partida
```

Notas obligatorias:

- El paso 7 va **antes** que el 9 a propósito: la semana de la cosecha se come
  primero y se cosecha después. Es lo que hace que un otoño malo se note ya en
  el granero antes del invierno.
- Los pasos 12 y 13 se ejecutan sobre listas fotografiadas al empezar el paso.
  Un recién nacido no puede morir en el mismo tick en el que nace.
- El paso 16 no calcula nada. Los pasos anteriores empujan eventos a un búfer y
  este los vuelca. Ningún sistema escribe texto.

### 4.3 Determinismo y flujos aleatorios

Un único `Math.random` compartido rompería el determinismo en cuanto un sistema
consumiera un número de más. Se usan **flujos independientes**, cada uno con su
propio estado, derivados de la semilla maestra:

```ts
export type RngStream =
  | 'map' | 'weather' | 'births' | 'deaths' | 'plague'
  | 'crossroads' | 'cast' | 'names' | 'chronicle' | 'world';

export type RngBundle = Record<RngStream, number>;  // estado de 32 bits por flujo
```

Algoritmo: **mulberry32**, sembrado con `hash32(masterSeed, streamName)`.
Rápido, sin dependencias, reproducible entre navegadores y Node.

Regla: **un sistema solo consume de su flujo.** Añadir una tirada en el render
o en un log jamás puede desplazar la simulación.

**Test de determinismo (obligatorio, suite rápida):** dos partidas con la misma
semilla y la misma lista de decisiones producen estados idénticos byte a byte
tras 5 000 ticks.

---

## 5. Sistema A — Estaciones y subsistencia

Es el reloj lento y la fuente de presión. Todo lo demás cuelga de aquí.

### 5.1 El año

| Estación | Semanas | Qué pasa |
|---|---|---|
| Spring | 0–11 | Migración; siembra; el bosque rebrota |
| Summer | 12–23 | Riesgo de peste; máxima construcción |
| Autumn | 24–35 | **Cosecha en la semana 35** |
| Winter | 36–47 | Consumo de leña; mortalidad agravada si falta |

### 5.2 Mano de obra

La fuerza de trabajo de la semana:

```
W = (adultos 15–59) · 1.0  +  (12–14 y 60–69) · 0.5
```

Reparto, en este orden:

```
neededFields  = ceil(people · 48 · 1.3 / FIELD_YIELD)
workedFields  = min(fields, neededFields)
farmDemand    = workedFields · FIELD_CREW
farmers       = min(W, farmDemand)
spare         = W − farmers

// reserva de obras: la aldea nunca deja de construir
if spare < W · WORKS_RESERVE:
    borrowed = min(farmers, W · WORKS_RESERVE − spare)
    farmers −= borrowed;  spare += borrowed

cutters  = spare · CUTTER_SHARE
builders = spare − cutters

labourFactor = farmers / (workedFields · FIELD_CREW)     // 0..1
wood        += cutters · WOOD_PER_CUTTER
buildPoints  = builders · BP_PER_BUILDER · (smithy ? 1.20 : 1.00)
```

Tres decisiones dentro de esa fórmula merecen defensa:

**`workedFields` en vez de `fields`.** Una aldea no trabaja más tierra de la que
necesita. Sin este tope, un valle con ocho campos y poca gente diluye su mano de
obra y cosecha peor que con cuatro. Contraintuitivo y frustrante.

**La reserva de obras (15 %).** Sin ella, una aldea justa de gente destina todo
al campo, nunca construye y se queda congelada — y el jugador no ve cambiar
nada, que es el pecado capital de este juego. Con ella, siempre hay obra en
marcha, al precio de una cosecha algo peor.

**El herrero acelera la obra un 20 %.** Es lo que hace que su enfado, que apaga
la fragua, se note en el valle sin necesidad de explicarlo.

### 5.3 Grano

```
demand   = people · GRAIN_PER_PERSON            // 1 por persona y semana
severity = max(0, demand − grain) / demand      // 0..1
grain    = max(0, grain − demand)
```

Si `severity > 0`:

```
starving = people · STARVATION_RATE · severity   // parte fraccionaria por sorteo
```
Mueren los más débiles primero: mayores de 60, luego menores de 5, luego el
resto por sorteo. Además `morale −= 4 · severity` y la mortalidad general se
multiplica por `1 + 2 · severity` en el paso 12.

**Cosecha** (semana 35):

```
yield = workedFields · FIELD_YIELD
      · weatherFactor            // 0.60 .. 1.45, tirado al empezar el año
      · (0.8 + 0.4 · morale/100) // 0.80 .. 1.20
      · labourFactor
      · (mill ? 1.15 : 1.00)
// el bono de ánimo por la cosecha lo aplica el paso MOOD (§5.5), no este.
// Un solo escritor del ánimo, o el ánimo se bifurca.
```

**Almacenamiento:**

```
capacity = BASE_STORAGE + granaries · GRANARY_CAPACITY
if grain > capacity: grain −= (grain − capacity) · SPOILAGE
```

La merma es el freno que impide que una aldea próspera acumule grano infinito y
deje de tener problemas. El granero es la manera de comprarse tranquilidad, y
cuesta madera y obra.

### 5.4 Madera

Producción: `cutters · WOOD_PER_CUTTER`, limitada por el bosque disponible (§7.5).
Consumo: construcción, y calefacción en invierno a `WINTER_WOOD` por persona y
semana. Si la leña se agota en invierno, se marca `cold` y la mortalidad se
multiplica por 1.4 esa semana.

**Cuestión abierta — el tope de la madera.** El grano tiene capacidad y merma;
la madera no tiene ni una cosa ni la otra, así que una aldea sin obras acumula
sin límite. Con los edificios congelados se llega a 5 000 en veinte años. **No se
decide aquí**: hasta M-14 no hay en qué gastarla y hasta M-15 el bosque no
limita la producción. El criterio para decidirlo, después de M-14: si la reserva
acumulada permite levantar más de tres edificios seguidos sin esperar a los
leñadores, la madera necesita tope y merma como el grano; si no, se queda como
está. Ponerle tope antes de saberlo es arriesgarse a asfixiar la construcción.

### 5.5 Ánimo (0–100)

```
morale += (50 − morale) · 0.02                    // deriva al centro
morale −= 4 · severity                            // hambre
morale −= deathsThisTick · 1.5
morale −= max(0, people − housing) · 0.4          // hacinamiento
morale += chapel ? 0.15 : 0
morale += church ? 0.30 : 0
morale += mill   ? 0.05 : 0
morale −= outbreak ? 0.8 : 0
morale += (weatherFactor − 1) · 25                // solo en la semana 35
```

### 5.6 Fe (0–100)

```
faith += (40 − faith) · 0.01
faith += chapel ? 0.20 : 0
faith += church ? 0.35 : 0
faith += priestAlive && priest.traits.includes('devout') ? 0.10 : 0
faith −= priestAlive ? 0 : 0.15
faith −= outbreak ? 0.60 : 0
faith −= unexplainedDeathsThisTick · 0.30
```

**Qué cuenta como muerte inexplicada.** Un fallecimiento de alguien entre 5 y 59
años por causa `natural` — ni hambre, ni peste, ni incendio, ni violencia. Son
las muertes que una aldea medieval lee como señal, y son la principal fuente de
movimiento de la fe en años tranquilos.

**El punto fijo.** La fe es un atractor: sin sucesos se queda quieta en su
equilibrio (25 sin cura, 40 con cura tibio, 53 con cura devoto). Eso es correcto
—la fe se mueve cuando pasan cosas, no porque sí— y por eso **no lleva término
estocástico**: en este juego, algo que cambia en pantalla siempre significa algo.
`FAITH_DEVOUT_PRIEST` vale 0.13 y no 0.10 por un motivo concreto: con 0.10 la
deriva `(40 − 50)·0.01` lo cancelaba exactamente y la fe se congelaba en 50.0
clavado durante décadas, que parece un número escrito a mano.

La fe no da recursos. Hace dos cosas: abre y cierra plantillas de encrucijada, y
pone un suelo al ánimo (`morale` no baja de `faith · 0.25`). Una aldea muy
devota aguanta desgracias que hundirían a una descreída — y por eso el cura es
peligroso.

### 5.7 Migración

Se comprueba una vez al año, en la semana 0.

**Llegada.** Requiere `people ≥ 8`, `morale ≥ 50`, reservas de grano `≥ 0.5`
años, `hostile` sin activar y al menos 2 huecos de vivienda. Probabilidad 0.30;
llegan 2–4 personas, mezcla de adultos jóvenes y niños.

**Marcha.** Si `morale < 30`, con probabilidad `(30 − morale)/60` se van 1–3
personas. **Sólo se van anónimos.** Que un nombrado desaparezca sin una línea
que lo cuente es sacar un personaje de la historia a espaldas del jugador, y ese
momento le pertenece a él: la plantilla A.7 ya lo tiene como resultado de una
decisión, no como una gota de la simulación.

Los forasteros son el motor principal del crecimiento temprano: la biología sola
hace crecer la aldea demasiado despacio para que la primera generación sea
interesante de ver. Y son un buen castigo: una aldea con mala reputación —
bandera `hostile`, que ponen ciertas encrucijadas — deja de crecer sin que muera
nadie.

### 5.8 Peste

Comprobación anual: `p = PLAGUE_BASE + people/2500`, multiplicada por 0.6 si hay
pozo. Duración 6–10 semanas. Durante el brote, cada persona tiene un riesgo
semanal adicional de `PLAGUE_HAZARD_ADULT`, o `PLAGUE_HAZARD_WEAK` si tiene 4
años o menos, o 60 o más.

Un brote típico se lleva entre un cuarto y la mitad de la aldea. Debe sentirse
como una catástrofe, no como un impuesto.

### 5.9 Incendio

Comprobación anual, `p = FIRE_CHANCE`. Destruye un edificio de madera al azar
(`tier === 0`), con preferencia por las casas. Si toca un granero, se pierde
además el 45 % del grano almacenado. `morale −= 6`. El edificio pasa a ruina y
**se ve** — es el suceso más barato del juego en código y de los más visibles.

Los edificios de piedra (`tier === 1`) no arden. Es la recompensa mecánica de la
progresión tardía descrita en `valle.md` §7.

---

## 6. Sistema B — Las personas

### 6.1 Dos poblaciones

**Los anónimos.** Existen como registros con edad, sexo y casa. No tienen
rasgos, ni memoria, ni opiniones. Nacen, envejecen, trabajan de forma agregada y
mueren. Son el 90 % de la aldea y cuestan cuatro campos por cabeza.

**Los nombrados.** Seis al fundarse, hasta ocho. Tienen nombre, rasgos, memoria
y opiniones. Son los únicos que la crónica cita y los únicos que aparecen en las
encrucijadas.

### 6.2 Roles

| Rol | Al fundarse | Cómo aparece después |
|---|---|---|
| `leader` | Sí | Sucesión al morir (§6.6) |
| `smith` | Sí | Un adulto lo hereda si hay fragua |
| `midwife` | Sí | Una adulta lo hereda |
| `priest` | Sí | Solo si hay capilla; si no, el puesto queda vacante |
| `woodward` | Sí | Un adulto lo hereda |
| `reeve` | Sí | Un adulto lo hereda |
| `herbalist` | No | Surge si hay peste y `faith < 60` |
| `stranger` | No | Llega por encrucijada; puede quedarse |

Cuando un rol queda vacante y hay candidato (adulto vivo, sin rol), se cubre en
el paso ANNUAL del año siguiente. **La cobertura de vacantes la ejecuta M-10**
en el paso 2 del tick, llamando a `promoteToNamed` de M-03: ningún otro brief la
tenía asignada, y sin ella una aldea que pierde al cura fundador no vuelve a
tener cura nunca.

**Cómo se elige al candidato — y no es «el mayor».** Se filtran los adultos
entre `ROLE_MIN_AGE` y `ROLE_MAX_PREFERRED` (55); gana el de mejor opinión media
del resto y desempata el más joven. Solo si la banda queda vacía se ensancha
hacia arriba.

Leer «por edad» como «el de más edad» envejece el reparto entero en pocas
décadas: los oficios recaen siempre en ancianos, los ancianos mueren pronto, y
la sucesión —que debería ser el latido de una generación— se dispara al doble de
su ritmo natural. Medido: 9,55 sucesiones por siglo contra las 3,6 que
corresponden a un líder de cuarenta años con la tabla de §12.4. Y un reparto que
no se renueva tampoco deja ver a nadie envejecer, que es la mitad del bucle
largo. Ascender a un anónimo le genera nombre, rasgos y opiniones
neutras: **nace un personaje**, y la crónica lo anuncia.

### 6.3 Rasgos

Cada nombrado tiene 3 o 4 rasgos, sorteados con pesos por rol (un `priest`
tiene alta probabilidad de `devout`, un `leader` de `ambitious` o `proud`). Los
rasgos hacen exactamente tres cosas, ni una más:

1. **Ponderan opciones de encrucijada.** Un `craven` hace que aparezca la opción
   de huir; un `spiteful` hace que la plantilla de venganza tenga más peso.
2. **Modulan la deriva de opiniones.** Un `loyal` perdona; un `spiteful` no.
3. **Modifican un número concreto y documentado.** Sólo estos:

| Rasgo | Efecto mecánico |
|---|---|
| `hardy` | Su mortalidad base ×0.7 |
| `frail` | Su mortalidad base ×1.6 |
| `devout` (cura) | `faith` +0.10/semana |
| `ambitious` (líder) | Obra +5 %; opinión de los demás −0.02/semana |
| `generous` | En hambruna, `morale` −3·severity en vez de −4 |
| `greedy` (reeve) | Merma −2 puntos porcentuales; `morale` −0.03/semana |

Los nueve rasgos restantes son puramente narrativos y de ponderación. **Esto es
intencionado.** Que cada rasgo tenga un número asociado convierte a los
personajes en un árbol de habilidades, que es justo lo que `valle.md` §9
descarta.

**Rasgos mutuamente excluyentes.** `hardy` y `frail` son ×0.7 y ×1.6 sobre la
misma tasa de mortalidad: tenerlos los dos no es un personaje contradictorio,
es un personaje cuyo multiplicador queda en 1.12 sin que nada lo explique.
Ningún nombrado sale con ambos. El sorteo lo garantiza por construcción, no por
un reintento: al elegir uno se retira el otro de la bolsa. La lista de pares
opuestos vive en `traits.ts` como `OPPOSED`; hoy tiene una sola entrada.

### 6.4 Memoria y opiniones

Los nombrados guardan hasta 12 memorias. Cada una tiene peso 1–5 y decae
`−0.02` por año. Al llenarse, se descarta la de menor peso efectivo.

Las opiniones van de −100 a +100 y solo existen entre nombrados. Se mueven por
sucesos:

| Suceso | Cambio |
|---|---|
| Muere un hijo suyo por hambre y el líder eligió esa opción | −35 hacia el líder |
| Fue acusado en público por otro | −30 hacia el acusador |
| Otro le salvó (opción que le favorece) | +25 |
| Convivencia sin incidentes | +0.05/semana, hacia 0 desde los extremos |
| Rasgo `spiteful` | La recuperación hacia 0 se reduce a la mitad |
| Rasgo `loyal` | La recuperación hacia 0 se duplica |

**Rencor (`grudge`).** Cuando una opinión cruza −50 se crea un rencor con causa
registrada. Los rencores son lo que alimenta las plantillas de disputa, y son la
razón por la que dos partidas con los mismos sucesos cuentan historias distintas.

### 6.5 Demografía

**Nacimientos.** Cada mujer viva de 16 a 40 años, por semana:

```
p = BIRTH_BASE · foodFactor · moraleFactor · housingFactor
foodFactor    = clamp(grain / (people · 24), 0, 1.2)
moraleFactor  = 0.6 + 0.8 · morale/100
housingFactor = freeBeds ≥ 3 ? 1.3 : (freeBeds ≥ 1 ? 1.0 : 0.15)
```

El padre se asigna entre los adultos vivos, con preferencia por el que comparte
casa. Si la madre es nombrada, el hijo puede llegar a serlo.

**Muertes.** Probabilidad semanal `= annualRate(age)/48`, multiplicada por:

- `1 + 2 · severity` (hambre)
- `1.4` si `cold` (invierno sin leña)
- riesgo de peste, combinado como `1 − (1−p)(1−hazard)`
- el modificador de rasgo (`hardy`, `frail`)

Tabla de mortalidad anual base en §12.4.

**Envejecimiento.** Todos cumplen años a la vez, en la semana 0. Una simplificación
que ahorra un campo por aldeano y no se nota.

Literalmente ahorra el campo: la edad **se deriva** de `bornTick` en años de
calendario, `yearOf(tick) − yearOf(bornTick)`, y por eso el cumpleaños de todos
cae en la semana 0 y en ninguna otra. **En el borde del año no hay nada que
incrementar**, así que no existe ninguna función de envejecer. Lo que sí ocurre
en la semana 0 —clima, peste, incendio, migración, cobertura de vacantes— es el
paso 2 del tick y vive en `sim.ts`.

### 6.6 Sucesión

Al morir el `leader` se dispara **siempre** la encrucijada `succession`
(§Anexo A.6), saltándose el intervalo mínimo. Es la única plantilla con esa
excepción, y es lo que convierte la muerte del líder en el latido del bucle
largo: cada generación, el jugador elige quién manda, y arrastra los rencores de
quien no fue elegido.

---

## 7. Sistema C — El valle

**36 × 56 celdas = 2 016 celdas.** El valle corre norte-sur y el río baja por él.
Cabe entero en un móvil vertical, sin desplazamiento de cámara.

> **Cambio respecto a `valle.md` §7.** El documento original decía 56 × 36. Con
> 390 px de ancho eso da celdas de 6,9 px, una franja apaisada en mitad de una
> pantalla de 844 px y aldeanos de 10 px: ilegible. Transpuesto son las mismas
> 2 016 celdas —mismo presupuesto de simulación y de figuras— con celda de
> 10–11 px. Todo el arte del capítulo 10 está diseñado para esa cifra.

### 7.1 Generación del mapa

Determinista a partir del flujo `map`. Cinco pasos, en orden:

1. **Base.** Todo `meadow`.
2. **Río.** Entra por el borde norte en `x ∈ [10, 26]` y baja hasta el borde sur
   mediante un paseo aleatorio con sesgo (65 % avanzar, 35 % desviarse), de 2
   celdas de ancho, ensanchando a 3 en el último tercio. Nunca se bifurca. El
   recorrido largo es el eje visual del valle.
3. **Bosque.** Ruido de valor de dos octavas (celdas de 8 y de 4), umbral tal que
   cubra el 20–26 % del mapa. Se sesga hacia las laderas este y oeste y hacia el
   extremo norte: la aldea nace en claro, en el tercio central, y el bosque es lo
   que la encierra.
4. **Roca.** 3–6 afloramientos de 6–14 celdas, preferentemente lejos del río.
5. **Marisma.** Franja de 1–2 celdas junto al río en los tramos de menor
   pendiente. Terreno inservible, valor puramente visual.

**Sitio de fundación.** Se puntúa cada celda candidata por: distancia al río
(óptimo 3–6 celdas), pradera contigua libre en 12×12, distancia al centro del
mapa, y no adyacente a marisma. Gana la de mayor puntuación; empate por índice
menor.

**Test obligatorio:** para 200 semillas, el mapa generado tiene río continuo de
borde a borde, entre el 18 % y el 30 % de bosque, y un sitio de fundación válido.

### 7.2 Edificios

| Edificio | Celdas | Madera | Obra | Efecto | Tope |
|---|---|---|---|---|---|
| `house` | 2×2 | 60 | 40 | +5 de aforo | 16 |
| `field` | 3×2 | 0 | 60 | +600 de cosecha base | 8 |
| `granary` | 2×2 | 120 | 80 | +650 de capacidad | 3 |
| `well` | 1×1 | 40 | 30 | Peste ×0.6 | 1 |
| `chapel` | 2×2 | 150 | 120 | Fe y ánimo; habilita `priest` | 1 |
| `smithy` | 2×2 | 140 | 100 | Obra +20 %; habilita piedra | 1 |
| `mill` | 2×2 | 180 | 140 | Cosecha +15 % | 1 |
| `palisade` | 1×1 | 30 | 20 | Segmento de empalizada | — |
| `grave_yard` | 3×2 | 0 | 25 | Ánimo +0.05; lo abre una encrucijada | 1 |
| `wall` | 1×1 | 0 + 40 piedra | 60 | Mejora de `palisade` | — |
| `stone_house` | 2×2 | 0 + 50 piedra | 70 | Mejora de `house`; no arde | — |
| `church` | 3×3 | 0 + 120 piedra | 200 | Mejora de `chapel` | 1 |
| `watchtower` | 2×2 | 0 + 60 piedra | 90 | Solo por encrucijada | 2 |

La piedra no es un sexto recurso: aparece cuando hay `smithy`, y se produce
consumiendo puntos de obra contra los afloramientos de roca del mapa. Se
contabiliza dentro de `wood` con un factor de conversión, y la interfaz nunca la
nombra por separado.

### 7.3 Prioridad de construcción

La aldea decide sola, siempre en este orden:

1. `field`, si `fields < min(MAX_FIELDS, neededFields)`
2. `house`, si `people > aforo − 2` y `houses < MAX_HOUSES`
3. `granary`, si `granaries < 3` y hay grano por encima del 80 % de la capacidad
4. `well`, si no existe y `people ≥ 25`
5. `chapel`, si no existe, `people ≥ 30` y `faith ≥ 45`
6. `smithy`, si no existe y `people ≥ 35`
7. `mill`, si no existe y `people ≥ 45`
8. `palisade`, si existe `smithy` y la bandera `threatened` está puesta
9. **Mejoras a piedra**, cuando no queda sitio: casas primero, luego empalizada,
   luego capilla

El punto 9 es lo que resuelve el problema de ritmo a largo plazo de `valle.md`
§7. Cuando el mapa se llena, el mismo motor de obras sigue funcionando pero
produce transformación en vez de superficie.

### 7.4 Colocación

Determinista y sin intervención del jugador. Para cada tipo se puntúa cada
posición válida y se elige la mejor; empate por índice menor.

| Tipo | Puntuación |
|---|---|
| `house` | Cerca del centro de masas de las casas; adyacente a camino; no sobre pradera cultivable de primera |
| `field` | Adyacente a otro campo o al río; llano; lejos del bosque |
| `granary` | Junto a los campos y a menos de 6 celdas de una casa |
| `chapel` | Celda alta y visible, algo apartada |
| `smithy` | En el borde del núcleo — el fuego lejos de las casas |
| `well` | Lo más cerca posible del centroide de las casas |
| `palisade` | Envolvente convexa del núcleo, dilatada 2 celdas |

Ninguna colocación puede pisar `water`, `marsh` ni `ruins` de piedra. Las ruinas
de madera **sí** se pueden edificar encima; la ruina desaparece del mapa pero
queda en la crónica.

### 7.5 El bosque

Cada celda de bosque contiene `WOOD_PER_FOREST_TILE` unidades. Los leñadores
consumen de la celda de bosque más cercana al núcleo; al agotarla pasa a
`cleared` y `forestAge` se pone a 0.

Una celda `cleared` con 3 o más vecinas `forest` y sin edificio vuelve a
`forest` a los `FOREST_REGROWTH_YEARS`. El bosque retrocede desde la aldea hacia
fuera, deja un borde irregular y rebrota por detrás si se deja de talar. Con los
números de §12, un valle pierde la mitad de su bosque en unos cien años: visible
sin ser brusco.

### 7.6 Caminos emergentes

Cada tick, para cada aldeano vivo con casa y destino de trabajo, se suma 1 al
`traffic` de las celdas de su trayecto. El trayecto se calcula una vez, con A\*
sobre un coste que penaliza bosque y roca y premia `path`, y se cachea hasta que
cambie el mapa.

```
traffic ≥ PATH_T1  → path = 1 (trillado)
traffic ≥ PATH_T2  → path = 2 (sendero)
traffic ≥ PATH_T3 y hay smithy → path = 3 (calzada)
```

Todo `traffic` decae un 0.5 % por tick. Un camino que deja de usarse se borra
solo, que es exactamente lo que pasa cuando se abandona un campo.

Los caminos no son decoración: reducen el coste de A\*, así que se
autorrefuerzan, y esa realimentación es la que produce la forma orgánica de la
aldea sin que nadie la diseñe.

---

## 8. Sistema D — Encrucijadas

El verbo del jugador y el motor de la variedad. No se escriben una a una: se
generan cruzando los otros tres sistemas.

### 8.1 Esquema de plantilla

```ts
export interface CrossroadTemplate {
  id: string;                  // 'winter_grain_debt'
  category: CrossroadCategory;
  weight: number;              // peso base de selección
  cooldownYears: number;       // no puede repetirse antes
  maxPerGame?: number;
  minYear?: number;
  requires: Condition[];       // TODAS deben cumplirse
  cast: CastSpec[];
  title: string;               // clave del banco de textos
  body: string;                // clave del banco de textos
  options: CrossroadOption[];  // 2 o 3
}

export type CrossroadCategory =
  | 'famine' | 'plague' | 'lord' | 'feud'
  | 'faith' | 'forest' | 'stranger' | 'succession';

export interface CrossroadOption {
  id: string;
  label: string;               // clave: el verbo, 1–3 palabras
  cost: string;                // clave: el precio, visible antes de elegir
  effects: Effect[];
  visible: VisualEffect[];     // OBLIGATORIO, longitud ≥ 1
  seeds: SeedSpec[];
  requires?: Condition[];      // la opción puede no estar disponible
  traitWeight?: Partial<Record<Trait, number>>; // el reparto pondera, no decide
}
```

**`visible` es obligatorio y con al menos un elemento.** Un test recorre el
catálogo y falla si alguna opción no cambia nada en pantalla. Es el principio 1
de `valle.md` convertido en un test que se ejecuta en cada commit.

**Regla de elegibilidad episódica.** Toda plantilla necesita al menos una
condición **episódica**: falsa la mayor parte del tiempo, que se vuelve cierta
por un suceso o al cruzarse un umbral. Las condiciones **ambientales**
—`people ≥ 12`, `has chapel`, `forestLeft > 0.3`— dicen **quién** puede recibir
la pregunta, nunca **cuándo** se hace.

Una plantilla solo con condiciones ambientales dispara siempre que el techo se
lo permite, y con dieciséis plantillas así el jugador percibe un metrónomo.
La aritmética es implacable: para que el intervalo medio ronde los 480 ticks con
un techo de 120, en la inmensa mayoría de los ticks **no puede haber nada
elegible**. Eso solo ocurre si cada plantilla es elegible unas pocas semanas por
siglo.

**Diagnóstico obligatorio del catálogo — dos columnas, no una.**

| Métrica | Qué revela | Remedio |
|---|---|---|
| **% de ticks elegible** | Si la plantilla es ambiental. Por encima del 1 %, lo es. | Darle un disparador episódico |
| **Disparos ÷ máximo que permite su reposo** | Quién marca de verdad el paso. Por encima del 70 %, **manda el reposo, no las condiciones**. | Alargar el reposo |

Las dos columnas hacen falta porque miden cosas distintas y se confunden con
facilidad: una plantilla puede bajar del 70 % de elegibilidad al 4 % y **seguir
disparando lo mismo**, porque a partir de cierto punto el que fija el ritmo es
su reposo. Endurecer condiciones deja de servir en cuanto la elegibilidad cae
por debajo de la tasa que impone el reposo; de ahí en adelante, el reposo es lo
único que queda antes del techo.

### 8.2 DSL de condiciones

Datos, no funciones. Deben ser serializables para poder inspeccionar por qué se
disparó una encrucijada.

```ts
export type Condition =
  | { k: 'stat';    stat: 'grain'|'wood'|'morale'|'faith'|'people'; op: Op; v: number }
  | { k: 'ratio';   ratio: 'grainYears'|'grainToHarvest'|'housingFree'|'forestLeft'; op: Op; v: number }
  | { k: 'season';  season: Season }
  | { k: 'year';    op: Op; v: number }
  | { k: 'has';     building: BuildingKind }
  | { k: 'flag';    flag: string; set: boolean }
  | { k: 'outbreak'; active: boolean }
  | { k: 'role';    role: Role; alive: boolean }
  | { k: 'grudge';  min: number }            // existe una opinión ≤ −N (no el registro)
  | { k: 'trait';   role: Role; trait: Trait }
  | { k: 'not';     c: Condition }
  | { k: 'any';     cs: Condition[] };

export type Op = '<' | '<=' | '>' | '>=' | '==' ;
```

**Trampa de estación: el invierno es el momento MÁS lleno del granero.** La
cosecha cae en la semana 35 y el invierno empieza en la 36, así que `season =
winter` y «granero vacío» están **anticorrelacionados**. Ninguna plantilla de
escasez debe apoyarse en la estación: se apoya en `grainToHarvest`, que es la
magnitud que pregunta si se llega. Este fallo ya se cometió dos veces, en A.1 y
en A.4.

```ts
```

### 8.3 Reparto (`cast`)

Vincula letras a aldeanos concretos. Si un papel no se puede cubrir, la
plantilla no es elegible.

```ts
export type CastSpec =
  | { as: string; role: Role }
  | { as: string; anyNamed: true; excluding?: string[] }
  | { as: string; grudgeAgainst: string }        // el que más le odia
  | { as: string; childOf: string }
  | { as: string; youngestNamed: true; female?: boolean };
```

El reparto se resuelve **en orden de dependencia, no de declaración**: una
plantilla puede escribir `{as:'B', grudgeAgainst:'A'}` antes que `A` sin fallar
en silencio. Un ciclo entre dos letras devuelve `null` — la plantilla no es
elegible— en vez de colgarse.

**Y con vuelta atrás.** Elegir `A` a ciegas y preguntar después quién lo odia
acierta una vez de cada ocho, así que una plantilla puede cumplir sus `requires`
siempre y no repartir jamás: contenido muerto que **ninguna medición de
elegibilidad detecta**, porque las condiciones se cumplen perfectamente.
`fillCast` no puede elegir un vínculo que deje sin cubrir una letra dependiente:
si lo hace, deshace y prueba otro.

### 8.4 Efectos

```ts
export type Effect =
  | { k: 'stat';   stat: StatName; delta: number }
  | { k: 'stat';   stat: StatName; mul: number }
  | { k: 'kill';   who: 'random'|'weakest'|string; count: number | 'fraction'; fraction?: number }
  | { k: 'arrive'; count: number }
  | { k: 'flag';   flag: string; years: number }   // 0 = permanente
  | { k: 'build';  kind: BuildingKind; free: true }
  | { k: 'destroy'; kind: BuildingKind; count: number }
  | { k: 'opinion'; from: string; to: string; delta: number }
  | { k: 'memory'; who: string; kind: MemoryKind; about?: string; weight: number }
  | { k: 'role';   who: string; role: Role | null }
  | { k: 'lit';    kind: BuildingKind; on: boolean };

export type VisualEffect =
  | { k: 'raise';   kind: BuildingKind }
  | { k: 'ruin';    kind: BuildingKind }
  | { k: 'banner';  colour: string; years: number }  // estandarte sobre el núcleo
  | { k: 'douse';   kind: BuildingKind }             // apagar un edificio
  | { k: 'gather';  where: 'square'|'chapel'|'ford'; days: number }
  | { k: 'scar';    what: 'burnt_field'|'grave_row'|'felled_wood' };
```

### 8.5 Semillas — la consecuencia diferida

Es la mitad del diseño. Sin ella una encrucijada es un menú de modificadores;
con ella, es una decisión.

```ts
export interface SeedSpec {
  id: string;
  delayYears: [number, number];   // se sortea dentro del rango
  condition?: Condition;          // si falla al vencer, la semilla se marchita
  effects: Effect[];
  visible: VisualEffect[];
  chronicleKey: string;           // el texto que enlaza con la decisión original
}
```

Al vencer, la entrada de crónica **cita explícitamente la decisión que la
plantó**, con el año. «Thirty-one years after Osric swore to Wealdmere, the
lord's men came for his grandson.» Esa frase es el producto del juego.

Regla: toda plantilla con una opción de beneficio inmediato claro debe plantar
al menos una semilla. La suite de balance lo verifica.

### 8.6 Selección

En el paso 15 del tick, si no hay encrucijada pendiente:

```
if tick − lastCrossroadTick < MIN_TICKS_BETWEEN and not crisis: return
eligible = catalog.filter(t =>
     all(t.requires) and
     cooldown ok and
     maxPerGame ok and
     cast completable)
if eligible is empty: return
score(t) = t.weight
         · crisisMultiplier(t)          // ×4 si su categoría es la crisis activa
         · traitMultiplier(t)           // rasgos del reparto
         · noveltyMultiplier(t)         // ×0.4 si ya salió en esta partida
pick weighted by score, from the 'crossroads' stream
```

**Crisis** = hambruna proyectada —`grain < people · (semanas que faltan hasta la
semana 35)`, es decir, la despensa no llega a la próxima cosecha—, brote activo,
bandera `threatened`, o muerte del líder.

**La exención se gasta en la primera pregunta.** Una crisis y la sucesión se
saltan el techo de 120 ticks, pero **una sola vez por episodio**, no mientras
dure la condición. Una hambruna dura meses y un puesto vacante dura hasta que
alguien lo toma: una exención que valiera todo ese tiempo dispararía la misma
encrucijada cada dos ticks y convertiría la decisión en un menú. §6.6 dice que
la sucesión se dispara «siempre» al morir el líder: **una vez por muerte, no una
vez por tick.**

**Garantía por generación:** si han pasado 960 ticks sin ninguna encrucijada, se
fuerza la de mayor puntuación aunque no sea crisis. Si no hay ninguna elegible
—cosa rara— se usa la plantilla de reserva `quiet_years`, que ofrece al jugador
qué hacer con un excedente.

**Techo:** una cada 120 ticks (30 minutos reales a ×1). Las encrucijadas tienen
que seguir siendo raras o dejan de pesar.

**Cómo se comprueba que el ritmo es sano.** No basta con contar encrucijadas por
partida: hay que mirar **qué fracción de los intervalos queda pegada al techo**.
Si el techo manda casi siempre, el jugador percibe un metrónomo en vez de un
mundo, aunque el total parezca razonable.

| Señal | Diagnóstico | Remedio, en este orden |
|---|---|---|
| La garantía se dispara a menudo | Casi nada resulta elegible | Aflojar condiciones del catálogo |
| **> 40 % de intervalos al ras del techo** | Manda el reloj, no el contenido | Endurecer condiciones; luego subir cooldowns; **subir el techo es el último recurso** |
| < 40 %, y la garantía a cero | Sano | — |

Se mide con el catálogo real de 16 plantillas, sobre 20 semillas × 100 años.

### 8.7 Resolución

Mientras hay una encrucijada pendiente **la simulación no se detiene**. La aldea
sigue comiendo y muriendo. Esto es importante: dudar tiene un precio, y volver
tras cuatro horas para encontrarse la decisión aún abierta y el granero vacío es
una historia, no un error.

La encrucijada no caduca nunca. No se pierde por ausencia (§1).

---

## 9. La crónica

### 9.1 Cómo se compone

Los sistemas empujan `ChronicleEntry` con `templateKey` y `params`. Al mostrar,
`renderEntry` elige una de las 3–5 variantes de esa clave y sustituye los
parámetros.

**Componer no consume aleatoriedad.** La variante es una **función pura** de la
semilla maestra, la clave, el tick y un discriminante que distingue dos entradas
de la misma clave en el mismo tick (su posición en `chronicle` sirve). El flujo
`chronicle` es la fuente de la semilla, no un flujo que se avance: nadie lo
consume nunca. Si cada render gastara una tirada, desplazar la crónica en
pantalla y volver reescribiría la historia de la aldea — y el aislamiento de
§4.3 dejaría de significar nada.

**La capitalización se resuelve al componer**, no escribiendo mejor las
plantillas: el mismo hueco `{count}` va al principio en unas líneas y a mitad de
frase en otras. Si la sustitución cae en la primera posición, se capitaliza.

```ts
// Banco de textos: src/engine/chronicle/bank.en.ts
export const BANK: Record<string, string[]> = {
  'death.old': [
    '{name} died in the {season} of year {year}, {age} winters old.',
    'Age took {name} that {season}. {age} winters.',
    '{name} did not see another {season}. {age} winters, and no debts.',
  ],
  'harvest.poor': [
    'The harvest came in thin. {grain} bushels for {people} mouths.',
    'A poor autumn. The granary took {grain} bushels; the village is {people}.',
  ],
  // ...
};
```

### 9.2 Pesos y filtrado

Cada entrada tiene peso 1–3. La pantalla de crónica muestra por defecto los
pesos 2 y 3; el peso 1 (nacimientos y muertes corrientes, cambio de estación)
aparece al desplegar un año.

El **parte de bienvenida** al volver de una ausencia muestra, como máximo: el
titular de peso 3 más reciente, hasta 4 entradas de peso 2, y un resumen
numérico de lo que cambió (gente, edificios levantados o perdidos).

### 9.3 Regla de escritura

Los textos son cortos, concretos y sin adjetivar. Nombran a la gente, el año y
la cifra. El drama sale del suceso, no de la prosa — si hay que adornar la
frase para que sea interesante, el suceso no lo era y el problema está en el
cruce de sistemas, no aquí (`valle.md` §8).

Prohibido en el banco de textos: signos de exclamación, segunda persona,
metáforas, y cualquier frase que valore la decisión del jugador. La crónica
narra, no juzga.

### 9.4 La muerte de un nombrado

Una muerte corriente es una línea de peso 1. **La de un nombrado es de peso 3**,
y no puede limitarse a decir el nombre y la edad: tiene que cargar con quién fue
esa persona. Al componerla se le añade una subordinada, eligiendo en este orden:

1. Su **rencor abierto más antiguo**. Antiguo, no hondo: una enemistad de treinta
   años dice más de quién fue alguien que una del invierno pasado.
2. Si no tiene ninguno abierto, su **rencor sanado más largo**. Un arco cerrado
   es tan buen epitafio como uno abierto, y da una de las mejores líneas que
   puede escribir este juego: *«They had not spoken for seven years, and then
   they had.»*
3. Si tampoco, su **memoria de mayor peso**.
4. Si no hay nada, la variante desnuda: nombre, estación y edad.

> *Aethelred died in the winter of year 14, sixty-eight winters old. He had not
> spoken to Wulfnoth since the year 5.*

Sin esa segunda frase, los tres momentos que definieron a Aethelred —la disputa
del año 5, la reconciliación del 12 y su muerte en el 14— quedan en la crónica
como tres líneas sueltas que ningún lector enlaza, y el personaje se muere sin
haber existido. Es el mismo mecanismo que las semillas de §8.5 aplicado a las
personas en vez de a las decisiones: **el material narrativo del juego no está
en los sucesos, está en los enlaces entre sucesos separados por años.**

La sucesión que sigue a la muerte de un líder cita también a quién sucede.

### 9.5 Criterio del hito 0

Tres crónicas de tres partidas distintas, leídas por alguien ajeno al proyecto,
que sepa contar en qué se diferencian. **Esto es lo que decide si el proyecto
sigue.**

---

## 10. Render

Canvas 2D. El render **lee** el estado y no lo modifica nunca. Es un test de
arquitectura: `src/render/` no importa nada que mute `GameState`.

### 10.1 Geometría

```
cell = floor(min(viewportW / 36, viewportH / 56))
canvas = 36·cell × 56·cell, centrado, con devicePixelRatio aplicado
```

En un móvil de 390 × 844 CSS px con la interfaz ocupando 180 px de alto:
`min(390/36, 664/56) = min(10.8, 11.9) = 10`. El valle mide 360 × 560 px y deja
284 px para interfaz y áreas seguras. **Todo el arte se diseña para 10 px de
celda** y debe seguir leyéndose a 9. Si algo no se lee
a ese tamaño, no se dibuja.

### 10.2 Capas

Orden de dibujo, sin excepciones:

| # | Capa | Cuándo se redibuja |
|---|---|---|
| 1 | Terreno base | Al cambiar de estación o mutar el mapa. **Cacheada en un canvas aparte.** |
| 2 | Agua animada | Cada fotograma (2 fotogramas de desfase, muy barato) |
| 3 | Caminos | Con la capa 1 |
| 4 | Ruinas | Con la capa 1 |
| 5 | Sombras de edificio | Con la capa 1 |
| 6 | Edificios | Con la capa 1 |
| 7 | Sombras de figura | Cada fotograma |
| 8 | Figuras | Cada fotograma |
| 9 | Meteorología (nieve, lluvia) | Cada fotograma |
| 10 | Tinte de hora | Cada fotograma |
| 11 | Marcadores de interfaz | Al tocar |

Las capas 1 y 3–6 se componen en un **canvas de fondo cacheado** que solo se
regenera cuando cambia la estación o se levanta o se pierde un edificio. El
bucle por fotograma dibuja el fondo cacheado y encima las capas 2, 7–11. Es lo
que permite 80 figuras a 60 fps en un móvil de gama media.

### 10.3 Paletas

Doce colores por estación. La estación se reconoce por el color antes que por
ningún indicador.

| Ranura | Spring | Summer | Autumn | Winter |
|---|---|---|---|---|
| `void` | `#b9c9cf` | `#c9cfc2` | `#cfc4b2` | `#c6ccd2` |
| `meadow` | `#8fae5b` | `#9fb058` | `#a89a55` | `#d9dde0` |
| `meadowAlt` | `#7fa050` | `#8fa14c` | `#98884a` | `#c9ced3` |
| `field` | `#9d9a52` | `#c9a94f` | `#d0b05a` | `#cfd4d6` |
| `forest` | `#4f7a3c` | `#46703a` | `#8a6f33` | `#3d5544` |
| `forestDark` | `#3c6030` | `#35562c` | `#6a5326` | `#2e4235` |
| `water` | `#6fa3bd` | `#6fa8b8` | `#6d97a8` | `#aebfc6` |
| `rock` | `#9a968f` | `#a39e94` | `#a09a90` | `#8e939a` |
| `path` | `#b09a72` | `#bda57b` | `#b79d74` | `#b4b0a6` |
| `wood` | `#8a6a45` | `#8a6a45` | `#83643f` | `#6f563a` |
| `roof` | `#6d5236` | `#6d5236` | `#654c32` | `#55402a` |
| `accent` | `#d9d2c2` | `#efe6cf` | `#e8d9b8` | `#f2f4f6` |

Derivados, calculados y no escritos a mano:

```
outline(c)  = mezcla de c con negro al 45 %
shadow      = rgba(0, 0, 0, 0.22)
```

La transición entre estaciones interpola las doce ranuras a lo largo de las dos
primeras semanas de la estación nueva. Un corte seco de color se lee como un
fallo.

**Test obligatorio:** cada paleta pasa la comprobación de silueta — convertida a
escala de grises, `forest`, `meadow`, `field`, `water` y `path` mantienen entre
sí al menos 8 puntos de luminancia de diferencia. Es la regla «silueta antes que
color» de `valle.md` §6, verificable.

### 10.4 Reglas de estilo, implementadas

- **Sombra.** Todo lo que está de pie proyecta sombra: desplazamiento
  `(+0.30, +0.18)` celdas, color `shadow`. Edificios: el mismo polígono
  desplazado. Figuras: elipse de `0.7 × 0.25` celdas.
- **Contorno.** `lineWidth = max(1, cell · 0.12)`, color `outline(relleno)`.
  Edificios y figuras siempre; terreno nunca.
- **Manchas grandes.** El terreno se compone de regiones, no de celdas: se
  agrupan celdas contiguas del mismo tipo y se dibuja el contorno del grupo con
  una perturbación determinista de ±0.15 celdas en los vértices. Prohibido el
  ruido por celda.
- **Nada de texturas.** Un campo son cinco surcos rectos, no una trama.

### 10.5 Sprites, dibujados por código

Cada uno es una función pura `(ctx, x, y, cell, palette, tier) => void`.

| Sprite | Composición |
|---|---|
| `house` | Cuerpo trapezoidal `1.6×1.1` celdas + techo a dos aguas `1.9×0.9` + puerta oscura de `0.3` |
| `stone_house` | Igual, con `wood` sustituido por gris y una chimenea de `0.25` |
| `field` | Rectángulo con 5 surcos; el color depende de la estación y de si ya se cosechó |
| `granary` | Cuerpo alto y estrecho, sobre 4 pilotes visibles |
| `chapel` | Nave baja + espadaña de `0.5×1.2` con una cruz de dos trazos |
| `church` | Nave larga + torre de `1.0×2.2` |
| `smithy` | Cobertizo abierto + yunque + **resplandor naranja si `lit`** |
| `mill` | Torre + aspas de 4 trazos, girando lentamente si hay viento |
| `well` | Círculo + arco de dos postes |
| `palisade` | Serie de trazos verticales de `0.9` de alto con puntas |
| `wall` | Bloque de `1.0` con almenas cada 2 celdas |
| `villager` | Elipse-cuerpo `0.45×0.8` + círculo-cabeza `0.32`, altura total `1.5` celdas |
| `named` | Igual, altura `1.8`, color propio de la lista de tonos, y un punto de `0.2` sobre la cabeza |
| `ruin` | 2–3 trazos bajos e irregulares en `outline(wood)`, sin sombra |

Los ocho tonos de los nombrados son fijos y se asignan por orden de aparición,
para que un personaje conserve su color toda la partida.

### 10.6 La multitud

Hasta 80 figuras. **No se simulan**: se programan.

Cada aldeano vivo tiene un `anchorHome` y un `anchorWork` (su casa y su campo,
taller o el bosque). El ciclo cosmético del día tiene cuatro tramos:

| Tramo | Fracción del tick | Dónde |
|---|---|---|
| Amanecer | 0.00–0.15 | Saliendo de casa |
| Jornada | 0.15–0.60 | En el destino, con deriva local de ±0.5 celdas |
| Regreso | 0.60–0.80 | Camino de vuelta |
| Noche | 0.80–1.00 | Dentro; no se dibujan, pero la ventana se ilumina |

La posición se interpola sobre el trayecto cacheado de A\* (§7.6) con una
desviación de fase por figura derivada de su `id`, de modo que no salen todas a
la vez. Un domingo de cada cuatro ticks, el destino de todos es la plaza.

Coste: una interpolación y dos primitivas por figura y fotograma. Es
indistinguible de una simulación completa porque nadie mira a un aldeano
concreto durante veinte minutos.

### 10.7 Presupuesto de rendimiento

- 60 fps con 80 figuras y 45 edificios en un móvil de gama media de 2022.
- El fondo cacheado se regenera en menos de 30 ms.
- Un tick del motor, menos de 2 ms con 80 aldeanos. Un siglo, menos de 10 s.

---

## 11. Interfaz

### 11.1 Principio

El valle es el HUD. Por defecto no hay ni una cifra en pantalla. Lo que el
jugador necesita saber lo dice el propio valle:

| Lo que quiere saber | Cómo lo ve |
|---|---|
| Cuánta gente hay | Cuenta figuras, o mira cuántas casas tienen luz |
| Cómo va el grano | El granero se dibuja lleno, a medias o vacío |
| Si hay hambre | Las figuras se mueven más despacio y hay menos en el campo |
| El ánimo | Humo en las chimeneas, y la plaza llena o vacía el domingo |
| La fe | Velas en la capilla |
| Si hay peste | Cruces junto a las puertas; el cementerio crece |
| La estación | El color de todo |

Al tocar cualquier elemento aparece una ficha con **la cifra exacta**. El juego
no esconde datos: los pone a un toque de distancia en vez de a cero.

### 11.2 Pantallas

Cuatro, y solo cuatro.

**1. El valle.** Por defecto. Arriba a la izquierda, el año en números romanos
pequeños. Abajo a la derecha, los controles de velocidad. Nada más.

**2. Ficha.** Se despliega desde abajo al tocar. Para un edificio: qué es, cuándo
se levantó, quién lo usa, la cifra relevante. Para un nombrado: nombre, edad,
rasgos, dos líneas de memoria y sus opiniones fuertes.

**3. Encrucijada.** Ocupa la pantalla entera, se abre con el valle atenuado
detrás. Título, tres o cuatro frases de contexto, y las opciones como bloques
grandes con **el verbo y el precio**, siempre visible el precio. Sin botón de
cerrar: se decide o se vuelve al valle con gesto, y la encrucijada sigue
pendiente con una marca discreta.

**4. Crónica.** Lista desplazable por años. Al abrir tras una ausencia, encabeza
el parte de bienvenida (§9.2).

### 11.3 Gestos

| Gesto | Acción |
|---|---|
| Toque | Abrir ficha |
| Toque fuera | Cerrar ficha |
| Deslizar arriba | Crónica |
| Deslizar abajo | Volver al valle |
| Pellizcar | Zoom de 1× a 2,5×, solo para mirar de cerca. **No hay desplazamiento de cámara a 1×: el mapa cabe entero.** |
| Mantener pulsado | Marcar a un nombrado para seguirlo con un halo |

La lógica de gestos vive en `src/ui/gestures.ts`, sin DOM y con tests, como
exige `valle.md` §11.

### 11.4 Accesibilidad

- Ningún dato depende solo del color: la estación se refuerza con el marco del
  canvas y con el texto de la ficha.
- Objetivos táctiles mínimos de 44 px; las figuras se agrandan al tocar cerca.
- Respeta `prefers-reduced-motion`: sin nieve animada, sin aspas girando, la
  multitud se dibuja quieta en su tramo.

---

## 12. Balance

**Todos los números del juego están aquí, con una excepción declarada.** Este
capítulo se traduce literalmente a `src/engine/balance.ts`. La excepción es la
**tabla de edificios de §7.2** —celdas, madera, obra, efecto y tope—, que
también es balance y vive allí porque se lee junto al resto del sistema del
valle; se transcribe a `balance.ts` como `BUILDINGS` y esa transcripción es la
que consume el motor. Fuera de §12 y de esa tabla no hay ningún número del
juego. Cualquier constante que un módulo necesite y no esté en ninguna de las
dos se añade a `balance.ts` con `// TUNE:` y se menciona en el PR.

Estos valores no son una hipótesis en bruto: salen de simular 60 semillas
durante 200 años cada una y ajustar hasta cumplir los objetivos de §12.9. Siguen
siendo provisionales en el sentido de que la primera partida larga real
(hito 5) manda, pero son un punto de partida jugable, no un relleno.

### 12.1 Tiempo

```ts
export const TIME = {
  WEEKS_PER_SEASON: 12,
  WEEKS_PER_YEAR: 48,
  HARVEST_WEEK: 35,
  GENERATION_YEARS: 20,
  REAL_MS_PER_TICK: 15_000,
  SPEEDS: [0, 1, 4, 16],
  LETHARGY_CAP_MS: 4 * 60 * 60 * 1000,
} as const;
```

### 12.2 Fundación

```ts
export const FOUNDING = {
  POPULATION: 20,          // 6 nombrados + 14 anónimos
  ADULTS: 13, CHILDREN: 5, ELDERS: 2,
  GRAIN: 800,
  WOOD: 200,
  MORALE: 55,
  FAITH: 50,
  HOUSES: 4,
  FIELDS: 2,
} as const;
```

Comprobación, con el cálculo explícito para que nadie lo «arregle» en ninguna
de las dos direcciones:

```
consumo = 20 personas · 48 semanas · 1.0            =   960
cosecha = 2 campos · 600 · 1.00 clima · 1.02 ánimo  = 1 224
margen  = 1 224 / 960                               = 1.275
```

El 1.02 es el factor de ánimo de la fundación: `0.8 + 0.4 · 0.55`, con
`MORALE = 55`. El cociente desnudo, sin ánimo, es `1 200 / 960 = 1.25`, y
**también es correcto**: es el mismo margen visto sin el multiplicador. Los dos
números aparecen en sitios distintos del proyecto y ninguno es una errata.

El margen es, pues, del 27 %, y el arranque de 800 de grano cubre casi un año
entero. La primera hambruna es cuestión de cuándo, no de si.

**`GRAIN` es exactamente `BASE_STORAGE`, y eso es a propósito.** Con 900 la
aldea nacía por encima de su propia capacidad y perdía grano a merma desde el
primer tick, que se lee como un fallo aunque no lo sea. El cambio no mueve la
tasa de extinción, los años de extinción ni la mediana de pico.

### 12.3 Subsistencia

```ts
export const FOOD = {
  GRAIN_PER_PERSON: 1.0,        // por semana
  FIELD_YIELD: 600,             // por campo, cosecha completa
  FIELD_CREW: 4,                // adultos para trabajar un campo entero
  MAX_FIELDS: 8,
  BASE_STORAGE: 800,
  GRANARY_CAPACITY: 650,
  MAX_GRANARIES: 3,
  SPOILAGE: 0.08,               // semanal, sobre el excedente
  STARVATION_RATE: 0.025,       // muertos/semana como fracción, por severidad
  MILL_BONUS: 1.15,
} as const;

export const LABOUR = {
  WOOD_PER_CUTTER: 3.0,         // por semana
  BP_PER_BUILDER: 2.0,          // puntos de obra por semana
  WORKS_RESERVE: 0.15,          // fracción mínima de W dedicada a obras
  CUTTER_SHARE: 0.40,           // del sobrante tras el campo
  SMITHY_BONUS: 1.20,
  WINTER_WOOD: 0.4,             // por persona y semana
  COLD_MORTALITY: 1.4,
} as const;

export const WEATHER = [        // factor, probabilidad
  { f: 0.60, p: 0.15 },   // ruinous
  { f: 0.80, p: 0.20 },   // lean
  { f: 1.00, p: 0.40 },   // fair
  { f: 1.20, p: 0.15 },   // good
  { f: 1.45, p: 0.10 },   // abundant
] as const;
```

### 12.4 Demografía

```ts
export const LIFE = {
  BIRTH_BASE: 0.0038,           // por mujer fértil y semana
  FERTILE: [16, 40],
  ADULT: [15, 59],
  MORTALITY: [                  // anual, por tramo de edad
    { to: 4,   rate: 0.060 },
    { to: 14,  rate: 0.012 },
    { to: 39,  rate: 0.015 },
    { to: 59,  rate: 0.035 },
    { to: 74,  rate: 0.120 },
    { to: 200, rate: 0.300 },
  ],
  HOUSE_CAPACITY: 5,
  MAX_HOUSES: 16,
  HARDY: 0.7, FRAIL: 1.6,
} as const;

export const PEOPLE = {
  MAX_NAMED: 8,                 // §6.1; cuánta gente cabe en la cabeza del jugador
  ROLE_MIN_AGE: {               // edad mínima para tomar el oficio
    leader: 25, midwife: 28, priest: 25,
    smith: 20, woodward: 18, reeve: 22,
  },
  ROLE_MAX_PREFERRED: 55,       // §6.2: por encima, solo si no hay nadie en banda
} as const;

export const MIGRATION = {
  ARRIVE_CHANCE: 0.30,
  ARRIVE_MIN_PEOPLE: 8,
  ARRIVE_MIN_MORALE: 50,
  ARRIVE_MIN_GRAIN_YEARS: 0.5,
  ARRIVE_MIN_FREE_BEDS: 2,
  ARRIVE_COUNT: [2, 4],
  LEAVE_BELOW_MORALE: 30,
  LEAVE_COUNT: [1, 3],
} as const;
```

**Aforo máximo: 80.** 16 casas × 5. Coincide con el tope de figuras del render y
con la escala de `valle.md` §7: no es casualidad, es la misma cifra vista desde
tres sitios.

**`MAX_NAMED` no es una perilla.** Ocho es la decisión de §6.1 sobre cuánta
gente puede el jugador tener en la cabeza a la vez, no un número que se ajuste
buscando una curva. Estaba solo en prosa, que era un fallo del documento.

**`ROLE_MIN_AGE` y la fundación.** §6.2 pondera por edad al cubrir una vacante,
pero no decía nada del reparto fundacional, y sin un suelo salían comadronas de
diecisiete años. Cada oficio va al adulto **de mayor edad** que cumpla su
mínimo; si ninguno lo cumple —raro con trece adultos de 16 a 45, pero no
imposible— va al de más edad disponible antes que quedar vacante. Los oficios se
reparten en orden decreciente de exigencia, de modo que el más difícil de cubrir
elige primero. `herbalist` y `stranger` no tienen suelo: el primero surge de la
necesidad y el segundo llega de fuera.

### 12.5 Desastres

```ts
export const DISASTER = {
  PLAGUE_BASE: 0.014,           // anual; se suma people/2500
  PLAGUE_WELL: 0.6,
  PLAGUE_WEEKS: [6, 10],
  PLAGUE_HAZARD_ADULT: 0.050,   // semanal, durante el brote
  PLAGUE_HAZARD_WEAK: 0.090,    // 0–4 y 60+
  FIRE_CHANCE: 0.035,           // anual
  FIRE_GRAIN_LOSS: 0.45,        // si arde un granero
  FIRE_MORALE: -6,
} as const;
```

### 12.6 Ánimo y fe

```ts
export const MOOD = {
  MORALE_DRIFT_TO: 50,   MORALE_DRIFT: 0.02,
  MORALE_PER_DEATH: -1.5,
  MORALE_HUNGER: -4.0,          // × severidad
  MORALE_CROWDING: -0.4,        // por persona sin cama
  MORALE_CHAPEL: 0.15, MORALE_CHURCH: 0.30, MORALE_MILL: 0.05,
  MORALE_GRAVEYARD: 0.05,       // el efecto que §7.2 da a `grave_yard`
  MORALE_OUTBREAK: -0.8,
  MORALE_HARVEST: 25,           // × (factor de clima − 1)
  FAITH_DRIFT_TO: 40,    FAITH_DRIFT: 0.01,
  FAITH_CHAPEL: 0.20, FAITH_CHURCH: 0.35,
  FAITH_DEVOUT_PRIEST: 0.13,   // 0.10 congelaba la fe en 50.0 exacto (§5.6)
  FAITH_NO_PRIEST: -0.15,
  FAITH_OUTBREAK: -0.60,
  MORALE_FLOOR_FROM_FAITH: 0.25,
} as const;
```

### 12.7 El valle

```ts
export const WORLD = {
  WIDTH: 36, HEIGHT: 56,
  FOREST_TARGET: [0.18, 0.30],
  WOOD_PER_FOREST_TILE: 300,
  FOREST_REGROWTH_YEARS: 8,
  FOREST_REGROWTH_NEIGHBOURS: 3,
  PATH_T1: 400, PATH_T2: 1600, PATH_T3: 6000,
  TRAFFIC_DECAY: 0.005,         // por tick
  STONE_PER_BP: 0.5,            // conversión de obra a piedra con fragua
} as const;
```

### 12.8 Encrucijadas

```ts
export const CROSSROADS = {
  MIN_TICKS_BETWEEN: 120,       // 30 min reales a ×1
  GUARANTEE_TICKS: 960,         // una por generación como mínimo
  CRISIS_MULTIPLIER: 4.0,
  NOVELTY_MULTIPLIER: 0.4,      // si ya salió en esta partida
  DEFAULT_COOLDOWN_YEARS: 25,
} as const;
```

### 12.9 Objetivos que verifica la suite de balance

Estos son los asertos, no los resultados. Se comprueban sobre 60 semillas × 200
años. **Se miden dos políticas, y ninguna es neutra.** `first` toma siempre la
primera opción, que en casi todas las plantillas es la acomodaticia: nunca paga
un coste presente, así que jamás levanta la empalizada ni funda nada, y toda
plantilla cuyo interruptor sea una obra del jugador se queda encendida para
siempre. `last` toma la desafiante. La verdad está entre las dos y por eso se
informan las dos:

| Propiedad | Umbral |
|---|---|
| Extinción con política neutra | 2 % – 12 % |
| Extinción con política adversa (siempre la peor opción) | ≥ 25 % |
| Mediana del pico de población | 65 – 82 |
| Mapa lleno (8 campos, 16 casas) antes del año 120 | ≥ 60 % de las semillas |
| Población visible al final de la primera generación | ≥ 26 en la mediana |
| **Encrucijadas por generación** | **media entre 1 y 5**, y ninguna semilla por encima de 7. Se mide **excluyendo `forest_cut` y `wolf_winter` hasta que exista M-15** (sin bosque que mengüe, `forestLeft` está congelado y sus disparos son artefacto) y **con la fundación real**, no un banco de pruebas que reparta catorce casas y una fragua desde el tick 0. Deuda registrada: volver a medir con las dos plantillas dentro y con la fundación de M-13/M-14 en cuanto estén fusionados. |
| Intervalos pegados al techo | < 40 % — diagnóstico, no objetivo |
| Fracción de ticks elegibles, por plantilla | < 1 % |
| Bosque restante en el año 100 | 40 % – 70 % del inicial |
| Choque del 90 % de bajas en el año 40 → extinción | ≥ 25 % |
| Cualquier estadística fuera de rango o `NaN` | 0 casos |

**El presupuesto de la sucesión.** El rango era 1–4 y estaba mal calibrado: lo
fijé antes de que existiera el catálogo. Medido, la sucesión sola consume un
tercio del total —unas 7 por siglo, que es lo que da una tenencia de 13 o 14
años para un líder elegido a los cuarenta— y **eso es correcto, no un exceso**:
la muerte del líder es el latido del bucle largo, no ruido que apretar. Con 20
encrucijadas por siglo y 7 sucesiones quedan 13 para las otras dieciséis
plantillas, menos de una por plantilla y siglo. El rango sube a 1–5 para
reconocerlo en vez de disimularlo sacando la sucesión de la cuenta.

La segunda fila es la que hace cumplir el principio 4 de `valle.md`: **la aldea
solo muere si el jugador la mata.** Si esa cifra baja del 25 %, las encrucijadas
no tienen dientes suficientes y hay que endurecer sus efectos, no el mundo.

---

## 13. Persistencia y letargo

### 13.1 Formato de guardado

IndexedDB, base `the-valley`, almacén `saves`, clave `current`.

```ts
export interface SaveFile {
  schema: number;              // versión del esquema
  savedAtMs: number;           // reloj de pared, para calcular la ausencia
  state: GameState;            // instantánea completa, autoritativa
  decisions: DecisionRecord[]; // registro paralelo, para depurar y migrar
  archive: ArchivedGame[];     // crónicas de partidas anteriores + sus ruinas
}
```

**Por qué las dos cosas.** La instantánea es la verdad: se carga al instante y
sobrevive a un cambio de balance. El registro de decisiones permite reproducir
la partida desde la semilla para depurar un fallo, comparar dos configuraciones
y migrar una partida si algún día cambia el esquema. Guardar solo el registro
sería elegante y frágil: en cuanto se toque un número de §12, todas las partidas
guardadas divergen.

Se guarda cada 20 ticks y siempre al ocultarse la pestaña
(`visibilitychange`).

### 13.2 Letargo

Al cargar:

```
elapsed = min(now − savedAtMs, LETHARGY_CAP_MS)
ticks   = floor(elapsed / REAL_MS_PER_TICK)      // máx. 960
```

Se ejecutan esos ticks en lotes de 64 dentro de `requestAnimationFrame`, con una
pantalla de progreso que ya muestra el valle dibujándose. 960 ticks tardan menos
de 2 s.

Si había una encrucijada pendiente, **sigue pendiente**: la aldea ha vivido esas
semanas sin decisión, con las consecuencias que eso tenga. No se resuelve sola,
no caduca y no mata (§1).

Al terminar, se abre el **parte de bienvenida** (§9.2).

### 13.3 Herencia entre partidas

Al extinguirse una aldea, la partida se cierra y su crónica completa se archiva
junto con la máscara de sus edificios. La siguiente partida genera un mapa nuevo
con la misma semilla de terreno y **siembra las ruinas de la anterior** en
`map.ruins`.

Las ruinas heredadas no tienen efecto mecánico: no dan recursos, no bloquean la
construcción de madera, no modifican ningún número. Están ahí para verse. Darles
efecto convertiría la derrota en una moneda y la ruina en un recurso, que es
justo lo contrario de lo que buscan los principios 4 y 3.

---

## 14. Pruebas

### 14.1 Suite rápida (`tests/fast/`, segundos)

Se ejecuta en cada commit. Prohibido que tarde más de 20 s.

- **Determinismo.** Misma semilla + mismas decisiones → estado idéntico a los
  5 000 ticks. Se compara un hash del estado serializado.
- **Aislamiento de flujos.** Consumir 1 000 números del flujo `chronicle` no
  cambia el estado de la simulación.
- **Arquitectura.** `src/engine/` no contiene `Math.random`, `Date`, `document`,
  `window`, ni importa de `render/` ni de `ui/`.
- **Invariantes por tick.** Sobre 200 ticks de 5 semillas: `grain ≥ 0`,
  `morale ∈ [0,100]`, `faith ∈ [0,100]`, ningún aldeano con `bornTick > tick`,
  ningún edificio solapado, ningún edificio sobre agua.
- **Catálogo.** Toda opción tiene `visible.length ≥ 1`; toda plantilla tiene 2 o
  3 opciones; todo `templateKey` y toda `cost`/`label` existe en el banco de
  textos; todo `cast` referenciado por efectos y semillas está declarado.
- **Condiciones.** Tabla de casos para cada variante del DSL.
- **Mapa.** 200 semillas: río continuo, bosque en rango, sitio de fundación válido.
- **Gestos y cámara.** Lógica pura, sin DOM.
- **Guardado.** Ida y vuelta: `load(save(state))` es idéntico a `state`.

### 14.2 Suite de balance (`tests/balance/`, minutos)

Se lanza aparte (`npm run test:balance`), en CI nocturna y antes de tocar §12.
Comprueba los umbrales de §12.9. **Nunca se fija un umbral con una sola
semilla**: dos partidas divergen desde el primer tick y una sola es ruido.

Salida: una tabla por consola y un CSV con las series de población, grano, ánimo
y edificios, para poder mirar la forma de las curvas y no solo el aserto.

### 14.3 Capturas (`tools/screenshots.ts`, Playwright)

**Obligatorio desde el primer día que se dibuje algo** (`valle.md` §12).

Genera una hoja de contacto en `artifacts/`: el mismo valle en las cuatro
estaciones, en los años 1, 20, 60 y 120, a resolución de móvil real; más una
versión en escala de grises de cada una para verificar la regla de silueta.

Regla de trabajo: **ningún cambio visual se da por terminado sin mirar la hoja de
contacto.** Los fallos que este juego no puede permitirse —una estación con el
color equivocado, figuras ilegibles a tamaño real— no los detecta ningún aserto.

---

## 15. Hitos

| | Hito | Criterio de salida | Módulos |
|---|---|---|---|
| **0** | Crónica sin gráficos | Tres crónicas distinguibles por un tercero | M-00 … M-12 |
| **1** | Valle visible | Se ve la aldea y las estaciones; sin jugador | M-13 … M-19 |
| **2** | Encrucijadas | Una decisión que cambia el valle de forma visible | M-20 … M-22 |
| **3** | Generaciones | Envejecen, mueren, heredan; la aldea recuerda | M-04, M-05, M-06 ampliados |
| **4** | Fracaso y herencia | Una aldea puede extinguirse; quedan ruinas | Esbozado, §16.1 |
| **5** | Idle | Tiempo real, letargo, parte de bienvenida | Esbozado, §16.2 |
| **6** | Guardado | Persistencia; primera partida real de varios días | M-23 |

### 15.1 El hito 0 en detalle

Es el que puede matar el proyecto, y ese es su propósito.

**Entregable:** `npm run chronicle -- --seed 7 --years 60 --policy first`
escribe por consola la crónica de sesenta años de una aldea. Sin valle, sin
dibujo, sin interfaz.

**Qué debe incluir ya:** personas con nombre y rasgos, opiniones y rencores,
demografía completa, subsistencia con estaciones, las 16 plantillas de
encrucijada con su reparto y sus semillas, y el banco de textos.

**Qué no debe incluir:** nada del capítulo 7 salvo el conteo de edificios como
números, nada del 10, nada del 11.

**Criterio de aceptación:** tres crónicas de tres semillas distintas, leídas por
alguien ajeno al proyecto, que sepa contar en qué se diferencian. Si la
respuesta es «se parecen mucho», el problema está en el cruce de sistemas y hay
que arreglarlo antes de dibujar un solo píxel.

---

## 16. Hitos 4 a 6 — esbozo

No se detallan por decisión consciente: dependen de cómo se sienta el juego, y
especificarlos ahora sería inventar. Se fija solo lo que otros módulos necesitan
saber para no cerrarles la puerta.

### 16.1 Hito 4 — Fracaso y herencia

Contrato que el resto del código debe respetar desde ya:

- `GameState.ended: EndState | null` existe desde el principio y el bucle lo
  comprueba en el paso 17.
- `SaveFile.archive` existe desde el principio, aunque esté vacío.
- `ValleyMap.ruins` se rellena y se dibuja desde el hito 1, aunque solo lo use
  el incendio.

Queda por decidir: la pantalla de epitafio, si la crónica archivada se puede
releer entera, y cuántas partidas se conservan.

### 16.2 Hito 5 — Idle

El contrato de §13.2 es firme. Queda por decidir, y **solo se puede resolver
jugando**: los tiempos de §12.1. La estación de 3 minutos y la generación de 4
horas son una hipótesis razonada, no un dato. El ajuste se hace con la primera
partida larga en la mano y consiste en cambiar `REAL_MS_PER_TICK` y nada más —
por eso el motor cuenta en ticks y no en minutos.

### 16.3 Hito 6 — Guardado

Especificado en §13.1. Queda por decidir la política de migración cuando cambie
`schema`, que depende de si para entonces hay partidas de gente real.

---

## 17. Briefs por módulo

Cada brief es autocontenido. Un agente que lea las secciones 1–4 y su brief
tiene todo lo necesario. Las dependencias indican qué debe estar fusionado
antes de empezar.

**Formato de cada brief:** Objetivo · Depende de · Ficheros · Contrato · Reglas ·
Tests · Terminado cuando.

---

### M-00 · Andamiaje

**Objetivo.** Repositorio que compila, prueba y arranca.
**Depende de.** Nada.
**Ficheros.** `package.json`, `tsconfig.json`, `vite.config.ts`,
`vitest.config.ts`, `playwright.config.ts`, `.editorconfig`, `eslint.config.js`,
`index.html`, `src/main.ts`, la estructura de carpetas de §2.1 con un
`.gitkeep` en cada una.
**Contrato.** Scripts: `dev`, `build`, `test` (suite rápida), `test:balance`,
`chronicle`, `shots`, `lint`, `typecheck`.
**Reglas.** `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.
ESLint prohíbe `any` y los identificadores prohibidos de §2.4 dentro de
`src/engine/`.
**Tests.** Un test trivial que pase, para verificar la tubería.
**Terminado cuando.** `npm ci && npm run typecheck && npm test && npm run build`
pasa en limpio.

---

### M-01 · Aleatoriedad y tiempo

**Objetivo.** Los cimientos deterministas.
**Depende de.** M-00.
**Ficheros.** `src/engine/rng.ts`, `src/engine/time.ts`.
**Contrato.**
```ts
export function hash32(seed: number, stream: string): number;
export function makeBundle(seed: number): RngBundle;
export function next(b: RngBundle, s: RngStream): number;        // [0,1)
export function int(b: RngBundle, s: RngStream, a: number, z: number): number; // [a,z]
export function pick<T>(b: RngBundle, s: RngStream, xs: readonly T[]): T;
export function weighted<T>(b, s, xs: readonly T[], w: (x: T) => number): T;
export function clockOf(tick: number): Clock;
export function seasonOf(tick: number): Season;
export function yearOf(tick: number): number;
```
**Reglas.** mulberry32. `next` muta el estado del flujo dentro del bundle. Ningún
otro módulo implementa aleatoriedad.
**Tests.** Reproducibilidad entre ejecuciones; distribución uniforme razonable a
100 000 muestras; independencia de flujos; `clockOf` en los bordes de estación y
de año.
**Terminado cuando.** Los tests pasan y `weighted` maneja pesos cero sin dividir
por cero.

---

### M-02 · Tipos de estado y balance

**Objetivo.** El contrato común, escrito una vez.
**Depende de.** M-01.
**Ficheros.** `src/engine/state.ts`, `src/engine/balance.ts`,
`src/engine/crossroads/schema.ts`.
**Contrato.** Todos los tipos de §3, literalmente. Todas las constantes de §12,
literalmente, como objetos `as const`, más la tabla de edificios de §7.2 como
`BUILDINGS`. Los tipos de §8.1, §8.3, §8.4 y §8.5 van en `schema.ts`: son
declaraciones puras y `state.ts` necesita el DSL para `PlantedSeed`. M-07
escribe sólo la lógica en el resto de esa carpeta.
**Reglas.** Sin lógica: solo tipos y datos. Ni una función.

**Grafo de dependencias, obligatorio y acíclico:**

```
rng.ts, balance.ts        hojas, no importan nada
state.ts                  -> rng.ts
crossroads/schema.ts      -> state.ts
time.ts                   -> state.ts, balance.ts
```

`Op` y `Condition` (§8.2) viven en `state.ts`, no en `schema.ts`, y la flecha va
de `schema` a `state` y no al revés. La razón es de conteo: §8 necesita seis
tipos de §3 —`Season`, `Role`, `Trait`, `BuildingKind`, `StatName`,
`MemoryKind`— y §3 necesita uno solo de §8, `Condition`, para `PlantedSeed`. Con
`Condition` en `state.ts` el grafo queda acíclico; en la dirección contraria los
dos ficheros se importarían entre sí. Con `verbatimModuleSyntax` un ciclo de
`import type` compila sin quejarse, así que no se notaría hasta que lo hubieran
heredado cinco módulos: hay un test que guarda el grafo.

**Tests.** Un test que compruebe la coherencia interna de §12: aforo máximo
(`MAX_HOUSES · HOUSE_CAPACITY`) igual a 80; probabilidades de `WEATHER` sumando
1; y sobre `MORTALITY`, tramos de edad estrictamente crecientes que cubren de 0
a 200 sin hueco ni solape, con tasas crecientes **a partir del segundo tramo**.
La curva es de bañera, no una rampa: el `0.060` infantil es deliberado y está
por encima del `0.012` que le sigue. Exigir monotonía desde el primer tramo era
una errata de este brief, no de §12.4.
**Terminado cuando.** El resto de módulos puede importar de aquí sin
dependencias circulares.

---

### M-03 · Nombres, aldeanos y rasgos

**Objetivo.** Crear gente.
**Depende de.** M-02.
**Ficheros.** `src/engine/people/names.ts`, `traits.ts`, `villagers.ts`.
**Contrato.**
```ts
export function makeName(b: RngBundle, female: boolean, used: Set<string>): string;
export function rollTraits(b: RngBundle, role: Role | null): Trait[];
export function makeVillager(...): Villager;
export function foundPeople(b: RngBundle, tick: number): PeopleState;
export function promoteToNamed(state: GameState, id: VillagerId, role: Role): void;
```
**Reglas.** Bancos de nombres del Anexo B, anglosajones. Ningún nombre se repite
entre vivos. Pesos de rasgo por rol según §6.3. Los anónimos tienen `traits: []`,
`memories: []`, `opinions: {}`.
**Tests.** `foundPeople` produce exactamente `FOUNDING.POPULATION` con el
reparto de edades de §12.2 y los 6 roles fundacionales; sin nombres repetidos en
1 000 semillas; los rasgos siempre son 3 o 4 y sin duplicados.
**Terminado cuando.** Dos semillas distintas dan reparto claramente distinto.

---

### M-04 · Demografía

**Objetivo.** Nacer, envejecer, morir.
**Depende de.** M-03.
**Ficheros.** `src/engine/people/demography.ts`.
**Contrato.**
```ts
export function resolveDeaths(state: GameState, ctx: TickContext): DeathEvent[];
export function resolveBirths(state: GameState, ctx: TickContext): BirthEvent[];
export function resolveMigration(state: GameState): MigrationEvent[];
export function workforce(state: GameState): number;
export function population(state: GameState): number;
```
**Reglas.** Fórmulas de §6.5 y §5.7 exactas. `TickContext` transporta `severity`,
`cold` y el brote activo; la demografía no los calcula. Las listas se fotografían
al empezar: un recién nacido no muere en su mismo tick.

**No hay `ageEveryone`.** La edad se deriva de `bornTick` (§6.5), así que en el
borde del año no hay ningún campo que incrementar y la función sería un no-op en
el contrato público del módulo de personas. Lo que sí pasa en la semana 0 es el
paso 2 del tick y vive en `sim.ts` (M-10).

**Tests.** Una aldea de 20 personas sin hambre ni peste crece; con `severity = 1`
sostenido deja de reproducirse por completo y encoge —la extinción la produce el
paso 7 del tick, `STARVATION_RATE`, que es de M-06 y se asevera allí—; la
esperanza de vida al nacer cae entre 28 y 38 años sobre 20 000 aldeanos
simulados con la tabla **pura**, sin hambre ni frío ni brote, porque medida
dentro de una partida con hambre baja de 28 y el test fallaría sin que nada
estuviera mal; en torno a dos de cada tres llegan a los 15; la migración respeta
todas sus puertas.
**Terminado cuando.** Los tests pasan sobre al menos 10 semillas.

---

### M-05 · Memoria, opiniones y rencores

**Objetivo.** Que los nombrados tengan pasado.
**Depende de.** M-03.
**Ficheros.** `src/engine/people/opinions.ts`, `memories.ts`.
**Contrato.**
```ts
export function remember(v: Villager, m: Memory): void;
export function decayMemories(state: GameState): void;
export function adjustOpinion(state, from: VillagerId, to: VillagerId, d: number): void;
export function driftOpinions(state: GameState): void;
export function grudges(state: GameState, min?: number): Grudge[];
export function worstEnemyOf(state: GameState, id: VillagerId): VillagerId | null;
```
**Reglas.** Tabla de §6.4 exacta. Máximo 12 memorias, se descarta la de menor
peso efectivo. `spiteful` y `loyal` modulan la recuperación. Las opiniones solo
existen entre nombrados. **No se limpian al morir alguien**: que uno no
perdonara a un muerto es material narrativo, y con ocho nombrados vivos el coste
de guardarlo es cero. `driftOpinions` sí se salta a los muertos en ambos
sentidos — un muerto no cambia de opinión, ni sobre él se ablanda nadie solo con
el tiempo.
**Tests.** Una opinión llevada a −60 crea rencor con causa; sin sucesos nuevos,
un `loyal` vuelve a 0 en la mitad de tiempo que un `spiteful`; la memoria nunca
supera 12 entradas.
**Terminado cuando.** `grudges()` devuelve resultados estables y deterministas.

---

### M-06 · Subsistencia

**Objetivo.** El reloj lento: trabajo, grano, madera, ánimo, fe.
**Depende de.** M-02, M-04.
**Ficheros.** `src/engine/subsistence/labour.ts`, `harvest.ts`, `consumption.ts`,
`mood.ts`, `seasons.ts`.
**Contrato.**
```ts
export function allocateLabour(state: GameState): Allocation;
export function produce(state: GameState, a: Allocation): void;    // madera + puntos de obra
export function consume(state: GameState): { severity: number; starved: VillagerId[] };
export function overwinter(state: GameState): { cold: boolean };
export function harvest(state: GameState, a: Allocation): HarvestResult;
export function updateMood(state: GameState, ctx: TickContext): void;
export function rollWeather(state: GameState): YearWeather;
```
**Reglas.** Fórmulas de §5 exactas, incluida la reserva de obras del 15 % y el
tope de `workedFields`. `consume` va antes que `harvest` en el tick.
**Tests.** La aldea fundacional con clima 1.0 termina el año 1 con grano
positivo; con clima 0.60 dos años seguidos, entra en hambruna; la reserva de
obras nunca baja de `W · 0.15`; el ánimo y la fe se mantienen en `[0,100]` en
50 000 ticks; el suelo de ánimo por fe se respeta.
**Terminado cuando.** Se reproduce la curva de referencia de §12.9 en
combinación con M-04.

---

### M-07 · Motor de encrucijadas

**Objetivo.** Evaluar, elegir, repartir, resolver, plantar.
**Depende de.** M-05, M-06.
**Ficheros.** `src/engine/crossroads/schema.ts`, `conditions.ts`, `cast.ts`,
`select.ts`, `resolve.ts`, `seeds.ts`.
**Contrato.**
```ts
export function evaluate(c: Condition, state: GameState): boolean;
export function fillCast(t: CrossroadTemplate, state): Record<string, VillagerId> | null;
export function eligible(state: GameState): ScoredTemplate[];
export function selectCrossroad(state: GameState): PendingCrossroad | null;
export function applyOption(state: GameState, optionId: string): AppliedEffects;
export function fireSeeds(state: GameState): FiredSeed[];
```
**Reglas.** Todo el DSL de §8.2. La selección usa el flujo `crossroads`, el
reparto el flujo `cast`. Multiplicadores de crisis, novedad y rasgo según §8.6.
Garantía por generación y techo de 120 ticks. `applyOption` planta las semillas
y registra en `history`.
**Tests.** Tabla de casos por cada variante de `Condition`; una plantilla con
reparto imposible nunca es elegible; el techo se respeta salvo en crisis; la
garantía dispara a los 960 ticks exactos; una semilla plantada con retraso
[3,5] vence dentro de esa ventana; una semilla cuya condición falla se marchita
sin efectos y deja constancia.
**Terminado cuando.** Con el catálogo de M-08, 20 semillas × 100 años producen
entre 5 y 20 encrucijadas cada una, sin repeticiones adyacentes.

---

### M-08 · Catálogo de encrucijadas

**Objetivo.** Las 16 plantillas del Anexo A, como datos.
**Depende de.** M-07.
**Ficheros.** `src/engine/crossroads/catalog/*.ts` (una por categoría),
`catalog/index.ts`.
**Contrato.** `export const CATALOG: readonly CrossroadTemplate[]`.
**Reglas.** Transcripción literal del Anexo A. Sin lógica, sin funciones: datos
puros. Toda clave de texto debe existir en el banco de M-09.
**Tests.** Los del catálogo listados en §14.1; además, cada categoría tiene al
menos una plantilla elegible en algún estado alcanzable — se verifica ejecutando
30 semillas × 150 años y comprobando que ninguna plantilla queda a cero apariciones.
**Terminado cuando.** El test de cobertura del catálogo pasa.

---

### M-09 · Crónica

**Objetivo.** Registrar y componer el texto.
**Depende de.** M-02.
**Ficheros.** `src/engine/chronicle/events.ts`, `bank.en.ts`, `render.ts`,
`digest.ts`.
**Contrato.**
```ts
export function record(state: GameState, e: Omit<ChronicleEntry,'tick'>): void;
export function renderEntry(e: ChronicleEntry, b: RngBundle): string;
export function renderYear(state: GameState, year: number, minWeight?: 1|2|3): string[];
export function welcomeDigest(state: GameState, sinceTick: number): Digest;
```
**Reglas.** El banco del Anexo B, 3–5 variantes por clave. Prohibiciones de
§9.3. Ningún otro módulo escribe texto: empujan claves y parámetros.
**Tests.** Toda clave usada por el catálogo existe en el banco; toda clave del
banco tiene al menos 3 variantes; ningún texto contiene `!`, ` you `, ` your `;
todos los parámetros de una plantilla se sustituyen (no quedan `{}` sin
resolver) sobre 5 000 entradas generadas.
**Terminado cuando.** `renderYear` de una partida de 60 años se lee de corrido.

---

### M-10 · Orquestación y runner de consola

**Objetivo.** El tick completo y el entregable del hito 0.
**Depende de.** M-04, M-06, M-07, M-08, M-09.
**Ficheros.** `src/engine/sim.ts`, `src/engine/found.ts`, `src/cli/chronicle.ts`.
**Contrato.**
```ts
export function foundGame(seed: number): GameState;
export function tick(state: GameState, decision?: Decision): TickReport;
export function run(state: GameState, ticks: number, policy: Policy): void;
export type Policy = 'first' | 'last' | 'random' | 'worst' | ((s, c) => string);
```
**Reglas.** El orden de §4.2 es normativo y el código lo refleja con 17 llamadas
numeradas y comentadas. `tick` no dibuja ni escribe por consola.
**Tests.** El test de determinismo de §4.3; el orden del tick verificado con
espías; 1 000 ticks sin excepciones en 20 semillas.
**Terminado cuando.** `npm run chronicle -- --seed 7 --years 60` imprime una
crónica legible. **Este es el hito 0.**

---

### M-11 · Suite rápida

**Objetivo.** Que romper algo se note en segundos.
**Depende de.** M-10.
**Ficheros.** `tests/fast/**`.
**Contrato.** Los diez grupos de §14.1.
**Reglas.** Los tests describen propiedades del diseño, no detalles de
implementación. Nada de comprobar que una función llama a otra.
**Tests.** Son el entregable.
**Terminado cuando.** `npm test` tarda menos de 20 s y cubre los diez grupos.

---

### M-12 · Banco de pruebas de balance

**Objetivo.** Poder tocar §12 sin volar el juego.
**Depende de.** M-10.
**Ficheros.** `tests/balance/**`, `tools/balance-report.ts`.
**Contrato.** `npm run test:balance` ejecuta 60 semillas × 200 años con las
políticas `first` y `worst`, comprueba los umbrales de §12.9, imprime una tabla
y escribe `artifacts/balance.csv`.
**Reglas.** Ningún umbral se fija con una sola semilla. Las series se guardan
para poder mirar la forma de las curvas.
**Tests.** Son el entregable.
**Terminado cuando.** Los nueve umbrales de §12.9 pasan y la ejecución completa
tarda menos de 5 minutos.

---

### M-13 · Generación del mapa

**Objetivo.** Un valle creíble y siempre igual para la misma semilla.
**Depende de.** M-02.
**Ficheros.** `src/engine/world/mapgen.ts`, `tiles.ts`.
**Contrato.**
```ts
export function generateMap(b: RngBundle): ValleyMap;
export function foundingSite(map: ValleyMap): { x: number; y: number };
export function idx(x: number, y: number): number;
export function neighbours4(i: number): number[];
```
**Reglas.** Los cinco pasos de §7.1 en ese orden, con el flujo `map`.
**Tests.** Los de §7.1 sobre 200 semillas; `generateMap` es puro; dos semillas
distintas dan mapas visiblemente distintos (más del 15 % de celdas diferentes).
**Terminado cuando.** Un volcado ASCII del mapa por consola se reconoce como un
valle con río.

---

### M-14 · Edificios, colocación y obras

**Objetivo.** Que la aldea se construya sola y con criterio.
**Depende de.** M-13, M-06.
**Ficheros.** `src/engine/world/buildings.ts`, `placement.ts`, `works.ts`,
`upgrade.ts`.
**Contrato.**
```ts
export function nextProject(state: GameState): BuildingKind | Upgrade | null;
export function placeBuilding(state, kind: BuildingKind): {x,y} | null;
export function advanceWorks(state: GameState, buildPoints: number): BuiltEvent[];
export function destroyBuilding(state: GameState, id: BuildingId): void;
export function capacityOf(state: GameState): { housing: number; storage: number };
```
**Reglas.** Tabla de §7.2, prioridad de §7.3 y puntuación de §7.4, exactas. Nunca
sobre agua, marisma ni ruina de piedra. Al destruir, el edificio queda con
`lostTick` y sus celdas se marcan en `map.ruins`.
**Tests.** Ningún solapamiento en 30 semillas × 150 años; la prioridad se
respeta en una batería de estados construidos a mano; al llenarse el mapa,
`nextProject` devuelve mejoras y no nuevos edificios; los topes de §7.2 nunca se
superan.
**Terminado cuando.** Una partida de 120 años llega a los ~45 edificios de
`valle.md` §7.

---

### M-15 · Caminos y bosque

**Objetivo.** Que el mapa cuente la historia de dónde se pisa y qué se tala.
**Depende de.** M-14.
**Ficheros.** `src/engine/world/paths.ts`, `forest.ts`, `astar.ts`.
**Contrato.**
```ts
export function routeFor(state: GameState, id: VillagerId): number[]; // cacheada
export function accrueTraffic(state: GameState): void;
export function upgradePaths(state: GameState): PathEvent[];
export function fellForest(state: GameState, wood: number): number;   // devuelve la madera obtenida
export function regrowForest(state: GameState): void;
```
**Reglas.** Umbrales y decaimiento de §12.7. La tala consume la celda de bosque
más cercana al núcleo. El rebrote necesita 3 vecinas y 8 años.
**Tests.** Con tráfico constante, una celda alcanza `path = 2` en el número de
ticks esperado ±5 %; sin tráfico, un camino desaparece; el bosque nunca baja de
0 ni sube del total inicial; el rebrote no ocurre bajo un edificio.
**Terminado cuando.** A los 100 años, el bosque restante cae en el rango de
§12.9 en al menos 20 de 30 semillas.

---

### M-16 · Terreno y paletas

**Objetivo.** Que el valle se vea, y que la estación se reconozca por el color.
**Depende de.** M-13, M-00.
**Ficheros.** `src/render/palette.ts`, `src/render/layers/terrain.ts`,
`src/render/canvas.ts`.
**Contrato.**
```ts
export function paletteFor(season: Season, seasonWeek: number): Palette; // interpola 2 semanas
export function outline(c: string): string;
export function paintTerrain(ctx, map: ValleyMap, p: Palette, cell: number): void;
export function makeBackground(map, p, cell): OffscreenCanvas;
```
**Reglas.** Tabla de §10.3 literal. Manchas por región, jamás ruido por celda.
Sin contorno en el terreno.
**Tests.** La comprobación de silueta de §10.3 para las cuatro paletas;
`paletteFor` interpola de forma continua en los bordes de estación.
**Terminado cuando.** La hoja de contacto de M-19 muestra cuatro estaciones
inconfundibles.

---

### M-17 · Edificios y figuras

**Objetivo.** El resto del arte.
**Depende de.** M-16, M-14.
**Ficheros.** `src/render/sprites/*.ts`, `src/render/layers/buildings.ts`,
`figures.ts`, `shadows.ts`.
**Contrato.** Una función pura por sprite, con la firma de §10.5.
**Reglas.** Todo lo que está de pie proyecta sombra. Contorno en edificios y
figuras. Proporciones de §10.5. Nada se dibuja fuera de su caja.
**Tests.** Cada sprite se renderiza a 10 px y a 9 px de celda sobre fondo blanco y sobre
negro y produce píxeles no vacíos en ambos; ningún sprite pinta fuera de su caja
(comprobado sobre el buffer); test de silueta: en blanco y negro, `house`,
`chapel`, `granary` y `mill` tienen mapas de ocupación distintos entre sí.
**Terminado cuando.** A tamaño de móvil real se distinguen los siete edificios
principales sin leer una etiqueta.

---

### M-18 · La multitud

**Objetivo.** Ochenta figuras que van y vienen.
**Depende de.** M-17, M-15.
**Ficheros.** `src/render/crowd.ts`.
**Contrato.**
```ts
export function crowdPositions(state: GameState, tickFraction: number): Figure[];
```
**Reglas.** El horario de §10.6. Desfase de fase derivado del `id`. Interpolación
sobre el trayecto cacheado. **No muta el estado.** De noche no se dibujan
figuras: se ilumina la ventana.
**Tests.** Función pura: misma entrada, misma salida; ninguna figura fuera del
mapa; a `tickFraction = 0.9` no hay figuras a la intemperie; con 80 aldeanos,
1 000 llamadas en menos de 100 ms.
**Terminado cuando.** En un GIF de 20 s se ve salir al campo y volver.

---

### M-19 · Capturas automáticas

**Objetivo.** Que quien programa pueda ver el juego. Es el riesgo número uno de
`valle.md` §12 y esto es su mitigación.
**Depende de.** M-16.
**Ficheros.** `tools/screenshots.ts`, `playwright.config.ts`, `src/ui/debug.ts`.
**Contrato.** `npm run shots -- --seed 7 --years 1,20,60,120` genera en
`artifacts/` una PNG por combinación de año y estación, a 390×844 (mapa 360×560), más su
versión en escala de grises, más una hoja de contacto que las junta.
**Reglas.** Debe funcionar sin interacción y en CI. Una ruta de depuración
permite saltar la simulación a un tick dado sin jugar.
**Tests.** El comando termina con código 0 y produce el número esperado de
ficheros.
**Terminado cuando.** Está fusionado **antes** que M-17. Ningún trabajo visual
empieza sin esto.

---

### M-20 · Armazón de aplicación

**Objetivo.** Que el juego corra en una pantalla.
**Depende de.** M-10, M-16, M-17.
**Ficheros.** `src/ui/app.ts`, `loop.ts`, `speed.ts`, `src/main.ts`.
**Contrato.**
```ts
export function boot(root: HTMLElement, save?: SaveFile): App;
export interface App { setSpeed(s: 0|1|4|16): void; state(): Readonly<GameState>; }
```
**Reglas.** El bucle acumula tiempo real y ejecuta ticks enteros; el render
interpola con la fracción sobrante. Si la pestaña estuvo oculta, no se acumulan
ticks: eso lo resuelve el letargo (M-23). Nunca más de 8 ticks por fotograma.
**Tests.** Lógica de acumulación de tiempo probada sin DOM: a ×4 y 60 fps, 12
minutos reales dan exactamente 192 ticks.
**Terminado cuando.** Se abre en un móvil, se ve el valle y las estaciones pasan.

---

### M-21 · HUD diegético y fichas

**Objetivo.** Informar sin números en pantalla.
**Depende de.** M-20.
**Ficheros.** `src/ui/inspect.ts`, `gestures.ts`, `src/render/layers/tells.ts`.
**Contrato.**
```ts
export function tellsFor(state: GameState): Tell[];         // humo, velas, cruces, granero
export function inspectAt(state, x: number, y: number): InspectTarget | null;
export function panelFor(t: InspectTarget, state): PanelModel;
```
**Reglas.** La tabla de §11.1 completa. La ficha muestra la cifra exacta: el
juego no esconde datos. Gestos de §11.3, en un módulo sin DOM y con tests.
**Tests.** `inspectAt` acierta el objetivo en los bordes de las cajas; `tellsFor`
es pura; el reconocimiento de gestos se prueba con secuencias de eventos
sintéticas.
**Terminado cuando.** Alguien que no conoce el juego sabe decir si hay hambre
mirando la pantalla.

---

### M-22 · Encrucijada y crónica en pantalla

**Objetivo.** Cerrar el bucle corto.
**Depende de.** M-21, M-09.
**Ficheros.** `src/ui/screens/crossroad.ts`, `screens/chronicle.ts`.
**Contrato.**
```ts
export function openCrossroad(app: App, p: PendingCrossroad): void;
export function openChronicle(app: App, sinceTick?: number): void;
```
**Reglas.** El precio de cada opción siempre visible antes de elegir. Sin botón
de cerrar. La simulación **no se pausa** mientras la encrucijada está abierta.
Al decidir, la cámara enfoca durante 2 s el efecto visible.
**Tests.** Todas las opciones de las 16 plantillas se renderizan sin
desbordamiento a 390 px de ancho; el enfoque posterior apunta a una celda
válida.
**Terminado cuando.** Una decisión cambia el valle de forma visible. **Este es
el hito 2.**

---

### M-23 · Guardado y letargo

**Objetivo.** Que la aldea siga sin ti.
**Depende de.** M-20, M-10.
**Ficheros.** `src/engine/save.ts`, `src/ui/lethargy.ts`, `src/ui/welcome.ts`.
**Contrato.**
```ts
export function serialize(state: GameState, decisions: DecisionRecord[]): SaveFile;
export function deserialize(raw: unknown): SaveFile;          // valida y migra
export function catchUp(state: GameState, elapsedMs: number): CatchUpReport;
```
**Reglas.** §13 completa. Guardado cada 20 ticks y en `visibilitychange`. Tope
de letargo de 4 h. Una encrucijada pendiente sigue pendiente. Lotes de 64 ticks
dentro de `requestAnimationFrame`.
**Tests.** Ida y vuelta idéntica; un guardado corrupto se rechaza sin romper la
aplicación; `catchUp` de 4 h ejecuta exactamente 960 ticks y tarda menos de 2 s;
reproducir el registro de decisiones desde la semilla da el mismo estado que la
instantánea.
**Terminado cuando.** Cerrar y abrir a las cuatro horas presenta un parte de
bienvenida coherente. **Este es el hito 6.**

---

### 17.1 Orden de trabajo

```
M-00
 └─ M-01 ─ M-02 ─┬─ M-03 ─┬─ M-04 ─┐
                 │        └─ M-05 ─┤
                 ├─ M-06 ──────────┤
                 ├─ M-09 ──────────┤
                 └─ M-13 ─ M-14 ─ M-15
                                   │
                          M-07 ─ M-08
                                   │
                                 M-10  ← HITO 0
                                   ├─ M-11, M-12
                                   │
                          M-19 ─ M-16 ─ M-17 ─ M-18  ← HITO 1
                                   │
                                 M-20 ─ M-21 ─ M-22  ← HITO 2
                                   │
                                 M-23  ← HITO 6
```

Se pueden trabajar en paralelo, sin pisarse: (M-03, M-06, M-09, M-13),
(M-04, M-05), (M-11, M-12), (M-16, M-19), (M-17, M-18).

**M-19 va antes que M-17.** No es una preferencia de orden: es la mitigación del
riesgo principal del proyecto.

---

## Anexo A · Catálogo de encrucijadas

Dieciséis plantillas, dos por categoría. Los textos van en inglés porque son
contenido; los comentarios en español porque son diseño.

Formato: identificador, condiciones, reparto, texto, y de cada opción el verbo,
el precio visible, los efectos, el cambio en pantalla y las semillas.

---

### A.1 `winter_grain_debt` · lord

**Peso** 10 · **Reposo** 30 años · **Máx.** 2
**Requiere** `season = winter`, `seasonWeek ≥ 6`, `grainToHarvest < 0.9`, `flag vassal` sin poner
**Reparto** `A = leader`

> **The Lord's Grain**
> Year {year}. The granary is bare and the frost has not broken. Riders from
> Wealdmere wait at the ford with three carts of rye. Their captain will not
> unload them until {A} kneels.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Kneel** | The valley is no longer its own | `grain +900`, `flag vassal 0`, `morale −12` | `banner` gris sobre el núcleo, permanente | `tithe_due`, 8–14 años: `grain −450`, `morale −6` |
| **Refuse** | People will die this winter | `morale +10`, `flag proud 20` | `gather square 3` | `wealdmere_remembers`, 12–25 años: si `flag proud`, `threatened` durante 5 años |
| **Take it at night** | If you are caught, they come armed | `grain +600`, `faith −15`, `memory A stole 4` | `scar felled_wood` | `the_reckoning`, 3–9 años, 55 % de que dispare: `kill random fraction 0.15`, `destroy palisade 3` |

*Nota de diseño: es la plantilla insignia, la que aparece en `valle.md` §3. Las
tres opciones son malas de formas distintas y ninguna resuelve el invierno del
todo.*

---

### A.2 `tithe_demand` · lord

**Peso** 6 · **Reposo** 20 años
**Requiere** `flag vassal` puesto, `season = autumn`, `year > 5`
**Reparto** `A = reeve`, `B = leader`

> **The Reeve's Ledger**
> The lord's man has counted the sheaves twice and written down a number
> {A} says is wrong.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Pay in full** | A quarter of the harvest | `grain −25 %`, `morale −5` | `gather square 2` | — |
| **Pay short** | They will count again next year | `grain −12 %`, `flag watched 10` | `banner` gris parpadeante 2 años | `double_tithe`, 1–3 años: `grain −30 %` si `flag watched` |
| **Send him away** | Wealdmere does not forget | `morale +12`, `flag threatened 6` | `douse` de la fragua 1 año | `punitive_raid`, 2–5 años: `kill random fraction 0.12`, `destroy house 2` |

---

### A.3 `hungry_spring` · famine

**Peso** 12 · **Reposo** 12 años
**Requiere** `season = spring`, `grainYears < 0.35`
**Reparto** `A = reeve`, `B = midwife`

> **Seed or Bread**
> There is grain enough to sow the fields, or grain enough to eat until
> midsummer. {A} has counted it, and {B} has counted the children.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Sow it** | A hungry summer | `severity` forzada a 0.5 durante 8 semanas, `morale −8` | `scar burnt_field` invertido: los campos aparecen sembrados de inmediato | — |
| **Eat it** | A thin harvest | `grain +300`, cosecha del año ×0.55 | `douse` del molino 1 año | `lean_autumn`, 1 año: entrada de crónica que enlaza la decisión |
| **Half and half** | Both, and neither enough | `grain +140`, cosecha ×0.78, `morale −4` | `gather square 1` | — |

---

### A.4 `granary_theft` · famine

**Peso** 7 · **Reposo** 18 años
**Requiere** `grainYears < 0.5`, `has granary`, `grudge min 40`
**Reparto** `A = anyNamed`, `B = grudgeAgainst A`

> **The Broken Latch**
> Someone has been at the granary in the night. {B} says it was {A}.
> {A} says nothing at all.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Believe {B}** | {A} is cast out | `role A null`, `people −1`, `morale −6`, `opinion` del resto hacia B −10 | `gather square 2` | `exile_returns`, 10–20 años, 40 %: `arrive 3`, `flag threatened 4` |
| **Believe {A}** | {B} will not forget | `opinion B→A −45`, `memory B was_blamed 5` | `douse` del taller de B 2 años | `the_feud`, 2–8 años: dispara `smith_feud` con prioridad |
| **Hang a new latch and say nothing** | Everyone stays, and everyone knows | `morale −10`, `faith −5` | `raise` de un `palisade` junto al granero | `rot_within`, 5–15 años: `morale −15`, `flag hostile 6` |

---

### A.5 `plague_pit` · plague

**Peso** 14 · **Reposo** 25 años
**Requiere** `outbreak active`, `people > 12`
**Reparto** `A = priest`, `B = herbalist` (si no hay, `anyNamed`)

> **Where the Dead Go**
> Nine dead in eleven days. The churchyard is small and the ground is hard.
> {A} wants them blessed one by one. {B} wants a pit and lime, dug today.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Bless them** | The sickness has more days to work | `faith +18`, `morale +6`, brote +3 semanas | `build grave_yard free` | — |
| **The pit** | No one will forget who chose it | `faith −20`, brote −3 semanas, `opinion A→leader −40` | `scar grave_row` | `unquiet_ground`, 6–18 años: `faith −10`, `morale −8`, plantilla `unconsecrated` habilitada |
| **Burn the houses of the dead** | Roofs for ash | `destroy house 2`, brote −4 semanas, `morale −14` | `ruin house` ×2 | `the_burnt_row`, 3–10 años: las ruinas no se reconstruyen; entrada de crónica |

---

### A.6 `plague_blame` · plague

**Peso** 8 · **Reposo** 30 años
**Requiere** `outbreak active`, `faith > 55`, `trait priest devout`
**Reparto** `A = priest`, `B = anyNamed excluding [A]`

> **A Reason for It**
> {A} has preached three days that the sickness is a judgement, and by the
> third day the village had decided whose.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Give them {B}** | You will not get {B} back | `kill B 1`, `faith +25`, `morale +8`, `opinion` de los parientes de B hacia A −60 | `gather chapel 3` | `blood_debt`, 8–20 años: un hijo de B, si vive, `memory was_blamed 5` y dispara `feud_inherited` |
| **Silence {A}** | The village keeps its priest and loses its faith | `faith −30`, `role A null`, `morale −5` | `douse` de la capilla 3 años | `no_shepherd`, 4–10 años: `faith −15` si sigue sin cura |
| **Say nothing** | It will find its own end | `morale −12`, `faith −8`, brote +2 semanas | `gather square 4` | `whispers`, 5–12 años: `grudge` nuevo entre dos nombrados al azar |

---

### A.7 `smith_feud` · feud

**Peso** 9 · **Reposo** 15 años
**Requiere** `grudge min 45`, `people > 20` — con 55 no dispara nunca: la ventana en que alguien odia a otro por más de 55, hay más de veinte personas y el reposo ha vencido, no llega a solaparse en 2 000 años de aldea
**Reparto** `A = anyNamed`, `B = grudgeAgainst A`

> **The Anvil and the Altar**
> It has been building for years. This morning {A} put a hand on {B} in front
> of the whole village, and now both are waiting to see what you do.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Side with {A}** | {B} withdraws | `opinion B→A −30`, `lit` del edificio de B apagado 4 años, obra −15 % 4 años | `douse` del edificio de B | `the_withdrawn`, 6–14 años: B se marcha con 2 personas, o muere amargado |
| **Side with {B}** | {A} withdraws | Simétrico | `douse` del edificio de A | Simétrico |
| **Make them build something together** | Neither forgives you, but the wall goes up | `build palisade free` ×4, `morale +8`, ambas opiniones +15 | `raise palisade` | `uneasy_truce`, 10–25 años, 50 %: el rencor vuelve peor, `opinion −70` |

---

### A.8 `feud_inherited` · feud

**Peso** 5 · **Reposo** 20 años · **Año mínimo** 25
**Requiere** existe un nombrado con `memory kind = was_blamed` heredada
**Reparto** `A = anyNamed`, `B = childOf A`

> **What the Father Left**
> {B} was four years old when it happened and has never spoken of it.
> {B} is not four years old now.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Let it be settled** | One of them will not see the winter | `kill B 1` con 50 % / `kill A 1` con 50 %, `morale −10`, `faith −6` | `scar grave_row` | — |
| **Send {B} away** | The valley loses a pair of hands and a name | `people −1`, `role B null`, `morale −4` | `gather ford 2` | `the_returned`, 15–30 años, 35 %: vuelve con gente y con una demanda |
| **Give {B} the smithy** | {A} watches it happen | `role B smith`, `opinion A→B −50`, `morale +6` | `lit` de la fragua encendido | `two_smiths`, 5–12 años: dispara `smith_feud` con peso ×3 |

---

### A.9 `chapel_or_granary` · faith

**Peso** 8 · **Reposo** 40 años · **Máx.** 1
**Requiere** `people ≥ 30`, `not has chapel`, `wood > 200`, `faith > 45`
**Reparto** `A = priest` (o `anyNamed` si no hay)

> **Timber Enough for One**
> There is standing timber for one great work and the season for it. {A} has
> been drawing a chapel in the dirt for two years. The reeve has been drawing
> a granary.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **The chapel** | The next lean year will be leaner | `build chapel free`, `faith +20`, `morale +10` | `raise chapel` | `the_faithful_valley`, 15–30 años: si `faith > 70`, `arrive 4` peregrinos |
| **The granary** | {A} will remember which you chose | `build granary free`, `opinion A→leader −35`, `faith −10` | `raise granary` | `a_priest_without_a_roof`, 8–16 años: `role priest null`, `faith −15` |

---

### A.10 `relic_pedlar` · faith

**Peso** 6 · **Reposo** 25 años
**Requiere** `has chapel`, `faith` entre 30 y 70, `grainYears > 0.6`
**Reparto** `A = priest`, `B = leader`

> **A Bone in a Box**
> A man came up the ford road with a box and a story. He says it is the
> finger of a saint. {A} believes him. {B} has counted the price in grain.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Buy it** | Six weeks of bread | `grain −6 × people`, `faith +25`, `morale +8` | `raise` de un `palisade` decorativo junto a la capilla + `gather chapel 4` | `the_relic_works`, 10–25 años, 50 %: `faith +15`, `arrive 3`; si no, `faith −25` y la crónica lo llama fraude |
| **Send him on** | {A} will preach about it for a year | `faith −8`, `opinion A→B −20` | `gather ford 1` | — |
| **Take the box and pay nothing** | He will tell the road what happened here | `faith +10`, `flag hostile 8`, `morale −6` | `banner` rojo 2 años | `no_one_comes`, 3–8 años: sin llegadas mientras dure `hostile` |

---

### A.11 `forest_cut` · forest

**Peso** 9 · **Reposo** 15 años
**Requiere** `forestLeft > 0.3`, `neededFields > fields`, `people > 25`
**Reparto** `A = woodward`

> **The Old Wood**
> The fields will not feed another winter's worth of children. The nearest
> flat ground is under three hundred years of oak. {A} has walked it twice
> and come back with nothing to say.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Fell it** | The wood does not come back in your lifetime | `build field free` ×2, `wood +900`, `faith −10` | `scar felled_wood` + `raise field` | `bare_slopes`, 20–40 años: `flag flood_prone 0`; el clima ruinoso pasa a ser un 5 % más probable |
| **Take only the edge** | Slower, and the children are hungry now | `build field free` ×1, `wood +300` | `raise field` | — |
| **Leave it standing** | {A} sleeps well; nobody else does | `morale −8`, `faith +12`, `opinion A→leader +40` | `gather ford 2` | `the_wood_holds`, 15–35 años: si `forestLeft > 0.5`, `arrive 3` y `morale +10` |

---

### A.12 `wolf_winter` · forest

**Peso** 7 · **Reposo** 12 años
**Requiere** `season = winter`, `forestLeft > 0.25`, `people > 15`
**Reparto** `A = woodward`, `B = youngestNamed`

> **Tracks at the Palisade**
> Three nights running. On the third, they took something. {A} says it will
> be a child next.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Hunt them** | Men in the wood in February | `kill random 1` con 35 %, `morale +12`, `wood +120` | `gather ford 3` | — |
| **Build up the palisade** | Timber that was meant for a house | `build palisade free` ×6, `wood −180`, `morale +5` | `raise palisade` | — |
| **Keep everyone inside** | Nothing gets done for a month | Obra ×0.4 durante 6 semanas, `wood −60`, `morale −8` | `douse` general: ninguna figura sale de casa 6 ticks | `the_long_indoors`, 1 año: `morale −6` |

---

### A.13 `strangers_at_the_ford` · stranger

**Peso** 10 · **Reposo** 20 años
**Requiere** `people ≥ 12`, `housingFree ≥ 2`, `not flag hostile`, `morale ≥ 55`
**Reparto** `A = leader`, `B = reeve`

> **Nine at the Ford**
> Nine of them, with a cart and no oxen. They say their village is ash and
> will not say who burned it. {B} has counted the grain twice.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Take them in** | Nine more mouths before the harvest | `arrive 9`, `grain −40`, `morale +6` | `gather ford 4` | `whoever_burned_it`, 3–10 años, 40 %: `flag threatened 3`, `kill random fraction 0.10` |
| **Feed them and send them on** | It costs less and it costs something | `grain −60`, `faith +10`, `morale −3` | `gather ford 2` | — |
| **Turn them away** | The road will hear of it | `flag hostile 10`, `faith −18`, `morale −8` | `banner` rojo 3 años | `no_one_comes`, 1 año: sin llegadas mientras dure `hostile` |

---

### A.14 `bandits` · stranger

**Peso** 8 · **Reposo** 18 años
**Requiere** `people > 30`, `not has palisade`, `year > 15`
**Reparto** `A = leader`, `B = smith`

> **Six Men and a Horse**
> They came out of the north wood at noon so that everyone would see them.
> They want a third of the granary and they will be back in the spring.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **Pay them** | And every spring after | `grain −33 %`, `morale −10` | `gather square 2` | `the_spring_visit`, 1–2 años, se repite: `grain −25 %` hasta que haya empalizada |
| **Fight them** | {B} leads it | `kill random fraction 0.10`, `morale +18`, `wood +80`, 25 % de `kill B 1` | `scar grave_row` | `a_name_in_the_valley`, 5–15 años: `morale +10`, plantillas de `lord` con peso ×0.5 |
| **Wall the village first** | They take the harvest while you dig | `build palisade free` ×10, `grain −20 %` | `raise palisade` | — |

---

### A.15 `succession` · succession

**Peso** 100 · **Reposo** 0 · **Salta el intervalo mínimo**
**Requiere** `not role leader alive`
**Reparto** `A = anyNamed` **filtrado** a 20–60 años, `B = anyNamed excluding [A]` (igual). Si no llegan a dos candidatos en la banda, se ensancha; el respaldo es la excepción, no la regla.

> **Who Speaks Now**
> {leaderName} is buried. Two people in this valley expect to be asked, and
> only one of them is going to be.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **{A}** | {B} will remember it | `role A leader`, `opinion B→A −45`, `memory B was_passed_over 4` | `gather square 3` | `the_passed_over`, 5–20 años: si `opinion B→A < −60`, dispara `smith_feud` |
| **{B}** | {A} will remember it | Simétrico | `gather square 3` | Simétrico |
| **No one** | The valley decides things by shouting for a while | `morale −12`, `faith −6`, obra ×0.8 durante 2 años | `douse` general 1 año | `the_leaderless_years`, 2–4 años: se vuelve a disparar `succession` |

*Nota de diseño: es la única plantilla que ignora el intervalo mínimo, y el
latido del bucle largo. Cada generación el jugador reparte una herencia y crea
un rencor.*

---

### A.16 `first_stone` · succession

**Peso** 6 · **Reposo** 50 años · **Máx.** 1
**Requiere** `people ≥ 45`, `has smithy`, `year > 40`, sin sitio libre en el mapa
**Reparto** `A = leader`, `B = smith`

> **The First Stone**
> There is nowhere left to build outward. {B} says the quarry on the east
> slope will give stone for a wall, or for houses, and that {A} will not live
> to see both finished.

| Verbo | Precio | Efectos | En pantalla | Semilla |
|---|---|---|---|---|
| **The wall** | Cold houses for a generation | Habilita `wall`, obra de mejora ×1.5 en muro, `morale +6` | `raise wall` | `behind_the_wall`, 20–40 años: plantillas de `lord` y `stranger` con peso ×0.4 |
| **The houses** | The valley is rich and open | Habilita `stone_house`, incendios ×0.3, `morale +12` | `raise stone_house` | `worth_taking`, 15–30 años: `flag threatened 8` |

---

### A.17 `quiet_years` · reserva

Plantilla de reserva para la garantía por generación cuando no hay ninguna otra
elegible. **Está fuera del reparto normal**: `eligible()` la salta siempre y solo
se alcanza por el camino de la garantía. Tenerla en la baraja la convertía en una
de cada seis encrucijadas. Requiere solo `grainYears > 1.0`. Ofrece dos usos de un excedente
(una obra libre o una temporada de fiesta con `morale +20`), y **no planta
semillas**. Existe para que la garantía nunca falle, no para ser interesante.

---

## Anexo B · Bancos de contenido

### B.1 Nombres

Anglosajones, tomados de registros medievales ingleses. Cada banco tiene 60
entradas; aquí se listan las 24 primeras de cada uno y el módulo M-03 completa
el resto siguiendo el mismo criterio.

**Masculinos.** Aelric, Osric, Cuthbert, Godwin, Leofric, Wulfstan, Eadric,
Beorn, Alfwine, Tostig, Hereward, Sigeric, Baldwin, Oswy, Athelstan, Ceolwulf,
Dunstan, Edmund, Frithuric, Gyrth, Hakon, Ingeld, Merewald, Penda.

**Femeninos.** Mildreth, Aelfgifu, Edith, Godgifu, Hild, Leofwynn, Osgyth,
Sunngifu, Wulfrun, Cwenburh, Eadgyth, Frideswide, Aethelflaed, Beorhtgifu,
Cynethryth, Ealdgyth, Hereswith, Ingrith, Merewenna, Osburh, Saethryth,
Tathwyn, Wilburh, Ymma.

**Topónimos.** El señor feudal es **Wealdmere**. Otros: Ashford, Netherby,
Longmoor, Crowhurst, Stanbeck, Thornleigh, Fenwick, Ravensden. La aldea del
jugador no tiene nombre: es «the valley», y eso está buscado.

### B.2 Banco de textos — muestra

Estructura de `bank.en.ts`. El módulo M-09 lo completa: **toda clave usada por
el catálogo o por los eventos debe tener entre 3 y 5 variantes.**

```ts
export const BANK: Record<string, string[]> = {
  'founding': [
    'Twenty came over the ridge and stopped where the river bends. Year one.',
    'They stopped here because the water was clean and no one owned it. Year one.',
    'Nobody wrote down why they stopped. Year one.',
  ],
  'death.old': [
    '{name} died in the {season} of year {year}, {age} winters old.',
    'Age took {name} that {season}. {age} winters.',
    '{name} did not see another {season}. {age} winters, and no debts.',
  ],
  'death.hunger': [
    '{name} went in the {season}. There had been no bread for eleven days.',
    'Hunger took {name}, {age} winters old.',
    '{name} gave their share to the children twice, and then did not need it.',
  ],
  'death.plague': [
    'The sickness took {name} on the fourth day.',
    '{name} was well on the Sunday and buried on the Thursday.',
    '{name}, {age} winters. The pit took eleven that week.',
  ],
  'harvest.poor': [
    'The harvest came in thin. {grain} bushels for {people} mouths.',
    'A poor autumn. {grain} bushels; the village is {people}.',
    'They got {grain} bushels out of the ground and counted them twice.',
  ],
  'harvest.abundant': [
    'The best harvest anyone could remember. {grain} bushels.',
    '{grain} bushels, and the granary would not hold it all.',
    'A fat autumn. {grain} bushels, and bread every day until Christmas.',
  ],
  'built.house': [
    'A house went up on the north side. {people} now live in the valley.',
    'They raised a roof this summer. The village is {people}.',
    'One more house, one more chimney.',
  ],
  'grudge.formed': [
    '{a} and {b} have not spoken since the {season}.',
    'Whatever was between {a} and {b}, it is not going to mend.',
    '{a} stopped going to {b}\'s door in year {year}.',
  ],
  'crossroad.taken': [
    'In year {year}, {leader} chose: {choice}.',
    'Year {year}. It was decided. {choice}.',
    '{leader} gave the word in year {year}. {choice}.',
  ],
  'consequence': [
    '{delay} years after {origin}, {what}',
    'It took {delay} years. {what}',
    'Nobody had thought about {origin} in {delay} years. {what}',
  ],
  'extinction': [
    'The last of them was {name}, {age} winters old, in year {year}.',
    '{name} was the last. Year {year}. Nobody came up the ford road after that.',
    'Year {year}. The valley kept the walls for a while and then it did not.',
  ],
};
```

### B.3 Prohibiciones en el banco

Verificadas por test (§14.1):

- Ningún signo de exclamación.
- Ninguna segunda persona (` you `, ` your `).
- Ninguna valoración de la decisión del jugador: nada de *wisely*, *foolishly*,
  *at last*, *thankfully*.
- Ninguna metáfora. La crónica cuenta lo que pasó, con nombres y cifras.

---

## Anexo C · Glosario

| Término | Significado |
|---|---|
| **Tick** | Una semana de simulación. La unidad atómica del motor. |
| **Nombrado** | Aldeano con nombre, rasgos, memoria y opiniones. Máximo 8. |
| **Encrucijada** | Decisión del jugador, generada por plantilla. Su único verbo. |
| **Semilla (consecuencia)** | Efecto diferido plantado por una opción. No confundir con la semilla del generador. |
| **Bandera (`flag`)** | Estado con caducidad que condiciona plantillas. No se muestra al jugador. |
| **Reparto (`cast`)** | Vinculación de letras (`A`, `B`) a aldeanos concretos. |
| **Reserva de obras** | 15 % de la mano de obra siempre dedicada a construir. |
| **Letargo** | Estado de la aldea mientras el jugador no está. Máximo 4 h de tiempo simulado. |
| **Severidad** | Fracción de la demanda de grano no cubierta esta semana. 0–1. |
| **Hoja de contacto** | PNG que junta las capturas automáticas de todas las estaciones y años. |

---

*Fin del documento. Toda modificación a este fichero exige actualizar la tabla
de decisiones de §1 y avisar a los módulos afectados.*
