# Revisión V9 · cinco correcciones · 29 sep 2026

Maqueta documental sobre V9. No se modifican componentes, motor ni banco.
La fuente anterior y sus capturas permanecen en `../texturas-v9-2026-09-29/`.

## Las cinco correcciones

1. **Brújula:** esfera hueca de tres anillas, N y S, material de latón generado con ImageGen. Reutiliza la proyección de `src/ui/camera-controls.ts`. Se puede arrastrar, girar 360° con flechas y orientar al norte con Home o toque. En la maqueta gira la esfera: todavía no está conectada a la cámara del juego.
2. **Crónica:** se elimina el canto duplicado que invadía la cabecera.
3. **Carro:** mismo ajuste; título con espacio propio y cierre separado, área de toque de 44 px, cabecera de al menos 60 px y 24 px arriba.
4. **Mandos diferenciados:** Vera eligió **A: marfil** para la fila de vista, pausa, velocidad y caza. [Comparativa de tres opciones](opciones.html): B, pizarra azul, y C, hierro mate, quedan conservadas. Las seis capturas muestran marfil. Pendiente confirmar si Vera quiere extender el cambio a GIVE, SEND y OPEN THE CART; por ahora conservan su acabado anterior. Los nuevos mandos son demostraciones visuales, no ejecutan acciones del juego.
5. **Navegación prioritaria:** franja translúcida limitada a la zona del menú, incluyendo el medallón elevado y 6 px de margen. Menú nítido encima. Los botones parcialmente tapados quedan `inert` (toque y teclado); al desplazarlos fuera recuperan su uso. La franja intercepta toques al fondo.

## Conservar para futuras versiones

Vera, 29 sep: «Ve guardando todo esto […] decida una u otra porque en el futuro vayamos cambiando». **Ninguna alternativa se elimina por no resultar elegida.**

| Material | Archivo | Estado |
|---|---|---|
| Marfil | `assets/control-ivory.png` | Elegida por Vera para la fila de mandos |
| Pizarra azul | `assets/control-slate.png` | Alternativa conservada |
| Hierro mate | `assets/control-iron.png` | Alternativa conservada |
| Latón de anillas | `assets/ring-metal.png` | Propuesta de adaptación de brújula |

Los maestros originales están en `masters/`; los prompts completos y medidas en `prompts.json`; recorte, exportación 2×, alfa y SHA-256 en `verification-assets.json`. Controles exportados a 128×96, referencia de uso 64×48 y corte de 10 CSS/20 PNG; en la fila móvil se montan a 44×44 por nueve partes. La textura de anillas se aplica a geometría SVG dinámica, sin fabricar vetas por código. Las rondas V6–V9 y sus variantes anteriores siguen intactas.

## Capturas y comprobación

- `capturas/`: valle, crónica y carro a **390×844 y 320×568**.
- `capturas/opciones-mandos.png`: comparación de A/B/C a tamaño de uso.
- `qa-point-5.json`: botón Give parcialmente oculto, toque bloqueado, pestaña Crónica operativa y botón restaurado tras scroll. En 390 el límite está en y=756 y el botón ocupa y=739–779; parte visible no pulsable.
- `qa-compass.json`: vuelta completa por teclado, vuelta al norte, arrastre y ausencia de errores de carga. Prueba de maqueta, no del control real.

Revisión visual realizada sobre las capturas. No se ejecuta ni empaqueta el juego.

## Reproducir desde la raíz

```powershell
python docs/ui-redesign/revision-v9-2026-09-29/export.py
node docs/ui-redesign/revision-v9-2026-09-29/build.mjs
node docs/ui-redesign/revision-v9-2026-09-29/capture.mjs
node docs/ui-redesign/revision-v9-2026-09-29/review.mjs
```

Python requiere Pillow; Node usa Playwright con Edge sin ventana. Abrir `index.html?scene=valley` para marfil (también `&controls=slate` o `&controls=iron`), `?scene=chronicle` o `?scene=cart`. `opciones.html` enlaza las tres variantes. La portada elegida y la idea día/noche aplazada no cambian en esta revisión.
