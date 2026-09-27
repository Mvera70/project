---
name: performance
description: Cómo medir y mejorar el rendimiento de The Valley en 3D (Three.js + Rapier), sobre todo en tablet y móvil —llamadas de dibujo, sombras, resolución, sombreadores, CPU de la capa de vida—, con las herramientas del proyecto, las cifras de referencia y lo aprendido (qué funcionó, qué no y por qué). Úsala antes de tocar el render por rendimiento, al añadir mallas, modelos o efectos que puedan pesar, o cuando Vera diga que algo va lento.
---

# El rendimiento de The Valley

Lo pidió Vera el 27 sep 2026, tras probar la demo en su tablet: «arranca a 1 FPS…
también pasa con la aldea grande», «el rendimiento es nefasto», y «ve creando una
skill de rendimiento donde apuntes todo lo que vayas viendo y aprendiendo». **Esto es
un cuaderno vivo: quien mida algo nuevo, lo apunta aquí en la misma ronda.**

## Primero, medir — y qué se puede medir aquí

Las máquinas de los agentes no tienen GPU: Playwright dibuja con SwiftShader (por
software) y va a 1–3 FPS en cualquier escena. **Los FPS y los ms de GPU que salen aquí
no representan una tablet.** Lo que sí es comparable entre versiones:

| Cifra | Herramienta | Qué dice |
|---|---|---|
| Llamadas de dibujo por fotograma | `node tools/graphics/gl-probe.mjs <valley.html> "<query>" 60` | Lo que más castiga a una tablet con WebGL (CPU del driver + JS de Three por llamada) |
| Triángulos por fotograma | la misma | Carga de vértices (menos crítica que las llamadas) |
| Programas enlazados | la misma | Sombreadores distintos: cada uno se compila, y en móvil compilar tarda |
| JS por fotograma (mediana · p90) | la misma | CPU del juego: vida, animación, escena y el envío de las llamadas |
| Reparto de mallas por grupo | `node tools/graphics/scene-report.mjs "<query>"` (usa `window.__valleySceneReport()`) | De dónde salen las llamadas: mallas visibles, con sombra e instanciadas, por grupo y los edificios por tipo |

Escenas de referencia (siempre las dos, nunca una):

- **La villa grande**: `debug=1&seed=7&year=60&season=summer&live=1`
- **La aldea**: `debug=1&seed=11&year=21&season=summer&live=1`

Se mide sobre el juego empaquetado (`npx tsx tools/graphics/bundle-game.ts --out
artifacts/graphics/alive/game`) y, para comparar con una versión anterior, se monta
esa versión en otra copia (`git worktree add … <commit>` + un enlace a
`node_modules`) y se empaqueta igual. La sonda intercepta WebGL desde fuera, así que
mide cualquier versión.

**El perfil de CPU con CDP no sirve en SwiftShader**: el 94 % sale como `(program)`
(código nativo del dibujo por software) y los nombres vienen minificados. Para la CPU
de la capa de vida, mejor medir sin navegador (`tools/reports/battle-report.ts` hace
6.000 pasos de vida con Rapier en ~4 s: ~0,7 ms por paso).

Y la medida que falta y manda: **un aparato real**. Sin un móvil o tablet delante,
todo lo de arriba es comparativo. El banco del proyecto para eso es
`tools/graphics/bench-app.ts` (P-1a, ver `tools/README.md`).

## Cifras (27 sep 2026)

| Momento | Villa grande: llamadas · triángulos · programas · JS mediana/p90 | Aldea |
|---|---|---|
| Antes de las rondas del 26–27 sep (56d5f28) | 1.695 · 767 mil · 30 · — | 587 · 604 mil · 28 · — |
| Con montañas, agua, cascadas, pájaros y Astra | 1.724 · 795 mil · 36 · 16,4/21,7 ms | 607 · 632 mil · 33 · 7,0/9,6 ms |
| Tras esta ronda (lote de muralla, casas fundidas, animales sin sombra) | **796 · 718 mil · 35 · 14,8/19 ms** | **460 · 605 mil · ~33 · 6,2/8,7 ms** |

Lo que hay que retener: **las rondas de arte del 26–27 sep sumaron un 1–4 %; el peso
venía de antes**. Y la villa grande sigue por encima de lo cómodo para una tablet
(unas pocas centenas de llamadas).

## Lo aprendido

1. **Cada malla visible es una llamada, y cada una con sombra, otra más.** La villa
   tenía 1.029 mallas visibles y 730 con sombra: 1.029 + 730 ≈ las 1.724 medidas. Antes
   de optimizar nada, `scene-report` dice dónde están.
2. **La muralla era la mitad**: 347 tramos, cada uno su malla y su sombra. Como no se
   mueve, va en **lote** (`Village.batchWalls`, `batchStatic` en
   `src/render3d/world/merge-static.ts`): se funden por material en unas pocas mallas y
   se rehace sólo cuando el plan cambia algo (lo llama el renderer tras aplicar el plan).
   Los originales siguen en escena, escondidos.
3. **Fundir un edificio no sirve si cada pieza tiene su propio material.**
   `varyHouse` (`house-variation.ts`) y `roofsOf` (`buildings.ts`) clonaban el material
   **por pieza** (para teñir la casa y para la nieve del tejado), y eso impedía fundir.
   Ahora clonan **una vez por material de origen** dentro de cada edificio. Regla: si
   hace falta una copia privada de un material, una por material de origen y edificio,
   nunca una por malla.
4. `mergeStatic(root)` funde por material + sombras las mallas estáticas de un modelo.
   Deja fuera: mallas con esqueleto o instanciadas, las de varios materiales, las de
   atributos distintos y **lo que ya no cuelga del modelo** (la hoja de la puerta, que se
   saca a su bisagra antes). Se llama después de la bisagra y de copiar los tejados.
5. **Sombras de lo pequeño, fuera**: los animales (177 mallas) proyectaban sombra; a esta
   distancia no se ve y costaba 177 llamadas. `animal-motion.ts` las apaga.
6. **Aparatos táctiles** (`(pointer: coarse)`, `renderer.ts`): sin MSAA, densidad de
   píxeles tope 1,5 (en vez de 2) y mapa de sombras de 1024 (en vez de 2048). Constantes
   `HANDHELD`. En una tablet la pantalla tiene el doble de píxeles y la GPU la mitad.
7. **Resolución adaptativa** (`adaptResolution`, constantes `ADAPT`): si la media entre
   fotogramas pasa de 36 ms baja la densidad un 15 % cada 2 s, hasta la mitad; si pasa 6 s
   por debajo de 20 ms, sube un paso. Cambiar la densidad rehace el lienzo: nunca más de
   una vez cada 2 s.
8. **`renderer.compileAsync` al montar el valle NO sirve tal cual**: los programas
   enlazados pasaron de 35 a 68 —compiló variantes con otro estado de luces/sombras que
   luego no se usaron— y se retiró. Precompilar bien pide hacerlo con la escena ya
   iluminada como se va a dibujar (p. ej. tras el primer fotograma). Pendiente.
9. **El roble es de Vera** (lo está rehaciendo): no tocar `world/great-oak.ts` sin
   preguntar. Fundido, bajaba de 27 a 3 mallas.

## Lo que queda (por lo que pesa)

- **Aldeanos (187 mallas) y animales (177)**: con esqueleto, varios materiales por
  personaje y `frustumCulled = false` (se dibujan aunque estén fuera de pantalla). Ideas:
  fundir cada personaje en una malla con el color en los vértices y un solo material;
  recortar por pantalla con una esfera de límites generosa; animar menos a menudo a los
  lejanos o fuera de pantalla.
- **Humo y luces (`Valley_Tells`, 49 mallas)**: candidatos a instanciar.
- **Precompilar los sombreadores** en el momento bueno (ver 8).
- **Medir en un aparato real** y apuntar aquí las cifras.
- El JS por fotograma de la villa (~15 ms en un sobremesa) es mucho para una tablet: hay
  que saber cuánto es vida, cuánto animación y cuánto envío de llamadas.

## Reglas para quien añada cosas

- Un efecto con muchas copias va **instanciado** (`InstancedMesh`), como peñascos,
  pájaros, gotas o charcos: una llamada para todas.
- Un modelo estático de muchas piezas se **funde** (`mergeStatic`), salvo lo que se mueve.
- No actives `castShadow` en lo pequeño o lejano.
- No pongas `frustumCulled = false` sin necesidad: obliga a dibujar fuera de pantalla.
- Tras un cambio que pueda pesar, pasa `gl-probe` en las dos escenas y apunta la cifra.
