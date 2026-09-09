# The Valley

Simulación idle de una aldea medieval para móvil. Una aldea vive durante
generaciones; el jugador interviene solo en las encrucijadas que cambian su
historia y su aspecto.

El motor y la interfaz están implementados hasta **M-26**. Los hitos 1 a 5 están
aceptados. Quedan dos verificaciones humanas: que una persona ajena distinga las
tres crónicas del hito 0 y que una partida guardada sobreviva varios días de
juego real para aceptar el hito 6.

- [Documento de diseño](docs/design.md): fuente de verdad, decisiones y briefs.
- [Traspaso](docs/handover.md): método de trabajo y deudas que no debe fingir un
  agente.
- [Instrucciones para agentes](CLAUDE.md).

## Arrancar

```bash
npm ci
npm run dev
```

La partida se guarda en IndexedDB. La pantalla está diseñada y comprobada a
390 × 844 px, aunque el servidor de desarrollo se puede abrir en cualquier
navegador moderno.

## Validar

```bash
npm test
npm run build
npm run lint
npm run test:shots
```

La suite rápida cubre el motor y los contratos puros. Playwright recorre el
valle móvil, las encrucijadas, el letargo, el epitafio y la herencia.

## Preparar la lectura del hito 0

```bash
npm run reader:packet
```

Genera tres crónicas y las instrucciones del lector en
`artifacts/hito-0-reader/`. El veredicto debe darlo alguien ajeno al proyecto;
una prueba automática no satisface ese criterio.
