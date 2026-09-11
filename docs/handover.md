# The Valley — Traspaso

**10 de septiembre de 2026 · Al cerrar la dirección desde Cowork**

Hasta aquí el proyecto ha tenido dos papeles separados: alguien que diseñaba y
arbitraba, y alguien que programaba y medía. A partir de ahora los asume el mismo
agente. Este documento existe para que esa fusión no se lleve por delante lo que
hacía funcionar el método.

**La fuente de verdad sigue siendo `docs/design.md`.** Este fichero no la
sustituye: dice cómo trabajarla y en qué estado está.

---

## 1. El método, en cinco reglas

Funciona porque invierte la relación habitual: **el código no es el resultado de
la especificación, es su prueba experimental.** Cada módulo implementado destapa
algo que la spec decía mal, y esa corrección es el producto real de la ronda.
Cuarenta y siete revisiones lo confirman.

1. **Cada ronda termina en evidencia, no en un visto bueno.** Una medición que
   contrastar o una salida que leer, y por escrito **qué resultado falsaría la
   spec**. Sin esa frase, se imprime un número y nadie sabe qué mira.
2. **Toda invención es un hueco de especificación.** Si hubo que inventar un
   número, una regla o un tipo, la spec callaba: ciérralo en el documento, no
   solo en el código.
3. **Ningún número se inventa.** Todos viven en §12 y en `balance.ts`. Uno nuevo
   entra con `// TUNE:` y sube a spec en la ronda siguiente.
4. **Antes de ajustar una constante, comprueba que el mecanismo que mide
   funciona.** Cinco rondas se dedicaron a apretar tuercas de un motor que
   perdía aceite: una peste vencida seguía restando ánimo para siempre (v2.18).
   Un número fuera de banda puede ser un mecanismo roto.
5. **Versionar y verificar.** Cada cambio del documento sube la versión, se
   fecha, y el registro dice **qué cambió y por qué** — el motivo es lo que
   evita que alguien lo revierta dentro de seis meses creyendo que arregla algo.
   Y verificar la edición no es verificar la escritura: **relee del disco**.

### El riesgo de fusionar los papeles

Un implementador que también dirige **optimiza lo que puede medir solo**. Se ve
en el historial: rondas enteras de rendimiento e instrumentación mientras el
hito 0 —que necesita a un lector humano ajeno— lleva ocho módulos sin veredicto.

Contrapeso concreto: antes de abrir una ronda, pregunta **qué haría fallar a esta
decisión**, y si la respuesta necesita a una persona, no la sustituyas por otra
medición.

---

## 2. Estado del proyecto

**Motor completo hasta M-15.** Mapa, edificios, obras, caminos, bosque,
personas, subsistencia, encrucijadas con las 17 plantillas, crónica, y el
orquestador del tick. Suite rápida y banco de balance funcionando.

**Hito 0 entregado técnicamente y SIN VALIDAR.** Las tres crónicas se generan
(74, 150 y 147 líneas, legibles desde el filtro de pesos de la v2.14) y **nadie
ajeno al proyecto las ha leído.** El criterio de §9.4 dice que eso es lo que
decide si el proyecto sigue. Es la deuda más antigua y la única que ningún
agente puede saldar.

**Hito 1 (render) sin empezar.** M-16 a M-19. Y recuerda §14.3: **M-19, las
capturas automáticas, va antes que M-17.** No es orden de conveniencia, es la
mitigación del riesgo número uno de `valle.md` §12.

**Programa gráfico (anexo D) en marcha, en paralelo y sin tocar el juego.**
G-00 a G-03 cerradas y P1 decidida (`e7ab614`): las dos direcciones se quedan
como dos materiales de casa dentro de un mismo estilo. **G-04 quedó a medias
cuando el equipo que la ejecutaba se volvió inalcanzable el 11 sep 2026**, con
la rama `graphics/g-04-villager-rig` sin publicar. El cierre, lo que hay en
riesgo y el orden de recuperación están en
`docs/graphics-rounds/G-04-INTERRUMPIDA.md`.

### Lo que está fuera de banda, y por qué se deja así

| Métrica | Medido | §12.9 |
|---|---|---|
| Partidas terminadas, `prudent` | 1,7 % | 2–12 % |
| Partidas terminadas, `worst` | 10,0 % | ≥ 25 % |
| Horquilla | 8,3 pts | ≥ 20 pts |

**Dos hipótesis falsadas seguidas** (la puerta de ocho habitantes, la capacidad
como palanca) significan que falta evidencia, no que falte una tercera
conjetura. La fase de balance se cerró en la v2.47 y el banco queda como red de
regresión. Las tres pistas vivas están anotadas en §2.47 del diseño, sin tocar.

---

## 3. Qué hacer a continuación

**El render, y en este orden: M-19 → M-16 → M-17 → M-18.**

Dos motivos, y ninguno es que el balance esté resuelto:

- **§16.2 ya lo dice:** el ritmo «solo se puede resolver jugando». Lo que falta
  por saber no es qué constante mover, sino si un jugador *siente* la diferencia
  entre jugar bien y jugar mal. Eso no lo produce ningún banco.
- **El hito 0 sigue sin juez**, y una crónica se lee mejor cuando existe el
  valle que la acompaña.

~~Antes de empezar, dos arreglos de una línea que la v2.47 dejó decididos y sin
aplicar: `forest_cut` con `forestLeft > 0.12` y `relic_pedlar` sin tope de fe.~~
**Hechos.** Comprobado el 11 sep 2026: ambos entraron en `8680956`.
`forest_cut` lleva el `> 0.12` en `catalog/forest.ts:20`, y `relic_pedlar` sólo
conserva el suelo `faith > 30`, sin tope. No hay nada que aplicar aquí.

---

## 4. Trampas que ya han costado tiempo

No son teoría: cada una se pagó con al menos una ronda.

- **El invierno es el momento más lleno del granero.** La cosecha es la semana 35
  y el invierno empieza en la 36. Ninguna plantilla de escasez se apoya en la
  estación; se apoya en `grainToHarvest`. Se cayó dos veces, en A.1 y en A.4.
- **Una condición ambiental dispara siempre que el techo lo permite** (§8.1,
  regla episódica). Y su reverso: **una condición sobre una carencia o un rango
  muere cuando la carencia se cubre** (§8.1, regla de la aldea madura).
- **Un umbral que pasa por el motivo equivocado es peor que uno que falla.**
  `worst` llegó al 100 % de terminaciones midiendo una sola opción repetida 178
  veces. Cuando una política degenera, se arregla **la política**, no el juego.
- **El precio escrito es un contrato** (§8.1). De 48 opciones auditadas, 13
  mentían. Si el texto promete un coste y los efectos no lo entregan, el jugador
  aprende que las opciones duras son palabrería.
- **Nunca un umbral con una sola semilla.** Dos partidas divergen desde el primer
  tick.
- **Dos copias de la spec divergen.** Se sincroniza reemplazando, nunca
  parcheando, y siempre construyendo sobre la copia del repositorio.

---

## 5. Deudas sin dueño

1. **La lectura del hito 0 por un tercero.** Las tres crónicas, sin contexto y
   sin el documento de diseño, y una sola pregunta: *«¿en qué se diferencian
   estas tres aldeas?»*. Ni quien diseñó el juego ni quien lo programó sirven.
2. **El presupuesto del banco.** 638 s de los 900 tras la subida de la v2.45, que
   queda escrita como la última sin optimizar.
3. **Cuatro plantillas al filo del 1 % de elegibilidad** (§12.9), entre 1,0 % y
   2,5 %.
4. **Los hitos 4, 5 y 6** siguen esbozados en §16, a propósito.
