# Unión nueva bastión66 + portón24 — fuente combinada

`e3b-anchor66-gate24-combined-candidate.mesh.json` resuelve la partición geométrica de la junta de seed91: bastión295 en(34,39), portón71 en(33,40), salida del portón hacia oeste. Es una variante nueva; conserva intactas las fuentes anteriores. Toda coordenada se refiere al origen del bastión.

## Propiedad exclusiva

La fuente sustituye **toda la fábrica estática del bastión y del portón71**, incluidos sus dos tableros y sus pretiles. No se instala encima de `e3b-bastion-anchor-66-gate-candidate.json`, ni del conector24, ni del marco estático ligero. Sólo conserva la jerarquía articulada de hoja y herrajes del marco ligero: `doorSource` guarda sus grupos, primitivas, escala1/3 y traslado posterior a conversión Blender→mundo[-1,0,2]. Su contenido coincide con la fuente de la hoja del GLB ancho existente. El marco estático se reconstruye incorporando las jambas y dintel ligero a una unión volumétrica.

El suelo une la plataforma del bastión, su descansillo, el tramo SO y el polígono real del tablero24 ligero. Se particiona en13 prismas sin área de tapa duplicada. Los pretiles se reconstruyen sobre el borde de esa unión, descontando corredores de0,70 y dos discos circunscritos de16 lados en las curvas:65 prismas sin volumen superpuesto. Sus bases son Y1,02; coronaciónY1,20. El nuevo diseño simplifica el aparejo y las almenas antiguas; está pendiente de revisión visual.

La ruta superior completa es (1;0,5)→(0,5;0,5)→(−0,5;1,5)→(−1;1,5). Termina en la boca oeste del portón, donde comienza el módulo vecino siguiente. No queda una costura interior entre dos candidatos independientes. La escalera conserva catorce peldaños, Z2,65→1,65, ancho0,72 y la alzada total1,02 de la variante ancla. Sigue exigiendo cambiar la ruta de vida antigua Z2→1, como documenta README.md.

## Evidencia de fuente

`combined-source.ts` genera únicamente la nueva fuente JSON. `combined-probe.ts` exige igualdad exacta al regenerar y produce `combined-measurements.json`.

| Propiedad | Resultado CPU |
|---|---|
| Geometría estática | 181 prismas cerrados y orientados,2.156 triángulos; presupuesto≤2.400 |
| Materiales estáticos | Una piedra, cero texturas; hoja conserva su presupuesto original, excluido del recuento estático |
| SueloY1,02 y disco | 216.737 muestras del circuito y94.955 del descansillo: cero faltas |
| Paso libre | Radio0,35 pasa tangente; radio0,32 deja0,03 de margen mínimo |
| Borde protegido | 1.702 muestras del contorno exterior no perteneciente a bocas: cero tramos sin pretil |
| Suelo/pretiles duplicados | Cero solapes de área entre prismas de cada familia (tolerancia1e−8) |
| Vano público | 0,84 entre caras originales de jambas; cero invasiones por debajoY0,63 |
| Hoja | Fuente idéntica;91 posiciones, cero interferencias nuevas de hoja/fábrica |
| Holgura vertical | 0,63−0,5933333613=0,0366666387,≈0,0367 |

La sonda recorta sólo la porción de disco que cruza las bocas exteriores X=1/X=−1 y el final de descansilloZ=1,65. No recorta la antigua junta de esquina ni el centro del portón. El barrido recorre la unión completa en pasos≤0,002, con centro y coronas0,16/0,32/0,35.

Hay116 contactos discretos de los **herrajes de bisagra** con su asiento original de jamba. Se registran aparte: sólo se permite esta excepción cuando el nodo es `Gate_Hinge_*` y todo el prisma afectado está contenido en la huella original de una jamba. La hoja y cualquier contacto fuera de ese asiento deben dar cero. No se afirma que la bisagra esté separada de la piedra que la sujeta. La anterior afirmación genérica «hoja libre» no había medido su contacto contra el marco original: esta sonda sí lo distingue.

## Apoyo medido y límite preciso

Se reconstruye el dintel ligero fuente aY0,63…0,82. Sobre él y los estribos se dispone una viga continua que sigue la planta del tablero aY0,82…0,94; el tableroY0,94…1,02 contacta exactamente con ella. Se eliminan el hueco vertical de la variante anterior y la necesidad de superponer los dos suelos.

La fábrica fuera del vano deja0,86 de separación alrededor del gozne, siguiendo el margen del conector ligero. Las jambas originales recuperan la luz pública precisa0,84 dentro del espesor del marco. Su unión se calcula por estratos0…0,63/0,63…0,72/0,72…0,82; no se dibujan otras jambas encima. Las dos huellas originales quedan cubiertas al100%:0,02506667 unidades² cada una.

De27.005 muestras bajo la viga superior,20.463 contactan directamente con fábrica o dintel fuente enY0,82;6.542 se encuentran sobre luz salvada por esa viga. La distancia máxima al apoyo en planta es0,44300113. **Esto demuestra contacto geométrico y una viga continua, no resistencia estructural.** No hay propiedades mecánicas de piedra/mortero ni carga especificada que permitan certificar flexión, cortante o flecha de esa luz. Esa certificación sigue pendiente; un GLB tampoco la sustituiría.

La comprobación geométrica del nuevo marco se hace sobre su receta, con las dimensiones de jambas y dintel fuente. El GLB ancho antiguo aporta exclusivamente la jerarquía y transformaciones de la hoja inalterada; su dintel antiguoY0,60 no entra en esta medida. Falta exportar e importar la fuente combinada para verificar que el conversor respeta la partición, cotas, jerarquía de hoja y material. No se ha ejecutado esa exportación, ni GPU, previews, colliders de producción o revisión visual.

Una sonda Rapier aislada (`check-combined-physics.ts`) convierte los65 prismas de pretil en convex hulls:1.205 posiciones del disco de radio0,32 en la ruta no tienen intersecciones, mientras la cara exterior sí intercepta el volumen de prueba. Otros116 prismas de fábrica, dintel, escalera y tablero dejan libre un cilindro de radio0,32 en161 puntos del eje del portón abierto; ambas jambas interceptan los laterales. Esta evidencia se limita a la fuente local y a los volúmenes probados: faltan el GLB exportado, las colisiones de producción, la hoja articulada en Rapier y la revisión visual.

Cada prisma es cerrado por separado. Las particiones contiguas conservan caras internas enfrentadas; no hay dos tapas de suelo sobre la misma región ni dos volúmenes de pretil superpuestos. Una futura exportación puede eliminar caras internas o soldar la unión. El recuento2.156 las incluye conservadoramente; no es una única superficie manifold soldada.

## Reproducir

```powershell
npx tsx art/recipes/e3b-bastion-anchor-66-candidate/combined-source.ts --write-combined
npx tsx art/recipes/e3b-bastion-anchor-66-candidate/combined-probe.ts
npx tsx art/recipes/e3b-bastion-anchor-66-candidate/check-combined-physics.ts
npx tsc --noEmit -p art/recipes/e3b-bastion-anchor-66-candidate/tsconfig.combined.json
npx eslint art/recipes/e3b-bastion-anchor-66-candidate/combined-source.ts art/recipes/e3b-bastion-anchor-66-candidate/combined-probe.ts
```

TypeScript focal, ESLint y sonda pasan. Todos los nuevos archivos permanecen en esta carpeta. El coordinador debe añadir el catálogo y cuaderno del proyecto fuera de esta subtarea.
