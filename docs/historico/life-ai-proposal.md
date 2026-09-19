# The Valley — propuesta de IA para aldeanos y fauna

> **SUPERADO · 18 sep 2026.** Era una propuesta documentada y sin
> implementar. Lo que de verdad se hizo son las rondas IA-1 a IA-18
> (`docs/historico/life-rounds/`), medidas con el observatorio y en `main`. Se conserva
> porque el código la cita y porque su diagnóstico —qué le faltaba a la vida
> del valle— sigue siendo la explicación de por qué esas rondas existieron.

**v1.0 · 16 de septiembre de 2026 · Europe/Madrid.**
**Estado: propuesta documentada; no implementada ni calibrada.**

## 0. Encargo y autoridad

El dueño pide aldeanos y animales que parezcan lo más reales posible y tengan
interacciones aleatorias diferentes en cada partida. La propuesta concreta esa
dirección para un idle que se disfruta mirando: decisiones legibles, individuos
reconocibles, situaciones que se encadenan y momentos de calma.

Este fichero desarrolla las siguientes fases de `docs/historico/rework.md` §3 y R-2/R-5.
No sustituye su orden ni crea una copia del diseño vigente. Antes de implementar,
el coordinador integra las decisiones correspondientes en `docs/design.md`
Anexo E y actualiza `docs/changelog.md`. La solicitud actual es documental.

Lecturas de implementación: `CLAUDE.md`, `design.md` §1–4, E.1, E.3, E.6, E.7,
el brief correspondiente de E.8 y `docs/historico/rework.md` §3–4. La interfaz se planifica en
`docs/ui-redesign/implementation-plan.md`; coordinar únicamente sus puntos de
lectura de actividad/selección. Los escritores de UI no son dueños de `life/`.

El archivo `docs/historico/rework.md` estaba modificado al redactar esta propuesta. Sus medidas
v3.76 se citan como antecedentes documentados, no como mediciones nuevas.

## 1. Qué hay y qué falta

| Pieza inspeccionada | Ya existe | Siguiente mejora |
|---|---|---|
| `life/needs.ts` | Seis impulsos y multiplicadores por rasgo | Contexto y hábitos que se lean en la conducta |
| `life/decide.ts` | Utilidad, preferencia por continuar, distancia, horario y ruido determinista | Validar intención, recordar fallos y elegir alternativas alcanzables |
| `life/offers.ts`, `places.ts` | Actividades y plazas distribuidas en sitios | Reservas espaciales compartidas y uso de lugares según contexto |
| `life/scenes.ts` | Charla, empujón, pelea, rechazo | Acuerdo entre participantes, secuencias completas y recuperación |
| `life/props.ts` | Objetos, transporte y pases | Integrar objetos como motivo y resultado visible de encuentros |
| `life/beasts.ts` | Gallina, cerdo y vaca con cuerpo y colisión | Varias actividades, percepción, temperamento y conducta de grupo |
| `life/staging.ts` | Escenificación de órdenes/reuniones | Leer sucesos reales e identidades de participantes |
| `derive/animals.ts`, `effects/fauna.ts` | Fauna derivada y presentación | Migración explícita de especies a conducta con estado efímero |

En `beasts.ts`, el único impulso que crece es aburrimiento y cada animal tiene
una oferta propia. Variar su velocidad no basta para que parezca que percibe
personas, busca refugio o elige dónde pastar. Además, las claves de sus ofertas
son individuales: compartir un contador de esas claves no impide por sí solo
que dos animales ocupen la misma coordenada. La reserva debe representar suelo
o recurso compartido, no solo el nombre de una oferta.

`docs/historico/rework.md` documenta correcciones recientes de colisiones y giro, con residuos
de cuerpos nacidos en zonas cerradas. Primero se completan esas correcciones;
añadir escenas sobre rutas inválidas multiplicaría los mismos fallos.

## 2. Principios de comportamiento

1. **Toda acción tiene una razón observable.** Un animal levanta la cabeza,
   mira a quien se acerca y se aparta; no cambia instantáneamente de destino.
2. **Un individuo mantiene carácter.** Varían sus oportunidades y su humor
   diario, pero el mismo aldeano no alterna personalidad a cada elección.
3. **El lugar importa.** El pozo reúne, el sendero canaliza, la puerta estrecha
   obliga a ceder, la lluvia invita a buscar techo. El mapa genera encuentros.
4. **Las escenas pueden no ocurrir.** Una invitación puede rechazarse y una
   persecución terminar sin alcanzar a nadie. No reunir participantes a la fuerza.
5. **La quietud también comunica.** Descansar, rumiar, mirar y esperar son
   acciones con postura y duración; no equivalen a una IA bloqueada.
6. **La sorpresa necesita continuidad.** Aproximación → contacto → reacción →
   separación. La duración debe permitir leer la escena en la cámara del juego.
7. **El caos mecánico sigue perteneciendo al motor.** No se suavizan desastres
   ni se garantiza supervivencia. Se distingue su consecuencia real del gesto
   cosmético para que abrir la aplicación no cambie el destino de la partida.

## 3. Arquitectura: quién decide qué

### 3.1 Motor, derivación, vida y render

- **Motor:** población, heridas/muertes que realmente existan, inventario,
  opiniones, recuerdos persistentes, sucesos y consecuencias. Se guarda.
- **Derivación:** lee esos hechos y ofrece descriptores puros; no crea historia.
- **Vida:** posiciones, elección local, atención, reservas, encuentros,
  miedo momentáneo y memoria de esta jornada. No escribe en `GameState`.
- **Render:** posturas, clips, orientación y efectos que representan la vida.
  No decide a quién perseguir ni si un encuentro tiene éxito.

Conservar `LIFE_STEP`, `seedOfDay`, el estado congelado de jornada y reconstrucción
desde el amanecer. No añadir servicios externos ni inferencia lingüística por
aldeano: esta IA es local, reproducible y utilizable sin conexión.

### 3.2 Tres niveles de decisión

**Hábito:** preferencia estable por lugares, compañía o ritmo, derivada de semilla
e identidad. Los rasgos del motor tienen prioridad semántica; un hash no puede
convertir en sociable por defecto a alguien cuyo rasgo dominante es reservado.

**Intención:** actividad que se ha elegido y se intenta terminar. Conserva motivo,
destino, reserva y condición de abandono. Reutiliza el sistema de ofertas.

**Reacción inmediata:** apartarse, mirar, sobresaltarse, ceder paso. Puede
interrumpir momentáneamente la locomoción sin borrar la intención. Un peligro
realmente cercano sí la cancela y libera su reserva.

Orden de prioridad propuesto: suelo/colisión válidos → peligro inmediato →
escena autoritativa del motor → compromiso de interacción aceptado → necesidad
urgente → actividad elegida → curiosidad y pausa ambiental. Una escena de motor
no permite atravesar paredes ni quedarse en un solar imposible.

### 3.3 Memoria pequeña y reconstruible

Durante una jornada recordar: último interlocutor, última actividad, destino
fallido, razón de fallo, intento pendiente y sobresalto reciente. Caducar por
pasos escénicos; no por reloj del sistema. La reconstrucción vuelve a producir
esa memoria recorriendo los mismos pasos desde el mismo estado.

Entre jornadas solo perduran hábitos derivados de identidad y hechos ya
guardados por el motor. No arrastrar silenciosamente memoria efímera que
`rebuildTo` no pueda reproducir. «Recuerda a quien lo alimentó ayer» queda fuera
del primer alcance salvo que se diseñe su dato persistente en una fase de motor.

## 4. Variedad aleatoria que se puede reproducir

| Escala | Clave de selección | Qué varía |
|---|---|---|
| Partida | Semilla + versión de comportamiento | Preferencias ambientales del valle |
| Individuo | Semilla + especie/tipo + id | Sociabilidad, cautela, exploración y ritmo |
| Jornada | `seedOfDay` + identidad | Disposición diaria y variaciones de itinerario |
| Encuentro | Semilla de jornada + participantes + tipo + ordinal del encuentro | Aceptación, variante de gesto y duración |

Estas selecciones son hashes puros separados por propósito. Nunca consumir
`fate`, `cast` u otro flujo del motor; nunca `Math.random`. La semilla original
idéntica con decisiones idénticas conserva la misma partida. Otra semilla crea
otra combinación; volver a cargar no vuelve a tirar los dados.

La selección ocurre al cambiar intención o iniciar encuentro, no cada frame.
Ordenar candidatos y participantes por identidades estables; desempatar de forma
explícita. No usar iteración incidental de una colección ni posición de cámara.

La variedad combina contexto y azar, en este orden:

1. Descartar actividades físicamente imposibles o contradictorias con el estado.
2. Puntuar necesidades, rasgos, relación real, hábitat, clima y distancia útil.
3. Favorecer el compromiso actual hasta completarlo o justificar interrupción.
4. Aplicar variación determinista entre opciones viables.
5. Reservar recursos/participantes y comenzar.

La elección puede seguir siendo máxima utilidad con ruido contextual, como hoy;
no introducir un segundo selector probabilístico sin demostrar qué mejora.
Un enfriamiento local evita repetir inmediatamente la misma escena entre los
mismos participantes. No hay una cuota que obligue a que todos los valles
tengan la misma cantidad de sucesos. Los límites de escenas controlan claridad
y coste visual; no bloquean ni rebajan desastres del motor.

## 5. Aldeanos: intención, carácter y vida cotidiana

### 5.1 Ciclos de actividad flexibles

Usar ventanas de oportunidad, no horarios idénticos para todos. El oficio y la
actividad de la aldea sugieren trabajo; cansancio y sed lo interrumpen; la
compañía permite una pausa. No simular una segunda producción de grano en `life/`.

Cada actividad debe incluir llegada, colocación, ejecución y salida. Transportar
un cubo exige recogerlo, ir a un lugar válido y dejarlo; no mostrarlo apareciendo
en manos para desaparecer al cambiar intención. Si falta objeto o sitio, elegir
otra actividad que se pueda representar.

Los niños exploran cerca de referencias válidas y proponen juego; no se les
asigna trabajo de adulto. Los mayores tienen mayor preferencia por pausas y
lugares próximos. Edad y rasgos no fuerzan unanimidad: dos mayores pueden tener
distinta sociabilidad. Los umbrales de edad se leen del modelo vigente.

### 5.2 Personalidad que se distingue sin texto

| Datos existentes | Conducta propuesta | Evitar |
|---|---|---|
| `kind`, `generous` | Acepta compañía, deja paso, ofrece un objeto disponible | Convertir cada gesto en donación de recursos |
| `secretive` | Prefiere borde del corro, charlas breves y descanso apartado | Aislamiento absoluto impuesto |
| `hot_tempered`, `spiteful` | Más tensión ante roce; menos paciencia al ceder | Peleas continuas sin preparación |
| `devout` | Visitas a capilla cuando es alcanzable y hay oportunidad | Teletransporte o rutina obligatoria |
| `ambitious`, `stubborn`, `loyal` | Mayor persistencia en ocupación elegida | Ignorar necesidades urgentes |
| `frail`, `hardy` | Ritmo y pausas diferentes, conservando movilidad válida | Congelar al frágil o hacerlo inmortal |
| Opiniones y recuerdos | Busca/evita a personas concretas cuando las reconoce | Amistades inventadas por proximidad |

No introducir rasgos llamados «perezoso» o «curioso» como si ya pertenecieran
al enum. Puede haber una inclinación cosmética derivada a explorar o descansar,
con nombre técnico distinto y sin escribirla como personalidad oficial.

### 5.3 Percepción local

Usar la rejilla espacial existente para ver vecinos y amenazas próximas. Un
aldeano no conoce a todos los animales del mapa en cada paso. Las paredes
ocultan interacción visual; un sonido puede generar atención local solo con
una regla explícita de alcance. No hacer que toda la aldea mire cualquier gesto.

Mirar tiene orientación limitada y no mueve los pies. El torso/cabeza puede
reaccionar donde el rig lo permita; si no lo permite, una pausa orientada del
cuerpo sirve. Mantener límites de giro y progreso que ya corrigen las vueltas.

## 6. Animales: comportamientos distintos por especie

Separar necesidades animales de las humanas. Propuesta: alimento aparente,
descanso, seguridad, proximidad al grupo y exploración, según especie. Son
motivaciones visuales; no consumen reservas ni causan muertes por sí solas.
Cada especie publica únicamente necesidades que sus actividades puedan satisfacer.

| Especie | Ciclo cotidiano | Reacción e interacción | Territorio |
|---|---|---|---|
| Gallina | Buscar punto, picotear, escarbar, mirar, pausa | Se aparta del pie, huye de aproximación brusca, vuelve cuando cesa amenaza | Patio/casa y suelo libre próximo |
| Cerdo | Olfatear, hozar, caminar corto, tumbarse | Se acerca al ofrecimiento de alimento, duda ante desconocido, rodea obstáculos | Corral y zonas aptas de suelo |
| Vaca | Pastar en parches, rumiar, descanso, beber | Cohesión floja, cede tarde por tamaño, se orienta hacia quien se acerca | Campo y acceso transitable a agua |
| Cuervo | Posarse, buscar alimento, vigilar, levantar vuelo, volver | Escapa de un guardián o del paso cercano de una persona | Campos/perchas válidas y aire |
| Lobo | Observar desde borde, aproximarse, detenerse, retirarse | Reacciona a personas y grupo; incursión ligada a suceso real cuando exista | Bosque/borde y rutas de tierra |
| Pez | Recorridos cortos, pausa, grupo suelto, huida local | Se separa ante perturbación representada en agua | Máscara acuática; nunca rutas terrestres |

Gallina/cerdo/vaca son la primera entrega. Cuervos y lobos entran después por
adaptación explícita desde su representación actual. Peces pueden conservar
un movimiento simple, pero coherente con el agua. No ejecutar a la vez el
movimiento derivado antiguo y un cuerpo nuevo para la misma especie en 3D.

Oso y visitante especial solo se representan cuando existe el evento y el
recurso visual apropiado. Perros, gatos y nuevas especies son ampliaciones de
arte y catálogo; no se prometen como parte de esta entrega.

### 6.1 Grupo y diferencias individuales

La cohesión es una preferencia por permanecer a distancia cómoda de unos vecinos,
no una atracción permanente a un punto compartido. Cada animal elige su propio
parche alcanzable. El radio corporal y la separación prevalecen sobre cohesión.

Asignar cautela, iniciativa y ritmo por identidad, dentro del perfil de especie.
Un animal puede empezar a moverse y otros seguirlo por oportunidad; no asignar
un líder obligatorio que teletransporte o arrastre al grupo.

Hoy `state.herd` representa cantidades y los ids visibles no equivalen
necesariamente a identidades persistentes de animales. En la primera entrega,
los perfiles corresponden a slots visuales deterministas por especie. Si cambia
el censo, no afirmar que sigue siendo «la misma vaca» durante toda la partida.
Identidades animales persistentes requieren fase de motor y migración aparte.

### 6.2 Miedo y recuperación

Una amenaza válida eleva alarma; el animal observa, busca salida alcanzable y
se aleja. Una vez fuera del peligro baja gradualmente la alarma, mira alrededor
y retoma actividad. No invertir dirección repetidamente entre dos destinos.

Si no existe vía de escape: apartarse hasta un punto seguro alcanzable o quedarse
alerta, sin atravesar la pared. No escoger el destino por «vector opuesto» sin
validar conectividad y radio. El riesgo real de muerte sigue en el motor.

## 7. Catálogo inicial de escenas emergentes

Cada escena tiene participantes compatibles, un recurso espacial reservado,
inicio, acción, final, cancelación y enfriamiento. Se elige solo si se puede
completar o abortar con un resultado visible.

| Escena | Disparador y participantes | Secuencia visible | Interrupción/final |
|---|---|---|---|
| Saludo de paso | Dos adultos próximos y disponibles | Mirada, gesto, siguen andando | Uno no acepta: gesto breve, sigue |
| Charla | Compañía y disposición mutua | Aproximarse a sitios distintos, turnos, despedida | Urgencia o amenaza libera a ambos |
| Ceder paso | Dos rutas enfrentadas en estrechez | Uno espera, otro pasa, primero continúa | Arbitraje estable evita doble cesión eterna |
| Ofrecer objeto | Portador y receptor libre, objeto real de `props` | Acercar, aceptar, transferir | Rechazo conserva dueño; caída usa física existente |
| Juego | Niños disponibles y zona segura | Invitación, pase/persecución corta, pausa | Cansancio, peligro o falta de receptor |
| Alimentar | Persona con oportunidad y animal receptivo | Persona se detiene, animal se aproxima, gesto, separación | Animal asustado se retira; sin gasto económico ficticio |
| Acariciar | Animal tranquilo, contacto cercano válido | Invitación, aproximación, pausa de contacto | No animar contacto a través de una pared |
| Gallina se aparta | Persona invade distancia cómoda | Gallina levanta cabeza, corre corto, mira y retoma | Final al ganar distancia segura |
| Niño tras gallina | Curiosidad/juego y espacio libre | Animal huye, niño sigue brevemente, desiste | Sin captura permanente ni persecución sin límite |
| Cuervos levantan vuelo | Aproximación válida a campo | Despegues escalonados, dispersión, retorno posterior | Los aterrizajes validan superficie |
| Vecinos ante lluvia | Cambio de cielo de jornada disponible | Miradas, buscar refugios diferentes, reunirse si hay espacio | No todos al mismo asiento |
| Reacción a riña | Riña real con ids o escena local | Dos protagonistas; algunos miran, otros evitan | No toda la aldea se detiene |
| Funeral | Muerte real y sitio accesible | Grupo, pausa, dispersión | Sin inventar fallecido ni parentesco |
| Incendio | Suceso real con lugar identificable | Acercamiento al perímetro, observación/cubos si existen | Nunca mostrar que la escena repara el edificio |

Boda: usar los participantes reales del registro si están disponibles. Si el
evento no tiene sus ids, representar una celebración colectiva sin señalar una
pareja inventada; no inferir cónyuges a partir de edad, sexo o orden de lista.
Un comercio representado no transfiere grano por su cuenta. Una pesca ambiental
no aumenta alimento; la buena pesca con consecuencias llega desde el motor.

Las cadenas nacen de estados visibles: niño se acerca → gallina huye → adulto
cede → otro mira. Los espectadores requieren proximidad y disponibilidad.
Limitar reacciones secundarias por duración y alcance para evitar una cascada
permanente. No crear un narrador que fuerce estas cadenas para cumplir una cuota.

## 8. Contratos propuestos para integración

Son interfaces nuevas para acordar en IA-0; no se afirma que existan. `Point`
se importa de `life/body.ts`. Reutilizar `Intent`, `Dweller`, `Scene`, `Place`
y `Offer` actuales mediante adaptadores; evitar un segundo simulador en paralelo.

```ts
export type ActorRef =
  | { kind: 'villager'; id: number }
  | { kind: 'beast'; id: number };

export type InteractionKind =
  | 'greet' | 'chat' | 'yield' | 'give' | 'play'
  | 'feed' | 'pet' | 'chase';

export interface InteractionProposal {
  id: string;
  kind: InteractionKind;
  initiator: ActorRef;
  recipient: ActorRef;
  spots: readonly [Point, Point];
  expiresAtStep: number;
}

export interface InteractionLease {
  id: string;
  participants: readonly [ActorRef, ActorRef];
  spots: readonly [Point, Point];
  expiresAtStep: number;
}

export interface InteractionRegistry {
  tryReserve(proposal: InteractionProposal, step: number): InteractionLease | null;
  release(id: string): void;
  expire(step: number): void;
  busy(actor: ActorRef): boolean;
}

export type ActionStage = 'approach' | 'act' | 'recover';
export interface ActivitySighting {
  actor: ActorRef;
  actionId: string;
  stage: ActionStage;
  partner: ActorRef | null;
}
```

`tryReserve` es atómico: ambos participantes y los sitios quedan reservados o
ninguno. Rechaza actores ocupados, plazas incompatibles o lease caducado.
La propuesta solo se presenta tras validar caminos y disponibilidad; se
revalida antes del contacto. Colisiones de reserva usan radio y geometría común,
incluidas plazas de actividades individuales. `release` es idempotente.

Las solicitudes de un mismo paso se resuelven en orden canónico. El criterio
de prioridad puede rotar de forma determinista por encuentro para que el id
más bajo no gane siempre. Conservar primero compromisos válidos existentes.

Transición: propuesta → aceptación/reserva → aproximación → acción → recuperación
→ liberación. Cualquier estado puede cancelarse por invalidación; siempre libera
actor, objeto y plaza. Los dos participantes no pueden aceptar escenas distintas
en el mismo paso. `scenes.ts` sigue siendo dueño de la ejecución; el registro
solo arbitra recursos y no mueve cuerpos.

`ActivitySighting` es una salida de lectura para render y posible ficha futura.
`actionId` es semántico, no una frase ni una emoción persistente. La UI podría
traducirlo por banco; el rediseño de UI no depende de que esta extensión exista.

## 9. Movimiento y recuperación: terminar lo que ya está empezado

- Validar círculos completos al crear cuerpos, destinos y plazas. Si el punto
  original está cerrado, buscar una alternativa conectada y libre antes de mostrarlo.
- Reservar una plaza al elegir; liberarla al abandonar. Compartir reservas de
  suelo entre animales/personas aunque sus ofertas tengan ids diferentes.
- Un fallo de ruta invalida esa opción durante un plazo acotado o hasta que cambie
  el contexto; no volver al mismo destino fallido en cada replanteo.
- Medir progreso real hacia la ruta, no solo distancia recorrida: dar vueltas
  alrededor de un obstáculo no es avanzar. Replanificar de forma escalonada.
- Si ninguna opción es alcanzable, elegir pausa/localización segura en su componente
  conectado. Si tiene sed sin agua accesible, la pausa no «cura» mágicamente la sed;
  se conserva el motivo y se registra la falta de oferta para corregir el mapa.
- Ceder en puertas con arbitraje estable y espera; no compensar atasco aumentando
  fuerzas de separación. La malla debe caber en el radio que protege su cuerpo.
- Al agotar ruta comprobar proximidad al destino; una ruta vacía o interrumpida
  no demuestra que se haya llegado. La animación de trabajo comienza al llegar.

## 10. Tiempo, continuidad y presupuesto

Las duraciones se expresan en pasos/segundos escénicos. Usar el reloj existente;
no recalcular la semana ni animar la IA con `Date` o tiempo de navegador.
La aceleración alta reduce la legibilidad del gesto: no ralentizar la simulación
para forzar una escena ni prometer el mismo detalle visible a ×1 y ×64.

El recambio del estado de jornada conserva el contrato actual. Si un hecho nuevo
llega del motor mientras se pinta la jornada congelada, evitar mezclar posiciones
con un censo nuevo. Una mayor inmediatez requeriría un protocolo separado de
interrupción; no adelantar ese cambio dentro del catálogo de escenas.

Percepción y elección pueden escalonarse por id/paso; la integración corporal
permanece a paso fijo. Consultar vecinos con la rejilla existente, cachear rutas
según el terreno de jornada y no escanear todas las parejas del valle.

No reducir la simulación según si un actor está dentro de cámara: eso cambiaría
los encuentros al mover el encuadre. Se puede reducir detalle de dibujo conservando
el mismo estado. La reconstrucción incluye reservas, propuestas y memoria temporal.

No se fijan nuevos pesos, duraciones ni presupuestos numéricos sin prueba visual.
Partir de constantes actuales; las nuevas son parámetros de presentación
provisionales y se concentran en `life/behavior-tuning.ts`, con unidad y motivo.
IA-0 debe ratificar esta ubicación frente a la regla general de `balance.ts`:
`needs.ts` ya distingue calibración visual de balance económico. Los números
que afecten al motor siguen en `design.md` §12 y `engine/balance.ts`.

## 11. Trabajo para agentes

Un coordinador integra, posee `village.ts`, contratos comunes y documentación
normativa. Los agentes escriben solo los ficheros asignados. Al cambiar de base,
verificar qué partes de `docs/historico/rework.md` ya se han completado. Las rutas de pruebas
son nuevas propuestas, no pruebas existentes.

### IA-0 — Acordar base y contratos · coordinador

**Objetivo:** conectar este diseño con el rework actual.
**Depende de:** encargo de implementación posterior.
**Ficheros:** `docs/design.md`, `docs/changelog.md`, este documento y
`docs/historico/life-rounds/IA-0.md`.
**Contrato:** mapa de APIs reales, dueños y configuración inicial de parámetros.
**Reglas:** comprobar identidades animales, reacciones de jornada, disponibilidad
de clips/props y reservas; resolver reglas contradictorias antes de delegar.
**Verificación:** secuencia actual con personas y animales; usar informe existente
de movimiento sin abrir campaña de balance.
**Terminado cuando:** alcance por especie, ancla y contratos quedan acordados.

### IA-1 — Movimiento fiable y destinos útiles · agente construir

**Objetivo:** completar pendientes §3 del rework y recuperación de intenciones.
**Depende de:** IA-0.
**Ficheros:** `life/{body,terrain,navigate,decide,offers,beasts}.ts`, bajo
`src/render3d/`; `tests/fast/life-ai-navigation.test.ts`; informe IA-1.
**Contrato:** conservar APIs públicas; selección valida destino y reserva espacial.
**Reglas:** no retocar arreglos v3.76 sin causa; no atravesar paredes para desbloquear.
**Verificación:** nacimiento válido, destino imposible, puerta estrecha y plazas
superpuestas; misma semilla/día/pasos reproduce posiciones.
**Terminado cuando:** una secuencia muestra llegada, ocupación y salida sin
volver al destino fallido indefinidamente. Integrador conecta reservas en `village.ts`.

### IA-2 — Compromisos e interacciones · coordinador

**Objetivo:** arbitraje común antes de ampliar el catálogo.
**Depende de:** IA-1.
**Ficheros:** `life/{interaction-types,interaction-registry,behavior-tuning}.ts`
(nuevos), `life/{scenes,village,props}.ts`, pruebas
`tests/fast/life-ai-interactions.test.ts`; informe IA-2.
**Contrato:** §8, congelado para las dos ramas siguientes.
**Reglas:** un propietario por objeto/actor; cancelación y recuperación explícitas.
**Verificación:** dos ofertas simultáneas al mismo receptor, rechazo, ruta
invalidada, expiración y reconstrucción a mitad de escena.
**Terminado cuando:** saludo, charla y cesión funcionan con principio y final.

### IA-3 — Aldeanos con hábitos · agente construir A

**Objetivo:** diferencias visibles de carácter y actividades cotidianas.
**Depende de:** IA-2 integrado.
**Ficheros:** `life/{needs,decide,offers,places}.ts`, nuevo `life/habits.ts`,
`tests/fast/life-ai-habits.test.ts`; informe IA-3.
**Contrato:** ofertas existentes + registro §8; no cambiar contrato compartido.
**Reglas:** respetar rasgos reales; hábito estable, ánimo diario variable;
el coordinador integra nuevos hooks de escena y de `village.ts`.
**Verificación:** observar varias jornadas/semillas y personas con perfiles
distintos; relación entre carácter y elección, sin forzar el mismo resultado siempre.
**Terminado cuando:** se pueden señalar en secuencia razones diferentes para
trabajar, descansar, relacionarse o evitar un encuentro.

### IA-4 — Animales con conducta e interacción · agente construir B

**Objetivo:** gallinas, cerdos y vacas con actividades y respuestas propias.
**Depende de:** IA-2 integrado; paralelizable con IA-3 en worktree independiente.
**Ficheros:** `life/beasts.ts`, nuevos `life/{beast-needs,beast-behavior}.ts`,
`tests/fast/life-ai-beasts.test.ts`; informe IA-4.
**Contrato:** registro §8 y salida animal actual; adaptador para nuevos impulsos.
**Reglas:** una fuente de movimiento por animal; reservas compartidas; no contar
una actividad cosmética como producción o cambio del censo.
**Verificación:** aproximación lenta/brusca, grupo junto a puerta, pasto alternativo,
amenaza sin escape y vuelta a la calma; reconstrucción determinista.
**Terminado cuando:** tres especies reconocibles por su conducta, y una
interacción humana completa que termine sin persecución indefinida.

### IA-5 — Fauna silvestre y representación · coordinador

**Objetivo:** ampliar percepción/coherencia a cuervos/lobos y conectar poses.
**Depende de:** IA-3/IA-4 integradas y vistas.
**Ficheros:** nuevo `life/wildlife.ts`, `life/{village,cast}.ts`,
`src/render3d/{renderer.ts,effects/fauna.ts}`, pruebas
`tests/fast/life-ai-wildlife.test.ts`; informe IA-5.
**Contrato:** una fuente autoritativa de posiciones por especie en 3D;
Canvas conserva su representación derivada.
**Reglas:** no borrar otras faunas al migrar una; no cambiar arte ni terreno.
**Verificación:** ave despega/aterriza en sitio válido; lobo entra/sale por
ruta alcanzable; animales terrestres y acuáticos respetan su hábitat.
**Terminado cuando:** secuencias muestran amenaza, reacción y recuperación.
Si una pose exige un clip inexistente, documentar encargo de arte separado.

### IA-6 — Escenificar la historia real · coordinador

**Objetivo:** riña, funeral, incendio y celebración visibles con datos reales.
**Depende de:** IA-5.
**Ficheros:** `life/{staging,scenes,village}.ts`,
`tests/fast/life-ai-staging.test.ts`; informe IA-6 y documentación normativa.
**Contrato:** lectura de `happenings` y reacciones ya disponibles; actores por id.
**Reglas:** sin escrituras de motor, sin elegir cónyuges ficticios ni duplicar
consecuencias; dejar explícito cualquier dato que falte para una escena.
**Verificación:** protagonistas correctos, sitio alcanzable, espectadores locales,
fin y cancelación; escena ausente si no ocurrió su hecho.
**Terminado cuando:** secuencia de cada escena implementada y pendientes de datos
o arte identificados. No declarar cumplida una escena solo por probar su helper.

Orden: **IA-0 → IA-1 → IA-2 → (IA-3 + IA-4) → IA-5 → IA-6**.
Informes en `docs/historico/life-rounds/IA-n.md`. El coordinador añade a cada brief la lista
exacta de extensiones aprobadas; nadie amplía por su cuenta el motor o el arte.

## 12. Cómo juzgar sin convertir esto en otra ronda de balance

La prioridad es mostrar comportamiento. Usar la puerta vigente de typecheck,
suite rápida, jornadas y lint; registrar fallos heredados sin reajustar economía.
No crear una campaña de equilibrio ni cuotas de drama como requisito previo.

Cada ronda entrega una **secuencia** reproducible, no una sola foto: acercamiento,
encuentro, resolución y vuelta a actividad. Registrar semilla, día, tick, pasos,
velocidad y backend real. Mostrar tanto encuadre normal como detalle; una conducta
que solo se entiende ampliando un píxel no está comunicada en el juego.

Preguntas de revisión:

- ¿Se entiende por qué se ha detenido o movido?
- ¿La otra persona o animal reacciona a lo que ocurrió?
- ¿La escena termina y ambos recuperan su actividad?
- ¿Se ve diferencia entre especies y entre personas?
- ¿Otra jornada del mismo valle cambia oportunidades manteniendo identidad?
- ¿Otro valle cambia la combinación sin parecer la misma coreografía?
- ¿Reconstruir el mismo día y paso produce la misma escena?

Refutan la propuesta: más variedad de etiquetas pero el mismo movimiento;
escenas que precisan atravesar paredes; todos reaccionan al mismo tiempo;
animales que solo vuelven a su ancla; memoria que desaparece al recargar una
misma jornada; motor diferente según FPS o tiempo con la pestaña abierta.

## 13. Ampliación posterior: encuentros que dejen historia

Si se quieren amistades nuevas, confianza animal persistente, heridas o pérdidas
de recursos por estas conductas, se diseña un módulo de motor separado. El motor
elige y registra el hecho por semana con identidades y flujo propio; la capa de
vida lo representa cuando corresponde, aunque el jugador estuviera ausente.

No enviar «se han tocado en pantalla» como causa de una muerte, nacimiento o
cambio de opinión. Eso haría depender la partida de lo que el dispositivo llegó
a simular. La primera entrega aprovecha la historia que ya existe y añade
conducta cotidiana alrededor; la ampliación persistente necesita su propio brief.

## 14. Registro

v1.0: propuesta de hábitos individuales, variedad por semilla/jornada/encuentro,
necesidades animales, percepción, reservas, catálogo de escenas y siete fases.
Se distingue lo ya implementado de lo propuesto y el estado efímero de los
hechos guardados. No se han editado código, pruebas, `docs/historico/rework.md` ni balance.
