# G-04 · Ronda interrumpida por pérdida del equipo

**11 de septiembre de 2026 · Escrito desde una sesión en la nube, sin acceso a
la máquina donde vivía la ronda.**

Este documento no es el informe de G-04. G-04 no ha terminado y nadie puede
decir desde aquí en qué punto estaba. Existe para que quien vuelva a la máquina
sepa **qué hay en riesgo, dónde está, y en qué orden tocarlo** — y para que no
repita trabajo que ya está hecho.

---

## 1. Qué pasó

La sesión `The-valley v2.10 sync and M-10 orchestration`
(`session_01XmaJKycWhfC4ZdU72RKXTA`, VS Code, puente `remote-control-sdk`)
perdió el enlace con el equipo.

| | |
|---|---|
| Error registrado | `computer_unreachable`, `recoverable: true` |
| Momento | 2026-09-11 **06:17:12 UTC** (08:17 CEST) |
| Estado de la sesión | `IDLE` — no se cortó a mitad de un turno |

**No fue VS Code.** La otra sesión puente de la misma máquina
(`Dispatch background conversation`, app de escritorio) registró el mismo
`computer_unreachable` a las **06:17:00 UTC**, doce segundos antes. Dos puentes
independientes caídos en la misma ventana apuntan a la máquina o a su red, no a
un editor que se cerró.

La causa más probable con el equipo configurado para no apagarse es la
**suspensión del adaptador de red**, que en macOS y Windows es independiente de
la pantalla.

---

## 2. Qué hay en riesgo, y sólo ahí

Último estado del árbol de trabajo que el puente reportó, **2026-09-11 00:50:05
UTC** (02:50 CEST) — cinco horas y media antes de la caída:

```
rama:             graphics/g-04-villager-rig
head:             b8201e3be9b0eac4a3352c152d5d4bc9dbaf7058
is_dirty:         true     ← cambios sin commitear
upstream_exists:  false    ← la rama no existe en origin
```

Comprobado contra `origin` el 11 de septiembre: sólo están `main` y las ramas
`codex/*`. **`graphics/g-04-villager-rig` no ha salido nunca de ese disco.**

No está perdido — una desconexión no borra ficheros — pero entre las 00:50 y la
caída pudo haber más trabajo que ni siquiera llegó a reportarse. **El estado de
arriba es un suelo, no un inventario.**

### Lo que NO está en riesgo

Todo lo demás está en GitHub. `main` está en `e7ab614`, con P1 cerrada y G-03
informada. Nada de la caída toca al motor, al banco de balance ni a las rondas
G-00 a G-03.

---

## 3. Dónde estaba G-04

**Objetivo** (`docs/design.md` D, brief G-04): personaje terminado y cuatro
clips iniciales coherentes. Ficheros `art/recipes/villager/`, `tools/art/rigs/`,
`tools/art/animations/`, `tools/graphics/animation-audit.ts`.

**Terminado cuando** caminar, trabajar y cargar se reconocen desde la cámara de
juego sin deformaciones graves.

**Criterio de entrada heredado de P1**, y es el que manda: un aldeano tiene que
reconocerse **por silueta, no por color**, a 390 px de ancho y con la paleta en
contra. P1 dejó dicho que de cerca el aldeano de la dirección A se camufla con
su propia casa. Si G-04 no resuelve la silueta, la decisión de ropa vuelve a
estar sobre la mesa — y se decide con una imagen, no antes.

**Lo que G-03 dejó servido:** el aldeano ya tiene jerarquía de miembros
(`Villager_UpperArm_L`, `Villager_Shin_R`…) y `animationNames` vacío. Ese es
exactamente el punto de partida de G-04.

---

## 4. Al volver, en este orden

1. **Salvar antes que nada.** En la máquina, sobre `graphics/g-04-villager-rig`:
   `git status`, commitear lo que haya suelto, y
   `git push -u origin graphics/g-04-villager-rig`.
   Hasta que esto ocurra, la ronda depende de un solo disco.
2. **Inventariar de verdad.** `git log origin/main..HEAD` y `git diff` dicen qué
   hizo la ronda. Este documento no lo sabe.
3. **Reconectar la sesión.** El transcript vive en el servidor y
   `recoverable: true`: al abrir VS Code debería volver, con su contexto.
4. **Desactivar la suspensión de red** antes de lanzar otra ronda larga. En
   macOS, `Wake for network access`; en Windows, el ahorro de energía del
   adaptador en el Administrador de dispositivos. Evitar que se apague la
   pantalla no basta — esta caída lo demuestra.

---

## 5. Qué no se pudo hacer desde la nube, y por qué

Para que no se intente otra vez creyendo que es cuestión de insistir:

- **Retomar G-04 es imposible desde aquí.** El código no está en `origin` y esta
  sesión no tiene ninguna vía hacia esa máquina.
- **Ejecutarlo tampoco.** Blender no está instalado en este contenedor, y la
  cadena de G-02 —receta → Blender → GLB → Three.js → promoción— lo exige.
- **El veredicto visual sigue siendo del usuario.** Aunque la cadena corriera,
  D.0 y P1 dicen que la aceptación de la silueta la da una persona mirando una
  imagen. Ninguna medición la sustituye.
