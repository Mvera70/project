# E2 · Identidad visual del clan vecino

## Objetivo

El asedio ya tiene cuerpos, armas y gestos; su atacante aún usa la figura del
forastero de nuestra aldea. Crear **una figura adulta** del valle vecino que se
reconozca durante la aproximación y el asalto como un aldeano armado de otra
comunidad. No es un soldado de cota ni un bandido andrajoso. El arma sigue
siendo el arco o la lanza existentes, con escudo cuando corresponda: la figura
no lleva un arma pegada a la mano. No añadir espada en esta ronda.

Vera autorizó a Astra **sólo el modelado 3D**. Sol dirige y revisa; otro agente
integrará el recurso en el juego. El cierre de E2 requiere esa integración y
una prueba de lectura en la cámara real, no sólo la entrega del GLB.

## Depende de

- `docs/design.md` §1b y D.2–D.4: otro valle, mismo lenguaje visual y pipeline
  reproducible.
- `art/recipes/villager/villager.json` y
  `art/recipes/villager-stranger/villager-stranger.json`: escala, rig,
  conectores y clips de referencia.
- `docs/plan-meta.md` E2 y `docs/encargos-3d.md`: hueco concreto.
- `docs/historico/life-rounds/E2-integracion-y-defensa.md`: arco, flecha,
  lanza y escudo ya integrados.

## Ficheros y reparto

**Astra, exclusivamente modelo:** nueva receta
`art/recipes/villager-neighbor/villager-neighbor.json`, si hace falta un color
con nombre propio `art/recipes/palette.json`, y la declaración/artefactos que
exija `npm run art -- all villager-neighbor`. Entregar el GLB candidato,
render, medidas y comparación de rig. No tocar `src/`, `tests/`, publicación en
`public/`, ni `docs/plan-meta.md`; no cambiar navegación, animación, físicas,
balance o historia. No sobrescribir recetas ni GLB aprobados.

**Integración posterior:** registrar/publicar selectivamente el único recurso,
pedirlo en `WANTED`, asignarlo sólo a los raiders y conservar respaldo a
`villager-stranger`/`villager`. Hacer pruebas focales y capturas del juego.

## Contrato del modelo

1. Misma convención del adulto base: altura de **0,65 celdas**, pies al suelo,
   eje y orientación, rig de **16 huesos con nombres y orden idénticos**,
   conectores libres `hand_l` y `hand_r`, cuatro materiales, y los cuatro
   clips compartidos `idle`, `walk`, `work_hoe`, `carry_walk`. No incrustar
   los gestos de combate E1: el renderer ya los compone por código. Las manos
   deben seguir sujetando el arma y el escudo sin atravesar ropa/capa.
2. Debe leerse como **aldeano de otro valle** a distancia de partida: ropa
   campesina cuidada pero de procedencia distinta, una silueta reconocible
   por una prenda de tela visible de frente y espalda y una paleta propia.
   No usar metal de uniforme, cota, casco, insignia militar, harapos de
   bandido ni imaginería de facción nueva. El parecido anatómico con los
   aldeanos propios es deliberado. La diferencia no puede depender sólo de
   una variación mínima de color.
3. Mantener la simplicidad low-poly y el límite material de las figuras
   existentes. La figura actual `villager-stranger` tiene 936 triángulos,
   cuatro materiales y 0,65 celdas; usarla como referencia medible, sin
   inventar un presupuesto nuevo. Explicar cualquier crecimiento apreciable.
4. Fuente original del proyecto y reconstruible: receta y paleta semántica,
   no edición manual de un GLB. No contratar un proveedor de pago ni solicitar
   credenciales. El CLI `game-dev` no está disponible en este entorno; usar el
   pipeline nativo del repositorio, sin sustituirlo por una generación pagada.

## Pruebas y falsación

- Comparar huesos (nombre y orden), definiciones de clips, conectores,
  materiales y escala con el aldeano base. Ejecutar la construcción y
  validación focal del recurso por el pipeline nativo. Registrar rutas,
  hashes, dimensiones, triángulos y errores reales.
- Entregar un render con el ángulo de referencia del juego y una comparación
  junto a `villager-stranger` y el aldeano base. Si a tamaño pequeño se lee
  sólo como el mismo forastero recoloreado, revisar la silueta antes de
  integrarlo.
- La integración se falsará en `--raid` y `--assault` del observador de vida:
  grupo en aproximación, junto a puerta y en gesto de combate; arma/escudo en
  mano, caída y carga no deben romper el modelo. Verificar respaldo visual si
  falta el nuevo recurso. No alterar los resultados mecánicos del asedio.

Terminado cuando el modelo supera validación estructural, se distingue en
cámara real y el juego lo pide sólo para el clan vecino. La entrega de Astra
por sí sola no cierra E2. No hacer push ni despliegue por este encargo.
