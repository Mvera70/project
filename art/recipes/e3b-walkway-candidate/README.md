# E3b · Pasarela recta candidata; junta G-27 bloqueada

**22 sep 2026. Modelo aislado y GLB candidato publicado en G-32.** La receta
define una pasarela de piedra de una celda y las vistas muestran dos copias
junto a G-27. El módulo recto cumple sus cotas, pero **la junta lateral con
G-27 se rechaza**: sus pretiles impiden entrar a cota 1,02. No se ha modificado
el bastión ni se ha modelado una continuidad aparente por encima de su barrera.

## Fuente, alcance y materiales

Fuente canónica: `e3b-walkway-candidate.json`, compatible con `loadRecipe` del
proyecto. `review.py` lee esa receta y las aprobadas de muro/G-27 para producir
vistas SVG y medidas sólo con CPU. Este script no genera malla, GLB ni
`.blend`; una exportación posterior sí produjo el
[GLB candidato G-32](../../../docs/historico/graphics-rounds/G-32-e3b-candidatos.md).

La pieza reutiliza el rol `stone` de `art/recipes/palette.json`, rugosidad 0,95,
igual que el muro. Doce cubos, sin biseles, texturas ni animación; **144 triángulos
estimados**, un material, unión por material prevista. Estadísticas de receta,
no de un GLB exportado. Ménsulas de piedra escalonadas: elección estética
pendiente de Vera. Autoría procedural local; conserva las condiciones del
proyecto base, sin proveedor, licencia externa ni gasto.

## Coordenadas y dimensiones

Las tablas usan **(X,Y,Z), vertical +Y**, en unidades de celda, no metros.
Origen en la esquina lógica (0,0,0), longitud por +X, interior por **+Z**.
En la receta Blender, `(bx,by,bz)=(X,-Z,Y)`, escala 1. No normalizar la caja
del candidato: su origen y sus cotas se comparten con la celda del muro.

| Elemento | X | Y | Z |
|---|---|---|---|
| Caja completa | 0…1 | 0,36…1,20 | 0,33…1,27 |
| Tablero macizo | 0…1 | 0,92…1,02 | 0,33…1,27 |
| Pretil exterior | 0…1 | 1,02…1,20 | 0,33…0,43 |
| Pretil interior | 0…1 | 1,02…1,20 | 1,15…1,27 |
| Paso libre neto | 0…1 | pies a 1,02 | **0,43…1,15 = 0,72** |
| Eje del paso | 0…1 | 1,02 | 0,79 |
| Relleno entre almenas A | 0,20…0,40 | 0,755…0,885 | 0,33…0,67 |
| Relleno entre almenas B | 0,60…0,80 | 0,755…0,885 | 0,33…0,67 |
| Durmiente sobre almenas | 0…1 | 0,885…0,92 | 0,33…0,67 |

Hay dos ménsulas, X=0,105…0,255 y X=0,745…0,895. Cada una tiene tres
bloques superpuestos: inferior Y=0,36…0,53/Z=0,65…0,79;
medio Y=0,53…0,72/Z=0,65…1,00; superior Y=0,72…0,92/Z=0,65…1,25.
Arrancan embebidas ligeramente en la cara interior del muro y tocan el tablero
en Y=0,92. Todos sus puntos quedan por debajo del paso. El voladizo interior
rebasa la celda **0,27**; esa franja debe estar libre de otros edificios.
No se certifica resistencia estructural física: es apoyo visual de piedra.

El muro existente ocupa Z=0,33…0,67 tras la escala transversal de
`buildDefence`. La cara exterior se conserva en Z=0,33. Los rellenos cierran
los huecos entre almenas; el durmiente y el tablero cubren hasta el suelo nuevo.
**Precisión de las cotas:** `wall.json` da corona a 0,755 y almenas a 0,885.
El 0,76 del brief es redondeado; el desnivel exacto a cubrir es **0,265**.
Los rellenos dependen de las almenas de esta receta recta; no se aplican a los
brazos recortados de esquinas/diagonales ni a empalizadas.

Disco de radio 0,32: en el eje ocupa Z=0,47…1,11, con 0,04 de margen por
lado. No caben dos cuerpos en paralelo. En una cadena recta, dos módulos
trasladados una unidad comparten la cara X=1 sin salto ni hueco; el disco de
la junta apoya en ambos tableros. Un extremo libre no es un destino apto para
el centro de un cuerpo: requiere margen longitudinal de 0,32 y una solución
de cierre posterior.

## Rotación y colisión propuesta

Girar todo el módulo, soportes, superficie y colliders alrededor de
(X,Z)=(0,5;0,5), conservando Y:
`u=X−0,5; v=Z−0,5; X'=0,5+u cosθ+v sinθ; Z'=0,5−u sinθ+v cosθ`.
θ=0/π÷2/π/−π÷2 lleva el interior a +Z/+X/−Z/−X. Una sola malla sirve
las cuatro orientaciones; la franja interior adicional gira con ella.

Colisión candidata: una caja por primitiva con los límites de esta tabla y
las tres cajas por ménsula. El tablero ofrece apoyo real en Y=1,02; pretiles
y piedra son obstáculos sólidos. No poner una caja genérica hasta Y=2 ni un
suelo invisible encima de G-27. Estas coordenadas son una propuesta documental,
**no colliders implementados**. No hay prueba de flechas, sombra ni navegación.

## Encaje con cada cara de G-27: falsación

G-27 se deja en X/Z=[0,1]. La revisión coloca muros y candidatos en X=[1,2]
y [2,3], sin desplazar el bastión para esconder el fallo.

| Cara local G-27 | Obstáculo o condición | Resultado |
|---|---|---|
| Este (+X) | `Parapet_3`: X=0,85…0,99; Y=1,02…1,16; Z=0,16…0,84 | Junta lateral bloqueada |
| Oeste (−X) | `Parapet_1`: X=0,01…0,15; Y=1,02…1,16; Z=0,16…0,84 | Mismo bloqueo por simetría |
| Exterior (−Z) | `Parapet_0`: X=0,02…0,98; Y=1,02…1,16; Z=0,01…0,15 | Cerrada y orientada hacia fuera |
| Interior (+Z) | Abertura X=0,15…0,85; salida de escalera en Z=1 | Boca existente libre de 0,70, pero ocupada por el acceso E3a; no conecta lateralmente por sí sola |

Las almenas laterales alcanzan Y=1,36. Entre las de esquina quedan sólo
Z=0,23…0,77 (**0,54**); quitar únicamente el pretil no daría 0,70.
La almena central lateral ocupa Z=0,40…0,60. En cada lateral todas esas
almenas tienen el mismo intervalo X del pretil correspondiente y Y=1,16…1,36.

El eje propuesto Z=0,79 choca con el pretil y con la almena interior de esquina
(Z=0,77…0,99). Además, el tablero del bastión acaba en X=0,99 y el primer
candidato empieza en X=1: hay **0,01 de hueco**. La plataforma llega sólo a
Z=1, mientras el paso termina en 1,15: solape libre máximo de **0,57**, antes
incluso de descontar sus obstáculos. No se ha rellenado ese hueco ni invadido
la escalera para aparentar una junta resuelta.

**Conclusión geométrica:** coincidencia de altura no equivale a conexión.
La primera costura E3b no es implementable conservando simultáneamente G-27
intacto y una junta recta lateral a Y=1,02.

## Alternativa acotada para decidir, no modelada

Una variante nueva de bastión con salidas laterales necesitaría una boca
libre de al menos 0,70 y un descansillo que desplace el eje desde Z=0,50 en
la plataforma a Z=0,79 en la pasarela. Una boca Z=0,15…0,85 obliga a recortar
pretil, almena central y partes de ambas almenas de esquina; después habría
que dimensionar el giro/ensanche y salvar el hueco 0,01 con geometría visible.
**No basta eliminar la almena central ni este documento autoriza recortes.**
Esta alternativa requiere permiso para una variante de G-27 y un encargo de
junta independiente. Si debe mantenerse G-27 intacto, la única alternativa
a estudiar es partir de su boca interior con una nueva distribución de
descansillo/escalera; excede este módulo y no tiene viabilidad afirmada aquí.

## Evidencia y reproducción

Desde la raíz del proyecto, sólo CPU y escritura en la carpeta de evidencia:

```powershell
python art/recipes/e3b-walkway-candidate/review.py
```

Salidas en `artifacts/graphics/E3b-walkway-candidate/`:

- `candidate-plan.svg`: planta, disco, ancho y dos módulos junto a G-27.
- `candidate-section.svg`: sección transversal de ménsula y corte del bloqueo.
- `candidate-oblique.svg`: proyección de las primitivas desde el interior.
- `candidate-plan.png`, `candidate-section.png`, `candidate-oblique.png`:
  copias rasterizadas por CPU de esos esquemas para revisión rápida.
- `measurements.json`: cotas, comprobaciones, bloqueos y hashes de fuentes.

Las vistas son ilustraciones vectoriales técnicas, no evidencia de aspecto
del GLB ni capturas del juego. El script verifica ancho, cota, giro del disco
y barrera G-27; el cargador nativo valida el formato de la receta. No se ha
ejecutado Blender, exportación, app, GPU, benchmark ni proveedor. No se ha
publicado el recurso en esa ronda inicial; después se autorizó G-32. Giro de
recorrido, diagonal, portón, tránsito y combate quedan fuera de esta entrega.
**E3b sigue pendiente de integración en la partida.**
