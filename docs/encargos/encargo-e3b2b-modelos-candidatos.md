# E3b.2b · Modelos candidatos para continuar el adarve

**Estado:** encargo preparado; requiere autorización nueva antes de asignar
modelado 3D o generar/exportar recursos. E3b.1 sólo valida la primera junta
recta. El [inventario E3b.2a](../historico/graphics-rounds/E3b2a-inventario-topologia.md)
muestra los casos reales que falta cubrir.

## Objetivo

Entregar **sólo modelos candidatos reproducibles** que permitan estudiar la
continuidad de una pasarela de piedra sobre rectas, giros, diagonales y
portones. No integrar modelos en la app, cambiar navegación o física,
publicar GLB, ni tocar `src/`, `tests/`, motor o guardados. No se exige que
Blender esté abierto para preparar las fuentes.

## Depende de

- `docs/design.md` §1b, §2–4, §7.4c, D.4–D.6 y E.3/E.6/E.8;
  [E3b](encargo-e3b-adarve-continuo.md) y G-27/G-32.
- Recetas aprobadas de `wall`, `gate` y
  `art/recipes/e3b-bastion-joint-candidate/`; entrada y recta G-32.
- `src/render3d/world/defences.ts`: las máscaras cardinales y diagonales
  efectivas, los tramos recortados de L/diagonal y el portón real.
- `artifacts/graphics/E3b2-study/inventory.json`: bastión máscara 5 en ambas
  villas; además máscara 65 en una; portón máscara 65 y 128.

## Ficheros y entregables

Crear candidatos **nuevos** bajo `art/recipes/e3b-walkway-turn-candidate/`,
`art/recipes/e3b-walkway-diagonal-candidate/` y
`art/recipes/e3b-gate-crossing-candidate/`, con recetas JSON, `README.md` y
sondas CPU de planta/sección. Si hace falta separar mano izquierda/derecha,
crear variantes explícitas dentro de esas carpetas; no reflejar una malla con
escala negativa en la app. Guardar mediciones y vistas técnicas en carpetas
nuevas bajo `artifacts/graphics/E3b2-candidates/`. La recta reutiliza el
`e3b-walkway-candidate` publicado; cualquier ajuste requiere variante nueva.

## Contrato geométrico

1. Todos los suelos pisan **Y=1,02** y conservan **≥0,70** de paso libre
   continuo para disco corporal de radio 0,32; el giro debe medirse como
   trayectoria barrida, no sólo con anchos de cortes transversales.
2. La recta conecta sus dos caras y conserva el apoyo visual sobre el muro.
   El giro conecta entrada y salida cardinales en un mismo codo sin cerrar
   con pretiles la curva. La transición diagonal toca ambos extremos sin
   hueco en el vértice de celdas ni apoyo flotante.
3. Sobre el portón, conservar el hueco actual de **0,84** para el paso público,
   la hoja móvil y su gozne. El dintel de la receta llega a Y=0,93; medir
   sección real del tablero a Y=1,02 sin invadir la abertura. Resolver tanto
   unión cardinal→diagonal como diagonal→diagonal que muestran las dos villas.
4. La franja interior puede coexistir con bosque adulto. Medir la envolvente
   del tablero frente al tronco real dispersado; documentar celdas que deben
   esperar a la tala, sin borrar árboles ni reducir su recurso por diseño.
5. Mantener paleta, lenguaje de piedra, ejes, origen por celda y procedencia
   de G-32. Informar cubos, materiales y triángulos de cada variante; ningún
   número de coste se da por aprobado por una vista técnica.

## Evidencia y rechazo

Para cada forma: planta, sección y vista oblicua reproducibles, cajas de
soporte/obstáculo, recorrido de disco en las orientaciones necesarias y
comparación con la malla existente de pared/portón. Rechazar si hay hueco,
escalón, ancho <0,70, invasión del portal o soporte que cruza un árbol adulto
sin condición explícita. Las vistas CPU son geometría candidata, no captura
del juego. La exportación Blender, inspección GLB, admisión al catálogo,
integración, física y prueba en app son puertas posteriores independientes.

**Terminado cuando:** las fuentes candidatas y sus medidas permiten decidir
qué variantes pueden exportarse y cuáles requieren corregir la geometría.
