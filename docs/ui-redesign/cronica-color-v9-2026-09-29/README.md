# Crónica a color · lote completo

El índice real `public/ui/art/index.json` contiene **44 escenas**. La carpeta
raíz suma 51 PNG porque hay siete piezas ajenas al índice de escenas:
`capital-anno`, `entry`, dos adornos y tres imágenes de portada. Esas piezas
siguen cumpliendo su función y no se han recoloreado como crónica.

Las **44 escenas indexadas** están ya a color en `public/ui/art/`, con el
**mismo nombre de archivo y la misma clave** que el sepia sustituido. Todas
miden 640×512. Siete provienen del lote aprobado V6 (`birth`, `built`,
`death`, `fire`, `harvest`, `pedlar`, `wedding`); las otras 37 se editaron con
ImageGen tomando como referencias el grabado sepia correspondiente y
`colour/birth.png` aprobado. Los originales de ImageGen están en `masters/`,
los sepia reemplazados en `sepia-originals/`, los prompts en `prompts.json` y
los tamaños y SHA-256 en `verification.json`.

Revisión visual: [hoja 1](hojas/cronica-color-1.jpg) ·
[hoja 2](hojas/cronica-color-2.jpg) ·
[hoja 3](hojas/cronica-color-3.jpg) ·
[hoja 4](hojas/cronica-color-4.jpg).

Prueba sobre la **UI publicada**, sustituyendo solo las peticiones de PNG en
el navegador: [390×844](cronica-color-juego-390x844.png) ·
[320×568](cronica-color-juego-320x568.png). `preview-live.json` confirma cinco
imágenes servidas desde el lote local en cada recorrido. La página publicada
sigue en sepia hasta integrar estos archivos; esta rama no despliega el juego.

Para regenerar los PNG finales desde los maestros:

```powershell
python docs/ui-redesign/cronica-color-v9-2026-09-29/export.py
```

Para repetir la prueba de presentación:

```powershell
node docs/ui-redesign/cronica-color-v9-2026-09-29/preview-live.mjs
```

La correspondencia entre una línea y su ilustración sigue la tabla vigente
de `src/ui/redesign/chronicle-art.ts`. Algunas claves de suceso todavía
comparten escena por decisión de esa tabla; este lote colorea íntegro el
inventario que el juego tiene indexado hoy.

Al integrar en `main`, actualizar la versión del caché de la PWA: los nombres
de los PNG permanecen iguales, por lo que un dispositivo con los sepia
guardados podría seguir mostrándolos hasta invalidar ese caché.
