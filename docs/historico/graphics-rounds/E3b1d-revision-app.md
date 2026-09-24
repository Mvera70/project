# E3b.1d · Primera junta en la app real

**22 sep 2026.** Vera autorizó abrir la app y usar GPU para esta revisión.
La escena parte de semilla 7, año 50, verano, con una modificación diagnóstica
acotada a `?debug=1&live=1&e3b=1`: arruinar el muro diagonal (17,57) y añadir
un segundo muro recto de piedra (18,57). La primera junta bastión (18,59) →
muro (18,58) surge así de un **escenario controlado**, no de una construcción
espontánea de la aldea. No cambia guardados ni reglas del motor.

## Evidencia

- [Captura cercana](../../../artifacts/graphics/E3b1-review/run-2026-09-22T16-11-18-765Z/closeup.png): escalera, bastión abierto y primer corredor se ven unidos; el guardia ocupa la pasarela. El bosque tapa parte del extremo lejano.
- [Traza de subida](../../../artifacts/graphics/E3b1-review/run-2026-09-22T16-11-18-765Z/walk-trace.json): guardia 129, 16 muestras cada diez pasos de vida; pasa por `climb` desde Y=0 a Y=1,02 y llega a `occupied` en el paso 150, sin salto vertical entre las muestras. Sin errores de consola ni de página con WebGL por defecto del navegador.
- [Traza y 19 capturas](../../../artifacts/graphics/E3b1-review/run-2026-09-22T16-11-18-765Z/trace.json): en aviso, el guardia alcanza el puesto a los 5 s y permanece ocupado hasta los 25 s; en asalto hay 12 atacantes y flechas visibles en las muestras de 5 a 60 s. La máscara pública sigue bloqueando bastión y primer muro. La traza no identifica al arquero que creó cada flecha; no atribuye esos tiros al guardia 129.
- La corrida inicial con SwiftShader forzado registró tres errores de validación `MeshDepthMaterial` durante el aviso; la captura y traza posteriores con WebGL por defecto no registraron errores. Esta diferencia queda pendiente de reproducción en GPU concreta; no se infiere ausencia del defecto de sombras diurnas a partir de capturas fijas.

## Alcance y siguiente ronda

E3b.1 acredita la primera junta recta y la subida del mismo guardia. No
acredita todavía un anillo entero, curvas, diagonales, portón ni la autoría
del tiro. E3b.2 debe revisar esa continuidad y la visibilidad con el bosque
retirándose progresivamente del núcleo. La tala y el recurso comparten el
objetivo de bosque del motor; la escena representa hachazos, carga y descarga,
pero cada semana produce la cantidad real de madera, no un recurso por golpe.
En esta ronda no se midió rendimiento ni se hizo commit o push.
