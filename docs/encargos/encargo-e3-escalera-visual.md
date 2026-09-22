# E3 · Pegar la escalera aprobada, sin navegación elevada

## Objetivo

Vera aceptó provisionalmente el candidato de catorce peldaños el 22 sep 2026.
Integrarlo en la escena del juego sólo donde su celda interior esté libre y
orientarlo hacia el interior de la villa. G-26 queda disponible como respaldo.
Esta ronda **no** hace subir a nadie, no cambia origen de flechas ni cierra el
adarve. Si el acceso transitable lleva mucho trabajo, se hará después.

## Depende de

- `docs/design.md` §1–4, §7.4, D.3–D.4, D.9, E.1/E.3/E.6/E.7.
- `docs/encargos/encargo-e3-acceso-elevado.md` y
  `art/recipes/bastion-access-candidate/README.md` (contrato geométrico exacto).
- G-26 aprobado y publicado, hash `F3596D92…8663F`, no se sustituye a ciegas.

## Ficheros

Admisión nativa selectiva: `art/catalog.json`, sólo nuevo GLB en
`public/assets/valley3d/` y su entrada en `manifest.json`; candidato/fuente
en `art/recipes/bastion-access-candidate/` y productos generados bajo
`artifacts/graphics/`. Código: nuevo helper puro de elección en `src/derive/`,
`src/render3d/world/{plan,buildings}.ts`, `src/render3d/life/terrain.ts` si
es imprescindible para impedir atravesar la escalera, y pruebas focales de
plan, defensa y terreno. No tocar motor, balance, puesto de guarnición, cuerpo,
combate, físicas ni navegación multicapa. Si hace falta otro fichero, elevarlo
antes de tocarlo. Terra ejecuta; Sol revisa.

## Contrato

1. Verificar que el candidato aprobado conserva SHA-256
   `46E5A10C4D33361C1F36E5E18E6A06B5619A0B867C4EFD82EB3332A9FC1D503D`,
   caja 1×1,36×2, 1.236 triángulos y dos materiales. Admitir/publicar sólo ese
   asset por pipeline nativo con hash; no sobrescribir el `bastion.glb` G-26
   ni recursos ajenos. Un id adicional estable es preferible a renombrar la
   fuente de Astra o crear dos fuentes editables. Documentar la decisión de id.
2. Elegir variante y orientación con una función pura del `GameState`, la
   plaza fija y el anillo, no del `heart` efímero de la vida. Buscar sólo caras
   interiores cardinales; ante empate, desempate estable. La huella del modelo
   completo (celda del bastión + vecina hacia adentro) y la aproximación del
   cuerpo deben estar en terreno permitido, sin edificio vivo o en obra ni
   otra defensa. En codo diagonal, no atravesar vecinos. Si no cabe, usar G-26.
   La decisión debe ser la misma al reconstruir y al avanzar la partida.
3. Rotar el modelo y su huella alrededor del centro de la celda del bastión;
   comprobar los cuatro cardinales. No mover la torre de su celda ni alterar
   `defenceConnections`. Si el añadido sobresale por árboles transitables,
   comprobar que no se lea como escalera enterrada; si no se puede garantizar,
   usar G-26 en ese caso.
4. La escalera visible es obstáculo para peatones normales. Si no se puede
   cerrar su huella en `terrainOf` con el mismo criterio que la selección
   visual, **no integrar una escalera fantasma**: parar y reportar. Los guardias
   siguen en sus puestos de suelo y el tiro actual conserva sus cifras; no
   atribuirles la plataforma por el modelo nuevo.

## Pruebas y falsación

- Unitarias con los cuatro cardinales, un tramo diagonal, celda ocupada por
  casa/obra/defensa, agua/roca, bordes y sustitución incremental de la variante.
- Misma selección en plan y máscara de vida; ningún peatón atraviesa los
  peldaños, y ninguna defensa pierde cierre.
- Verificar que el manifiesto cambia sólo por el asset nuevo y conserva todos
  los hashes anteriores. `typecheck`, `lint` y tests focales, sin suite larga.
- Captura real del juego con al menos una escalera visible y sin solapamiento;
  la comparativa aislada del modelo no sirve como prueba jugable. Si las
  partidas medidas no ofrecen celda libre, documentar la frecuencia y dejar
  G-26 de respaldo sin declarar éxito visual.

Terminado cuando el modelo aprobado aparece sin invadir otros objetos en una
partida real, la elección y la colisión son coherentes y la deuda de subida
queda explícita en el plan y el cuaderno. No publicar demo remota ni hacer
push por este brief.
