# E3b.2b · Codo oeste → norte

Fuente: `e3b-walkway-turn-candidate.json`, generada de forma determinista por `review.py`. Candidato aislado; no se instancia ni se exporta. Coordenadas de celda `(X,Y,Z)`, vertical `+Y`; la receta usa `(X,-Z,Y)` para Blender. Piedra de `../palette.json`, escala 1, sin reflejos negativos. Siete cubos, un material y 84 triángulos de cubos estimados antes de unión por material.

El tablero ocupa X/Z `0…1,27`, Y `0,92…1,02`. Deja abiertas las caras oeste y norte. Los pretiles este y sur empiezan en `1,15`; el eje `(-0,35;0,79) → (0,79;0,79) → (0,79;-0,35)` guarda 0,36 frente a esos obstáculos dentro de la celda. La sonda mide sobre el tramo local desde X/Z=0,35: la distancia mínima a borde de suelo es 0,35, de modo que el diámetro local continuo es **0,70** y el margen corporal para radio 0,32 es 0,03. Los tramos exteriores del eje exigen tableros rectos vecinos. La sonda no certifica todavía la unión con el muro real recortado ni las cuatro orientaciones del codo, por lo que el estado es **condicional** y no apto para navegación.

Los apoyos propuestos son dos durmientes sobre los brazos de pared y una ménsula interior bajo el codo. El tablero rebasa la celda hacia el interior; antes de colocarlo hay que medir la dispersión del tronco adulto real y esperar la tala ordinaria donde cruce su volumen. Las cajas de receta son propuesta de soporte y obstáculo, sin colliders implementados.

Desde la raíz: `python art/recipes/e3b-walkway-turn-candidate/review.py`. Regenera las tres recetas E3b.2b y `artifacts/graphics/E3b2-candidates/measurements.json`, más planta, sección y oblicua SVG por forma. Sólo CPU. La sonda rechaza expresamente las dos uniones diagonales aún sin paso continuo.

## Variante con brazo al núcleo, 23 sep 2026

`make-braced.py` crea `e3b-walkway-turn-braced-candidate.json` sin cambiar la
fuente anterior. El nuevo `CornerDiagonalBrace` va bajo el tablero desde el
núcleo de la pared hacia las dos ménsulas de la esquina. La sonda
`check-real-wall.ts` carga el `wall.glb` real y compone `buildDefence` para las
cuatro máscaras cardinales 9/12/6/3. Cada durmiente toca la pared en 72/81
muestras de su cara inferior; el brazo nuevo se embebe en la pared en 33/81.
Las ménsulas originales no tienen apoyo directo significativo (0 o 1/81), por
lo que dependen de la continuidad con el brazo. La sonda no calcula resistencia
ni acredita aún el paso con vecinos, árboles o colisión de juego. **Candidato
condicional; no exportar ni usar como ruta todavía.**

Reproducir sólo con CPU desde la raíz:

```powershell
python art/recipes/e3b-walkway-turn-candidate/make-braced.py
npx tsx art/recipes/e3b-walkway-turn-candidate/check-real-wall.ts e3b-walkway-turn-braced-candidate
```

El informe está en `artifacts/graphics/E3b2-candidates/round-4/` e incluye
hashes de fuente y pared y las muestras sin contacto.
