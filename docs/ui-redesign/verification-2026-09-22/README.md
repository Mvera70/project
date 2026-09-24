# Verificación de interfaz — 22 de septiembre de 2026

- `app-shell.png`: captura de la carcasa de Valle con HUD, controles flotantes, hoja editorial y navegación inferior.

La captura demuestra que la interfaz queda por encima de un render sustituible. El render del valle no es una referencia de dirección de arte para la interfaz: la carcasa debe seguir siendo legible si se sustituye por un fondo neutral o negro.

Las capturas estacionales generadas con `npm run shots -- --seed 7 --years 1` se mantienen en `artifacts/`; validan el render, no esta carpeta de interfaz.

La navegación de Crónica, Personas y ficha individual queda cubierta por las pruebas de contrato rápidas:

- `tests/fast/ui-redesign-shell.test.ts`
- `tests/fast/ui-v2-nav.test.ts`
- `tests/fast/ui-skin.test.ts`
