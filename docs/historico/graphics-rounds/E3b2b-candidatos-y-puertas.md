# E3b.2b · Candidatos de giro, diagonal y portón

**23 sep 2026.** Ronda de fuentes y geometría CPU. No se exportaron GLB ni se
integraron modelos en el juego. Luna inventarió las formas del anillo; Sol
preparó tres recetas y una sonda reproducible. La revisión contrastó el
portón publicado con el respaldo procedural y corrigió la conclusión inicial.

## Evidencia

- Fuentes: `art/recipes/e3b-walkway-turn-candidate/`,
  `art/recipes/e3b-walkway-diagonal-candidate/` y
  `art/recipes/e3b-gate-crossing-candidate/`. Las tres cargan con `loadRecipe`.
- Sonda: `python art/recipes/e3b-walkway-turn-candidate/review.py`. Produce
  `artifacts/graphics/E3b2-candidates/measurements.json` y vistas técnicas
  SVG de planta, sección y oblicua. Esas vistas son cajas de receta, no malla
  exportada ni captura de la app.
- El codo oeste→norte tiene 0,70 de diámetro libre en su recorrido **local**
  sobre suelo a Y=1,02. Queda condicional: el cálculo no incluye las dos
  juntas con muro ensamblado, su apoyo ni árboles vecinos. No es todavía
  transitable en el juego.
- La diagonal aislada deja 0,72 nominal entre pretiles, pero la conexión en
  el vértice compartido con el brazo recortado no tiene barrido del disco ni
  apoyo certificados. Rechazada para integración.
- El cruce cardinal sobre el portón deja 0,72 nominal, pero su tablero empieza
  en Y=0,93 y el punto más alto del `gate.glb` publicado llega a Y=0,865:
  quedan 0,065 sin apoyo demostrado. Las uniones reales de máscaras 65 y 128
  tampoco están resueltas. Rechazado para integración. El `OpenGate` de
  `defences.ts` es un respaldo procedural distinto; su dintel sí choca con
  este tablero, por lo que tampoco puede recibirlo.

## Decisión de la ronda

Una segunda sonda separó dos mitades diagonales y cubrió los portones con
máscaras **65** y **24** de las muestras actuales. El inventario del día 22
había registrado máscara 128 para la semilla 91; con los cambios locales del
motor, esa misma muestra da ahora 24, por lo que 128 permanece como caso
geométrico archivado, sin extrapolarlo a todas las partidas.

La junta diagonal pasa un muestreo de disco de radio 0,35 en **51.840 puntos**
a través del vértice, sin hueco ni escalón de suelo. Continúa **condicionada**
al apoyo contra la pared recortada, los pretiles de un giro y los árboles.
Una sonda posterior con `wall.glb` y `buildDefence` reales encontró **22 puntos
sin apoyo de 95** bajo el alma diagonal; por eso **esta variante no debe
exportarse ni montarse** hasta corregir sus apoyos. El paso libre por arriba
no prueba que el tablero tenga base.
Las dos variantes de portón pasan **147.600 puntos por ruta** en el suelo
candidato, pero el GLB publicado deja sólo **0,667** de hueco de piedra frente
al gálibo lógico de **0,84**. El marco amplio alternativo es una receta
aislada que conserva el grupo de hoja y gozne; en ese momento faltaban la
exportación y la comprobación de la bisagra, además de las juntas y apoyos
reales. Ninguna variante de portón quedó aprobada en esa sonda.

Vera autorizó después la **exportación aislada** del marco amplio en
`artifacts/graphics/E3b2-candidates/gate-wide-review-01/`. Blender 5.2.1
produjo un GLB de **48.828 bytes y 380 triángulos** y una vista para revisión.
El validador nativo y GLTFLoader pasaron: hueco de piedra **0,84000007**, hoja
y pivote idénticos al GLB publicado por geometría y transformaciones. Las
cajas de las piezas de madera no cortan las jambas en **19 posiciones** del
giro del juego, cada 5° de 0° a −90°. Esto no certifica la junta con el
muro, los colliders ni la visión en partida. El GLB público sigue intacto
por esta ronda.

Una tercera sonda preparó dos recetas diagonales nuevas con alma de **0,20**
y una clave de piedra en el vértice. Contra `wall.glb` montado por
`buildDefence`, el alma tiene contacto directo en **2.115 de 2.121 puntos**;
los seis sin contacto están en la costura exacta. La clave abarca ambos lados
y puentea un vano muestreado de **≤0,002** a paso 0,001. El suelo mantiene
Y=1,02 y el barrido del disco de radio 0,35 pasa **51.840 puntos**. Evidencia
en `artifacts/graphics/E3b2-candidates/round-3/`. Queda **condicional**:
estas sondas no prueban capacidad portante, giros, árboles, GLB ni marcha.

No publicar ni montar ninguna de las variantes. La
[integración E3b.2c](../../encargos/encargo-e3b2c-integracion-selectiva.md)
queda preparada como contrato, pero depende de geometría aprobada. La primera
junta recta E3b.1 se conserva; E3b continúa abierta.
