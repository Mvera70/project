# E3 · Modelo propio del bastión (solo arte)

## Objetivo

Entregar un bastión de piedra que se lea como **torre integrada en la línea de
muralla**, no como la atalaya exenta `watchtower.glb` encogida. Esta ronda acaba
en el modelo fuente, un GLB candidato y vistas de revisión. **No integra el
activo en el juego**, no corrige la junta de `defences.ts` y no cierra el apoyo
elevado de la guardia.

## Depende de

- `docs/design.md` §7.4, Anexo D §D.3–D.4 y D.9; `docs/encargos-3d.md` §2.
- Referencias existentes: `art/recipes/wall/wall.json`,
  `art/recipes/watchtower/watchtower.json`, la paleta de `art/recipes/palette.json`
  y sus GLB/renders aprobados en `art/catalog.json`.
- El motor reserva al `bastion` una huella **1×1 celda** y lo crea como mejora de
  `wall`; una celda del motor equivale a una unidad de escena. `wall` tiene
  cuerpo de unos 0,72 de altura y almenas próximas a 0,9; la atalaya exenta
  alcanza 2,75. Son datos de las recetas existentes, no una nueva cifra de
  balance para el bastión.

## Ficheros y entrega

Autoría exclusivamente en `art/recipes/bastion/` (o `art/source/bastion/` si
una fuente `.blend` manual es imprescindible y se declara canónica). Si el
runner necesita una entrada `study` en `art/catalog.json`, puede añadirse sólo
para fabricar/validar el candidato: **sin aprobar ni publicar**. Salidas
generadas en `artifacts/graphics/E3-bastion/` o en la carpeta de corrida que
cree el runner. No editar `src/`, `public/`, motor, navegación, colisiones,
balance, `tools/art/` ni otros recursos. No commit/push sin revisión.

## Contrato del modelo

- Id estable `bastion`; huella visual dentro de 1×1 celda, suelo al origen,
  vertical `+Y` al exportar y frente/orientación comprobados con el contrato
  D.4. Base de piedra más sólida y ancha que la atalaya exenta; cuatro caras
  capaces de recibir visualmente un tramo de muro cardinal en el centro.
- Silueta de bastión defensivo bajo/robusto con plataforma y parapeto de tiro,
  distinta del tejado y la galería ligera de `watchtower`. La plataforma es
  **visual**, no promete que la IA ya camine o se sitúe encima. No abrir paso de
  portón ni inventar mecanismo, arma o animación.
- Materiales mates y paleta existentes de piedra/mortero/madera si hace falta.
  Sin texturas externas, dependencias de pago ni proveedor generativo. Buscar
  un coste del orden del `watchtower` existente, no muchos objetos sueltos por
  bloque de piedra; declarar meshes, materiales y triángulos reales.
- La junta con el muro tiene dos partes: el modelo ofrece caras/base compatibles,
  pero `isDefence`/`defenceConnections` y el ensamblador actual aún deben
  reconocer `bastion`. **No resolver esa parte en esta ronda.**

## Prueba y falsación

Blender puede correr en segundo plano; no requiere ventana abierta. Exportar
`.blend` y `.glb`, validar carga, escala, caja, ejes, normales y materiales.
Entregar vistas isométrica y lateral y una lectura en escala junto a la silueta
de muro/atalaya, también en grises si el visor lo permite. Si parece una
atalaya reducida, no cabe en 1×1, invade el espacio vecino o sólo encaja con
una integración inventada, el modelo **no pasa**. Comunicar cualquier dato del
dueño que resulte imprescindible antes de decidir por él.
