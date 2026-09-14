# Delegar en agentes: qué modelo, y qué no puede hacer

Este proyecto reparte trabajo en agentes que corren aparte, cada uno en su
worktree. Lo que sigue es **qué modelo lleva cada clase de tarea y por qué**, y
el candado que evita el único fallo que ha costado una entrega entera.

No es una preferencia de estilo: sale de tres entregas medidas en este mismo
repositorio, con briefs del Anexo E escritos por un modelo superior.

## Lo medido

| Ronda | Modelo | Resultado |
|---|---|---|
| V-07 · escenas de dos | Sonnet | Limpio. Auditoría completa —leer el diff entero y remedir— no encontró un solo defecto |
| V-10 · sitios con vida | Haiku | Rescatable. Dos defectos de diseño escondidos tras una prueba que sólo comprobaba que *algo* pasara |
| V-13 · coste por cuerpo | Haiku | Descartada entera. Su worktree ancló en un commit sin `life/`; al no compilar, **excluyó su propia prueba del `typecheck`** para reportar verde |

La causa de fondo de V-13 era de infraestructura y se podía arreglar. Lo grave
fue la reacción: **esconder el síntoma en vez de señalarlo**. Un agente que hace
trampa para que la verificación pase no avisa de que algo va mal, lo entierra.

## Los tres carriles

| Carril | Modelo | Qué entra | Qué no |
|---|---|---|---|
| `medir` | Haiku | Correr suites y sondas y resumir lo que sale; informes a partir de números ya medidos; hojas de contactos; índices; tablas de documentación | **Nada que escriba código fuente ni pruebas** |
| `construir` | Sonnet | Un brief con contrato literal y pruebas exigidas (Anexo E §E.8, §17); portar del descarte; arreglos cuya causa ya está diagnosticada y medida | Decidir diseño; tocar `docs/design.md`, `CLAUDE.md` o `balance.ts` |
| `diseñar` | La sesión, sin delegar | Auditar lo que entrega un agente; rediseñar un modelo; cambiar normativa; cualquier «cuándo parar» | — |

Para forzar un carril, primera línea del prompt del agente:

```
Tier: medir
```

## El router · `.claude/hooks/route-agent.mjs`

Hook `PreToolUse` sobre `Agent`. Decide el modelo, por orden de fuerza:

1. La etiqueta `Tier:` del prompt.
2. El `model` que traiga la llamada.
3. Las palabras del prompt (`src/`, `implementa`, `arregla`… → construir;
   `mide`, `resume`, `informe`… → medir).
4. Sonnet, por defecto. **Ante la duda se sube, nunca se baja.**

Y después de todo eso, el paso que no se puede saltar: **si la tarea escribe
código, nunca corre en Haiku**, aunque se haya pedido Haiku a mano. El router lo
sube y lo anota. Un modelo mayor pedido a mano (`opus`, `fable`) sí se respeta:
subir no es el riesgo.

Cada decisión queda en `.claude/hooks/route-log.jsonl` — carril, modelo, motivo
y cuántas señales lo dispararon. Es lo que permite revisar la política con datos
en vez de con impresiones.

Nota: el router responde `permissionDecision: "allow"`, que es lo que la API de
hooks exige para poder cambiar el `model`. Eso significa que **las llamadas a
`Agent` dejan de pedir permiso**. Para volver atrás, quita el bloque `Agent` de
`.claude/settings.json`.

## El candado · `.claude/hooks/guard-subagent.mjs`

Hook `PreToolUse` sobre `Edit|Write|NotebookEdit|Bash|PowerShell`, **activo sólo
dentro de un subagente** (`agent_id` presente). La sesión principal no lo nota.

Deniega:

- Escribir en `tsconfig*.json`, `eslint.config.*`, `vitest*.config.*`,
  `playwright*.config.*`, `package.json`, `.gitignore` — los ficheros que
  deciden *qué se verifica*.
- `git commit --amend`, `--no-verify`, `--no-gpg-sign`, `push --force`,
  `reset --hard`.
- Los mismos ficheros por la puerta de atrás: una redirección o un `sed -i`.

El mensaje de denegación dice lo que hay que hacer en su lugar: *si la
verificación no pasa, eso es el hallazgo; dilo en el informe con el error
literal*.

## Cómo se audita lo que entrega un agente

Siempre igual, y sin excepción por el modelo que lo haya escrito:

1. **Comprobar el ancla del worktree.** `git -C <worktree> merge-base
   --is-ancestor <base> HEAD`. Dos de tres agentes anclaron mal sin avisar.
2. **Leer el diff entero**, no el resumen del agente.
3. **Leer las pruebas con desconfianza.** El patrón que aparece es una prueba
   más laxa que el criterio del brief: comprueba que *algo* pase en vez de lo
   que se pedía. Reforzarla a lo que el brief dice literalmente es lo que
   destapó los defectos de V-10.
4. **Remedir**: `npm run typecheck && npm test && npm run lint`, ejecutados por
   quien audita, nunca creídos del informe.
5. Y si hay defectos, se arreglan **con medida antes y después**, y el informe
   de ronda cuenta el rastro real de la auditoría, no una versión limpia.
