# El histórico — lo que entregó lo suyo

**Nada de aquí dice qué hacer ahora.** Para eso están `docs/task-log.md` (el
punto exacto) y `docs/plan-meta.md` (el plan hacia la meta). Esto se lee cuando
hace falta entender **por qué** una línea de código es como es, y por eso se
conserva entero en vez de borrarse: cada uno de estos documentos está citado
desde el código, y esas citas son la mitad de su valor.

Se separó del resto el 19 sep 2026, moviendo los ficheros y reescribiendo sus
398 referencias. El mapa completo está en [`../README.md`](../README.md).

---

## Los planes entregados

| Documento | Qué fue | Qué entregó |
|---|---|---|
| `plan-juego.md` | El plan que sacó al proyecto del atasco (15 sep 2026) | **v2.0**: las tres palancas de órdenes permanentes, el reloj a velocidad entera, el mapa grande de 72 × 112 y el vado que se cruza. Sus decisiones se citan como «D-n» desde `balance.ts` |
| `rework.md` | «Mucho más aleatorio y con mucha más vida» (15 sep 2026) | **R-1**: los sucesos del valle (§7.10, §12.10, paso 2b del tick), y las dieciocho rondas de IA de la capa de vida. Su §4b definió los medios (M-0 a M-4). Lo que quedó abierto —R-2, R-3, R-5— lo recoge `plan-meta.md` |
| `plan-medios.md` | El juego de los medios (17 sep 2026): «le das una pala o un martillo y hacen cosas distintas; tú no les dices qué hacer» | **M-0 a M-4**: dar en vez de mandar. Retiró las palancas, midió que sólo vivía la postura de fábrica, y dejó `tools/reports/agency-report.ts` como la medida que cierra cada fase |
| `plan-rey.md` | La fase del rey (18 sep 2026) | **K-1 a K-8**. Lo que llegó y lo que no está medido en `../medidas/rey-medida.md` |
| `next-plan.md` | Los briefs de la auditoría del 15 sep 2026 | **U-10 a U-14**: el menú de inicio, el inicio guiado desde lo alto, el reloj con horas y las tormentas con rayos |
| `brief-reloj.md` | Qué costaba afinar el tick (14 sep 2026) | **v3.72**: una semana son catorce minutos a ×1, y la cabecera puede decir la hora |
| `life-ai-proposal.md` | Propuesta de IA para aldeanos y fauna (16 sep 2026) | **Superada** por las rondas IA-1 a IA-18, que sí están implementadas. Se lee por el diagnóstico, no por el plan |

## Los informes de ronda

Uno por ronda, con lo que se midió y en qué quedó. Se citan desde el código y
desde `design.md` para explicar una decisión concreta.

| Carpeta | Qué hay |
|---|---|
| `graphics-rounds/` | Las rondas de gráficos **G-00 a G-25**, con sus prompts, sus traspasos y los encargos de Blender de la aldea y los aldeanos |
| `life-rounds/` | Las rondas de la vida del valle: **V-00 a V-14** (la capa de vida) e **IA-0 a IA-18** (la IA escénica), más la sonda de línea base y la evidencia en capturas |
| `sesiones/` | Notas de sesión |

---

**Cuándo entra algo aquí.** Cuando un plan entrega y deja de decir qué hacer.
Se mueve con `git mv`, se le reescriben las referencias en la misma ronda, y se
añade su fila arriba con **qué entregó** — no con qué prometía.
