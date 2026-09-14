# The Valley

Simulación idle de una aldea medieval para móvil. Una aldea vive durante
generaciones; el jugador interviene solo en las encrucijadas que cambian su
historia y su aspecto.

El motor está completo, el valle se pinta en 3D con Three.js y la aldea se mueve
por una capa de agentes con paso fijo. Quedan dos verificaciones que sólo puede
dar una persona: que alguien ajeno al proyecto distinga las tres crónicas del
hito 0, y que una partida guardada sobreviva varios días de juego real en un
teléfono para aceptar el hito 6.

- [Documento de diseño](docs/design.md): fuente de verdad, decisiones y briefs.
- [Registro de cambios](docs/changelog.md): qué cambió en cada revisión y por qué.
- [Traspaso](docs/handover.md): estado exacto, y las trampas que ya han costado
  tiempo.
- [Hoja de ruta](docs/roadmap.md): qué falta en total, y qué no puede hacer
  ningún agente.
- [Instrucciones para agentes](CLAUDE.md).

## Arrancar

```bash
npm ci
npm run dev
```

La partida se guarda en IndexedDB. La pantalla está diseñada y comprobada a
390 × 844 px. El valle se pinta en WebGL; `?render=canvas` devuelve el render 2D
original, que se conserva como puerta de vuelta mientras el 3D no se haya
probado en un dispositivo real.

## Validar

```bash
npm run typecheck
npm run test:all      # suite rápida (< 20 s) y recorridos (< 3 min)
npm run lint
npm run build
```

Tres niveles de prueba, cada uno con su presupuesto escrito en el diseño §14: la
suite rápida cubre propiedades puras; los recorridos viven jornadas escénicas y
siglos en varias semillas; el banco de balance corre sesenta semillas y
doscientos años y se lanza aparte con `npm run test:balance`.

Playwright cubre dos cosas distintas: `npm run test:shots` recorre las pantallas
de interfaz sobre el Canvas, y `npm run test:pwa` comprueba contra el build real
que el juego se instala, abre sin red **en 3D** y no pierde la partida. GitHub
Actions ejecuta las cuatro redes en cada cambio a `main`; el banco largo corre
cada noche y también admite un disparo manual.

## Mirar el juego

```bash
npm run shot
```

Empaqueta el juego entero en una sola página —con los treinta y nueve modelos
dentro— y lo fotografía sin necesidad de red. Es la única forma de juzgar un
cambio visual sin abrirlo a mano, y **ninguna ronda de interfaz se cierra sin
captura**.

## Preparar la lectura del hito 0

```bash
npm run reader:packet
```

Genera tres crónicas y las instrucciones del lector en
`artifacts/hito-0-reader/`. El veredicto debe darlo alguien ajeno al proyecto;
una prueba automática no satisface ese criterio.
