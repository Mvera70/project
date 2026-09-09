# Ronda G-00 · Verificar fabricación y revisión remotas

Prompt derivado de `docs/design.md` v2.89, Anexo D. No es una segunda spec.
Estado: ejecutado en v2.90; resultado en `G-00.md`. No iniciar G-01 desde este
prompt: el orquestador debe abrir su ronda con los hallazgos ya arbitrados.

## Cabecera

Eres el agente de implementación del diagnóstico gráfico de The Valley.
El objetivo es demostrar cómo fabricaremos y revisaremos modelos sin que el
usuario tenga que estar físicamente en el ordenador. No estás produciendo el
catálogo ni sustituyendo el renderer Canvas.

Lee `CLAUDE.md`, `docs/design.md` §1–4 y D.0–D.2, D.4, D.11 y el brief G-00.
No leas el historial completo ni los briefs de implementación posteriores.
Si la revisión actual es posterior a v2.89, revisa el diff de estas secciones
y conserva sus cambios. No rebajes la versión ni restaures copias antiguas.

## PARTE 0 — Cierres y condiciones reales

1. Revisa `git status` y los cambios locales antes de escribir. No los reviertas.
2. Verifica las capacidades actuales de ejecución y revisión. La planificación
   observó control de navegador, pero no control nativo de Blender: no confundas
   una herramienta de captura con capacidad de hacer clic en cualquier aplicación.
3. La búsqueda inicial no encontró Blender en PATH ni en su carpeta habitual.
   Amplía la búsqueda de forma acotada a ubicaciones de instalación razonables;
   no recorras todo el disco ni inspecciones datos personales sin necesidad.
4. Si falta una herramienta, prepara la propuesta concreta de instalación:
   versión, fuente oficial, destino y comprobación posterior. Respeta permisos
   y autorizaciones vigentes. No instales dependencias opcionales por adelantado.
5. Registra host, versiones y rutas necesarias sin secretos. Distingue disponible,
   instalado, ejecutado y validado: son comprobaciones distintas.

Si no puede ejecutarse Blender, continúa el diagnóstico y deja esa parte
pendiente. No reemplaces la prueba con un “debería funcionar”. No bloquees las
comprobaciones independientes porque falte un ejecutable.

## PARTE 1 — Diagnóstico reproducible

Alcance de archivos: `tools/graphics/doctor.ts`,
`docs/graphics-rounds/G-00.md` y `artifacts/graphics/G-00/`.
No modificar producción, `package.json`, lockfile ni spec. Si se necesita otro
archivo, informa al orquestador y concreta la ampliación antes de editarlo.

Implementa un diagnóstico invocable mediante el `tsx` local del proyecto.
Documenta la invocación exacta verificada. Debe escribir un resultado estructurado
con herramienta, ruta, versión, prueba, resultado, duración y error interpretable.
No volcar variables de entorno completas ni credenciales.

Comprueba Node/tsx, navegador de pruebas y Blender. Si Blender está disponible,
ejecuta en background un script temporal dentro de la carpeta de evidencia que:

- Cree una geometría asimétrica con orientación reconocible.
- Guarde un `.blend` de inspección, una imagen y un `.glb`.
- Termine con código de salida interpretable y logs guardados.
- Pueda repetirse en una carpeta de salida limpia sin clics ni diálogos.

Prueba exportación y render por separado: un fallo de GPU no demuestra que la
exportación falle. Abre la imagen y describe lo que realmente se ve. Si todavía
no hay un visor GLB disponible sin nuevas dependencias, declara que la carga en
Three.js queda para G-01/G-02. No cierres P0 hasta que el ciclo completo exista.

Comprueba falta de ejecutable y ruta con espacios. No construyas una suite
general para este diagnóstico; entrega evidencia de esos casos y errores claros.

## PARTE 2 — Camino remoto

Identifica el canal real disponible para enviar trabajo y recibir evidencia
desde fuera del host. Comprueba qué se puede demostrar ahora sin pedir al usuario
que se siente ante el equipo. Un archivo en `artifacts/` no se sincroniza por
estar en el repositorio: esa carpeta está ignorada por Git.

Si hay un canal ya configurado y autorizado, entrega una imagen por ese canal
y documenta cómo abrirla remotamente. No publiques en Internet, abras puertos,
contrates servicios ni crees automatizaciones como sustituto de una capacidad
no disponible. Si la verificación final requiere al usuario desde su dispositivo,
prepara primero la evidencia y formula una sola comprobación concreta.

Documenta requisitos de host encendido, suspensión, proceso activo y reanudación.
No prometas que se ejecutarán trabajos con el ordenador apagado. Si hace falta
otro ejecutor, presenta alternativas con dependencias y costes por verificar;
no lo configures por inferencia.

## Entrega exigida

Devuelve:

1. Tabla de capacidades con hechos verificados y limitaciones.
2. Comandos exactos y rutas de logs/imagen/GLB producidos, o razón precisa de ausencia.
3. Imagen abierta e inspeccionada; defectos observados, no un visto bueno genérico.
4. Estado del canal remoto: probado, parcial o pendiente, con motivo.
5. Pasos ya completados, checkpoint y siguiente acción mínima reproducible.
6. Desviaciones o decisiones que el orquestador deba ratificar en la spec.

**Qué falsaría la hipótesis:** necesitar interacción manual para cada exportación,
no poder reproducir la salida desde fuentes o no poder recuperar evidencias de
forma remota. En esos casos se repara el circuito antes de producir el catálogo.

No declares completado P0 por encontrar un ejecutable. No pidas mediciones de
80 aldeanos ni rendimiento móvil: todavía no existe la escena que las permitiría.
