# La fusión de las cuatro ramas del 29 sep 2026

Cuatro sesiones trabajaron el mismo día en paralelo sobre `main` y entraron en
cinco PR entre las 21:54 y la 01:29. Este papel es el esquema de lo que trajo
cada una y la auditoría de cómo quedaron juntas, medida sobre `main` en
`7d027bb`. **Es una foto: no se actualiza.** Lo que haya que arreglar se
reparte a la rama dueña y se apunta en `docs/task-log.md`.

## 1 · Esquema

```
main (efafc2e)
 │
 ├─ PR #2  21:54  ANIMACIÓN   ccr-48790acc   AN-0…AN-4d + F-0     v4.97–v5.01
 │          clips del aldeano, marcha por suelo, rumbo de animales, gestos
 │          a 20 px, combate humano, cueva del oso; F-0 física en sombra.
 │          skills nuevas: animacion, fisica-combate
 │
 ├─ PR #3  23:23  MODELOS 3D  ccr-76cdd621   animales rehechos     v5.02–v5.11
 │          12 GLB en un estilo facetado (vaca, ciervo, pato, cuervo,
 │          gallina, mula, jabalí…), 3–4× más ligeros; la CI que termina.
 │          (ya traía la PR #2 fusionada)
 │
 ├─ PR #4  23:42  GRÁFICOS    ccr-81589d5f   GV-0…GV-3             v5.12
 │          el pie de las casas (contact-shade), el prado hondo, el
 │          seguido a la vista (forest-occlusion), ?aa= a prueba.
 │
 ├─ PR #6  00:35  ANIMACIÓN   ccr-48790acc   AN-5                  v5.13
 │          la caza física (hunt-bodies: la cápsula es la malla del
 │          tronco de la PR #3), la lanza clavada, el oso que dura.
 │
 └─ PR #7  01:29  SONIDO      ccr-a64fa8a0   fases 1 y 2           v5.14–v5.20
            la interfaz suena de materiales; ui/ambience.ts con 14
            lechos (viento, lluvia, río, fuego, pájaros); skill
            sonido-del-valle. Renumerada: salía de v4.97–v5.02.
```

Quién lee a quién: AN-5 se construyó **sobre** los modelos de la PR #3 (sus
cápsulas salen del tronco del GLB y `hunt-bodies.test.ts` avisa si cambia).
GV revela la escena de caza en el bosque (`encounterTargets`). El sonido lee
el renderer sólo por `GraphicsStats` (`contracts.ts`) y no toca `renderer.ts`.

## 2 · Puerta sobre `main`

- `npm run typecheck`: limpio.
- Marcadores de conflicto en el repo: ninguno.
- Las pruebas de la frontera entre ramas (hunt-bodies, graphics-animal-motion,
  animal-gait-axis, contact-shade, forest-occlusion, screen-aa, art-manifest,
  approved-assets, life-bear, sound): verdes.
- Lint y suite rápida entera: ver §5.

## 3 · Cómo combinan

**Sin roturas de código.** Los clips que pide `animal-motion.ts` están en los
GLB nuevos; los nodos del tronco que usa `hunt-bodies.ts` existen (Torso,
Plump_Body, Barrel, Massive_Torso; el conejo conserva su caja). El pie de las
casas es una máscara del suelo y no toca presas, flechas ni oso. El FXAA sólo
se monta con `?aa=fxaa`. El sonido compila contra `day-phases.ts` y
`contracts.ts` tal como quedaron.

## 4 · Huecos, por dueño

### Sonido
1. **Nada de lo que trajeron las otras ramas suena**: caza (honda, arco,
   lanza, acierto, pieza caída), oso, combate (flecha, golpe al portón,
   portón roto). Está en `docs/plan-audio-mundo.md` §3.7–3.8 como descriptor,
   pero el plan es anterior a AN-5 y describe el oso «sólo tras cazar el
   jabalí», ya desfasado.
2. Falta el contrato: qué contadores (`audioSnapshot` en `GraphicsStats`)
   tienen que publicar caza y combate para que el sonido los oiga. La skill
   `sonido-del-valle` §6 enseña a fabricar un sonido, no a engancharlo desde
   la vida o el combate.
3. `sound.ts` no suspende el `AudioContext` al ocultarse la pestaña (los
   lechos se funden por `document.hidden`, el contexto sigue vivo): coste en
   móvil.
4. Sin tope de voces; con el combate hará falta.
5. `?sandbox=battle`: los botones suenan y el fondo no. Nadie ha decidido si
   el banco debe sonar.
6. `?render=canvas`: `worldSound` depende de `viewCentre`, `sunPhase` y `sky`
   del renderer 3D; sin verificar en el camino de vuelta.
7. `tests/fast/sound.test.ts` tarda 28 s por una prueba de sesenta años de
   acentos: según CLAUDE.md va a `tests/journeys/`.
8. Sin sección en `docs/design.md` ni fila en `docs/plan-meta.md`.

### Animación y caza (PR #2 y #6)
1. Publicar para el sonido los sucesos de caza y combate (con el punto 2 de
   Sonido).
2. `tools/art/bake-clips.mjs` no tiene fila en `tools/README.md`.
3. Las skills `animacion`, `fisica-combate` y `battle-sandbox` no dicen nada
   del sonido: un gesto o suceso nuevo debería apuntar su sonido esperado en
   `docs/encargos-3d.md` (la tabla «El sonido del mundo destapó estos huecos»
   ya existe).
4. `animacion` no recoge «modelo nuevo ⇒ mide su tronco», que sólo vive en
   `fisica-combate` §3b.
5. `docs/design.md` describe la caza por aparición y desbloqueo, no por lo que
   AN-5 hizo (el contacto de Rapier decide).
6. Ya abiertos y apuntados: el oso renace en la cueva en el relevo del primer
   anochecer; la honda sin gesto; sangre y fuego.

### Gráficos (GV)
1. Enlaces rotos en `docs/encargos/profundidad-visual-movil-2026-09-29.md:16-17`
   y en la `…-revision-…md:142,354` (una captura y `world/foot-shadows.ts`, que
   se llama `contact-shade.ts`).
2. Publicar `waterfallSites`: el lecho de cascada existe y no suena nunca
   (apuntado en `encargos-3d.md`).
3. `revealAssault` se llama en tres sitios de `renderer.ts` y `stepReveal` en
   uno: redundante, no dañino.

### Modelos 3D
Nada urgente. Zorro, conejo y aldeano siguen con el esquema anterior, como se
pidió. El ladrido del perro es decisión de Vera.

### De todos
1. **No hay medida combinada de rendimiento.** Cada rama midió sola y en
   portátil (GV +24 µs siguiendo a alguien; AN-5 12–22 ms al crear el mundo de
   contacto; sonido sin medir). Falta una toma en iPhone o iPad con caza en
   marcha, valle grande, `?aa=msaa` y sonido, anotada en la skill
   `performance`, que no menciona ninguna de las cuatro rondas.
2. **El papel quedó desordenado.** `changelog.md` pone v5.13 (AN-5) encima de
   v5.20…v5.14 (sonido). `task-log.md` empieza con todo el sonido y la v5.15
   («a la espera de variantes») por encima de la v5.20, lleva fechas «30 sep»
   y no tiene un «qué está abierto» único. CLAUDE.md no nombra el sonido ni
   las skills `fisica-combate`, `sonido-del-valle` o `monetizacion-marketing-valley`.

## 5 · Suite y CI

- Local sobre `7d027bb`: typecheck y lint limpios.
- CI de `main` con AN-5 dentro (#280, sobre `6b677bc`), según las sesiones de
  modelos y animación:
  - **fast** en verde (typecheck, suite rápida, build, lint). En #276, justo
    antes de AN-5, estaba en rojo.
  - **browser** (`test:shots`) en rojo: los 12 recorridos ya conocidos más uno
    de M-0 (el trato en el camino), igual que en #276.
  - **journeys** terminan por primera vez (48 min, tope 60): 168 bien y **21
    rojas en 13 ficheros**, no las 2 declaradas.
    - Declaradas: `notices` (los catorce avisos). La segunda ya no sale como
      «palanca del bosque»; en su lugar sale `fate-chaos`.
    - De tiempo: `life-decide`, «una jornada entera cuesta poco» (4,2 s en la
      CI contra 2,5 de tope).
    - Ya rojas antes de AN-5: tres de `life-wildlife`.
    - Sin dueño todavía: `e3b-corridor` ×5, `wall-rings`, `works` (un muro en
      una casilla prohibida), `life-props` ×3, `life-places`, `work-contact`,
      `engine-long` (las riñas), `founding`, `title-cooperative`.
    - Ninguna en las pruebas de caza ni de oso.
- **Nadie sabe todavía de qué PR viene cada roja:** todas las ejecuciones de
  jornadas anteriores se cortaban en el tope de 60 minutos, así que no hay
  línea de base. La comparación de los 13 ficheros sobre `efafc2e` (el `main`
  de antes de las cuatro ramas) contra `7d027bb` está en marcha; su resultado
  va a `docs/task-log.md`.
