# E3 · Bastión con escalera interior, aceptado provisionalmente

Fuente canónica: `bastion-access-candidate.json`. Deriva de G-26 aprobado,
sin modificarlo. El `.blend` y el `.glb` son generados. Blender 5.2.1 LTS,
pipeline nativo, sin proveedor de pago ni materiales externos. Conserva la
procedencia/licencia del proyecto base; no concede una licencia independiente.

La primera propuesta de rampa lisa fue descartada por pendiente excesiva.
Tras una corrección propia de la junta superior, el coordinador autorizó una
única corrección dirigida: **14 peldaños**. Vera aceptó su aspecto «de momento»
el 22 sep 2026; G-27 lo publicó selectivamente y lo integra sólo donde cabe
una celda interior. G-26 permanece como respaldo. La navegación y la lectura
fina de los peldaños en la cámara real siguen pendientes.

## Contrato geométrico para Terra

Coordenadas locales de ejecución **(x, z, y)**, vertical +Y. Origen en esquina
lógica de la torre. **+Z es el interior local, no una dirección mundial fija**.

| Elemento | Límites / valor |
|---|---|
| Celda torre | x=[0,1], z=[0,1] |
| Escalera | x=[0,14;0,86], z=[1,2] |
| Huella visual total | **1×2**, una celda interior adicional |
| Caja GLB en orden x/y/z | min=(0,0,0), max=(1;1,36;2) |
| Plataforma | y=1,02; x=[0,01;0,99], z=[0,01;1] |
| Número de peldaños | 14 |
| Huella por peldaño | 1/14 = 0,0714285714 |
| Contrahuella | 1,02/14 = 0,0728571429 |
| Ancho libre escalera | **0,72**, sin barandillas |
| Ancho libre mínimo abertura/plataforma | **0,70**, entre x=0,15 y 0,85 |
| Cuerpo considerado | diámetro 0,64; margen lateral total mínimo 0,06 |
| Centro transversal conservador | x=0,50; tolerancia ±0,03 en abertura |
| Puesto único | (0,50;0,58;1,02) |
| Altura máxima almenas | y=1,36 |

Se mide ancho **neto**, incluidas las almenas. Las cuatro de esquina pasan de
0,22 a 0,14 en X, pues G-26 dejaba sólo 0,54 entre ellas. Se retiran el parapeto
y la almena central de la cara interior. Base, mampostería, alturas y las otras
caras mantienen la silueta de torre baja. El acceso no admite cruce de cuerpos.
En el puesto, un radio 0,32 llega al norte a z=0,26; las almenas acaban en
z=0,23, dejando 0,03 de margen.

Los peldaños son sólidos de piedra: cada uno ocupa todo su intervalo Z desde
y=0 hasta su cota superior. No hay rampa lisa oculta. La escalera sigue siendo
empinada (envolvente 45,567°), pero los apoyos son horizontales. Las unidades
son celdas, no metros: no se atribuye una altura humana real sin fijar escala.

| Peldaño i | z mínimo | z máximo | z centro de apoyo | y superior |
|---|---:|---:|---:|---:|
| 1 | 1.928571 | 2.000000 | 1.964286 | 0.072857 |
| 2 | 1.857143 | 1.928571 | 1.892857 | 0.145714 |
| 3 | 1.785714 | 1.857143 | 1.821429 | 0.218571 |
| 4 | 1.714286 | 1.785714 | 1.750000 | 0.291429 |
| 5 | 1.642857 | 1.714286 | 1.678571 | 0.364286 |
| 6 | 1.571429 | 1.642857 | 1.607143 | 0.437143 |
| 7 | 1.500000 | 1.571429 | 1.535714 | 0.510000 |
| 8 | 1.428571 | 1.500000 | 1.464286 | 0.582857 |
| 9 | 1.357143 | 1.428571 | 1.392857 | 0.655714 |
| 10 | 1.285714 | 1.357143 | 1.321429 | 0.728571 |
| 11 | 1.214286 | 1.285714 | 1.250000 | 0.801429 |
| 12 | 1.142857 | 1.214286 | 1.178571 | 0.874286 |
| 13 | 1.071429 | 1.142857 | 1.107143 | 0.947143 |
| 14 | 1.000000 | 1.071429 | 1.035714 | 1.020000 |

Valores exactos: z mínimo=2−i/14, z máximo=2−(i−1)/14,
z centro=2−(i−0,5)/14, y=i·1,02/14. La tabla redondea a seis decimales;
la receta conserva precisión completa.

## Ruta geométrica y apoyo de pies

Aproximación (0,50;2,40;0), pie (0,50;2;0), catorce apoyos
(0,50;2−(i−0,5)/14;i·1,02/14), salida (0,50;1;1,02)
y puesto (0,50;0,58;1,02). Retorno por la misma ruta en orden inverso.
Esta entrega no implementa ni promete una animación de marcha.

**No interpolar una diagonal de suelo a plataforma como apoyo de pies**:
atravesaría contrahuellas o dejaría pies flotando. La polilínea geométrica
continua que sigue exactamente la escalera es, para cada i:
(0,50;2−(i−1)/14;(i−1)·1,02/14) →
(0,50;2−(i−1)/14;i·1,02/14) →
(0,50;2−i/14;i·1,02/14).
Primero asciende la contrahuella y luego recorre la huella horizontal.
Es un contrato de superficie, **no una trayectoria corporal final**.

Para un pie animado, elevarlo mientras el otro permanece apoyado, moverlo por
encima de la siguiente arista y posarlo en el centro de apoyo de la tabla;
al bajar, avanzar por encima de la arista antes de descender. La longitud de
la planta del pie y la marcha real deben validarse con el personaje. El
diámetro 0,64 es del cuerpo y verifica anchura lateral; **no demuestra que toda
una suela quepa en una huella de 0,07143**. Adaptación del cuerpo, apoyos,
velocidad y colisión de escalones pertenecen a la fase de navegación/animación.

La celda interior x=[0,1],z=[1,2] debe estar libre. La aproximación y su disco de
radio 0,32 requieren además espacio más allá de z=2. Un bastión o muro contiguo
en esa dirección invalida la subida. En anillos diagonales, escoger otra cara
interior cardinal válida o no ofrecer el puesto. No atravesar ni desplazar
torres vecinas; no abrir paso público por existir la malla.

Rotación cardinal alrededor de (0,5;0,5), para modelo, huella y ruta:
u=x−0,5, v=z−0,5;
`x'=0,5+u·cosθ+v·sinθ`, `z'=0,5−u·sinθ+v·cosθ`, y'=y.
θ=0 lleva el interior a +Z; π/2 a +X; π a −Z; −π/2 a −X.
Después sumar el origen mundial. No rotar sobre (0,0).

## Evidencia y reproducción

Salidas separadas en `artifacts/graphics/E3-access-candidate/`:

- GLB final: **88.960 bytes, 1.236 triángulos, 2 mallas y 2 materiales**.
  G-26 tiene 78.812 bytes/1.092 triángulos: incremento de 10.148 bytes y
  144 triángulos, sin nuevas llamadas por material.
- SHA-256 GLB: `46e5a10c4d33361c1f36e5e18e6a06b5619a0b867c4efd82eb3332a9fc1d503d`.
- `validation.json`: reimportación real Blender del GLB, caja, normales,
  materiales, tamaños y hashes de productos. Sin caras degeneradas ni
  normales inválidas.
- `three-validation.json`: validación del repositorio y carga real GLTFLoader
  en Node; caja y estadísticas coinciden. No prueba GPU ni escena del juego.
- `candidate-iso.png`, `candidate-side.png`, `candidate-top.png`,
  `candidate-wall.png`, `comparison-g26.png`: vistas del GLB final.
- `footprint-route.png`: torre verde, celda adicional naranja y eje de ruta
  azul. Guías elevadas sólo para ver la planta; cotas reales en la tabla.
  No son parte del GLB.

Desde la raíz:

```powershell
node node_modules/tsx/dist/cli.mjs art/recipes/bastion-access-candidate/build.ts
node node_modules/tsx/dist/cli.mjs art/recipes/bastion-access-candidate/validate.ts
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python art/recipes/bastion-access-candidate/review.py
```

Los comandos reemplazan sólo las salidas de este candidato. No registran,
promueven ni publican. Blender puede conservar un `.blend1` de la generación
anterior: es copia de seguridad, no el candidato entregado.

## Límites

La escalera ocupa una celda interior adicional: no cabe en 1×1 conservando
el volumen macizo. La escena de revisión muestra unión ideal con muros al
oeste/este; la integración G-27 valida orientación y respaldo, pero la captura
real no deja leer de cerca los peldaños. No hay barandillas, cruce de cuerpos,
guardia animado, navegación elevada, tiro desde plataforma ni combate en alto.
La aceptación provisional fue del aspecto aislado, no de su transitabilidad.
**E3 no está cerrado**.
