# Encargo · Los clips de combate (E1)

**Para la sesión de Blender.** 18 sep 2026.

**Estado actualizado el 20 sep:** E1 y E1b entregan por código, sobre los huesos
publicados, `bow_draw`, `bow_loose`, `gate_strike`, `fall`, `spear_thrust` y
`hit_take`. No son clips nuevos dentro del GLB. Queda `flee`; este encargo
conserva debajo su formulación original. [E1b](../historico/life-rounds/E1b-cuerpo-a-cuerpo.md).

Este es el camino largo del proyecto: **hoy no existe ni un solo clip de
pelea**, y sin ellos la batalla de `design.md` §1b no se puede ver por bien que
funcione el motor. Todo lo demás de la fase 4 ya está o está en marcha —el mundo
físico (D1), la partida que llega (D3), la amenaza y el aviso (B1, B2)— y lo que
falta para que se vea es esto.

---

## Lo que ya existe, y con lo que hay que casar

**El aparejo del aldeano.** Los doce aldeanos de G-17/G-18 están en
`public/assets/valley3d/` (`villager.glb`, `villager-smith.glb`, …) y comparten
esqueleto. **Estos clips son para ese mismo esqueleto**: no hay personaje nuevo
que aparejar, y por eso este encargo es de animación y no de modelado.

**Los clips que ya tiene** (`src/render3d/clips.ts`), para que los nuevos se
parezcan a ellos en peso y velocidad:

| Clip | Dura | En bucle |
|---|---|---|
| `idle` | — | sí |
| `walk` | — | sí, y **avanza con el suelo pisado**, no con el reloj |
| `work_hoe` | 2,4 s | sí |
| `chop` | 2,2 s | sí |
| `hammer` | 1,6 s | sí |

**La cámara.** Ortográfica y bastante alta (Anexo D). Lo que se lee a esa
distancia son **siluetas y trayectorias grandes**, no expresiones ni dedos: un
brazo que sube entero se ve, una muñeca que gira no.

**La escala.** Una celda son tres metros; un aldeano mide poco menos de dos.

---

## Los seis clips, por orden de necesidad

### 1 · `bow_draw` — tensar (bucle)
De pie, arco en la mano izquierda, la derecha tira de la cuerda hasta la
mejilla. **En bucle y sostenible**: un arquero puede estar así varios segundos
esperando a que algo entre en alcance. Duración 1,5 s.

### 2 · `bow_loose` — soltar (una vez)
Sale de la postura anterior: la mano derecha se abre, el cuerpo acusa el
retroceso, el arco baja. **Corto y seco**, 0,6 s. La flecha no es parte del clip
—la lanza la física (D1)— así que lo único que importa es que el instante en que
la mano se abre sea reconocible: ahí es donde el juego dispara.

### 3 · `spear_thrust` — golpe de lanza (una vez)
El arma de la aldea es la lanza, no la espada: es lo que una herrería de valle
fabrica y es lo que `arms` (C1) pone en sus manos. Un paso adelante y la punta
sale de frente. 0,9 s.

### 4 · `hit_take` — recibir el impacto (una vez)
El torso acusa el golpe, un paso atrás, los brazos suben. 0,5 s. **No es morir**:
de aquí se vuelve a `idle` o se encadena con el siguiente.

### 5 · `fall` — caer (una vez, y se queda)
De pie al suelo. **La última pose tiene que quedarse quieta y creíble**: el
cuerpo se queda ahí hasta que la escena acabe, así que la pose final es la que
más se va a mirar de todo este encargo. 1,2 s.

### 6 · `flee` — huir (bucle)
Correr, no andar: es lo que hacen los que no pelean cuando la partida entra.
Reutiliza `walk` acelerado sólo si de verdad se lee distinto; si no, es clip
propio. 0,8 s de ciclo.

---

## Cómo se entregan

Los mismos pasos que G-17/G-18: los clips en el GLB del aldeano base, con **el
nombre exacto** de la lista de arriba, y pasan por `art/catalog.json` como todo
lo demás. Una prueba del proyecto (`graphics-clock`) compara los clips
declarados con los del GLB, así que un nombre distinto se ve en el acto.

## Y dos cosas que **no** son de este encargo

- **El gore.** Cómo se ve morir y cómo arde una casa es decisión del dueño del
  diseño y no está tomada (`encargos-3d.md` §3).
- **El ragdoll.** Cuando un cuerpo caiga por física y no por clip, saldrá de
  Rapier (D1, ya integrado). `fall` es el clip; el ragdoll es otra cosa y viene
  después.

---

**Prioridad, dicha claro:** con `bow_draw`, `bow_loose` y `fall` ya se puede
hacer una defensa que se mire. Los otros tres son para la pelea cuerpo a cuerpo
(D4), que va detrás.
