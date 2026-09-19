# OBS-02 · Ampliación del piloto: Terra frente a Sol

El usuario autoriza, después del piloto Luna, una comparación adicional con un
agente `gpt-5.6-terra` y otro `gpt-5.6-sol`. No autoriza batería completa ni arreglos.

Ambos reciben los mismos tres casos A/B/C, sin historial heredado, sin acceso a
veredictos anteriores y con el mismo encargo entre sí. Mantienen el protocolo
Luna: lectura visual guardada antes del contraste, mínimo 15 imágenes contiguas
A/B, vistas C, auxiliares propios y límite orientativo de diez minutos. Cada uno
elige encuadre auxiliar y extensión de inspección; esas decisiones forman parte
del resultado práctico y se registran como diferencia de método, no se ocultan.

La comparación se limita a estas ejecuciones: tres Luna, un Terra y un Sol. No es
un benchmark estadístico, no estima tasas universales ni compara coste monetario.
No se especifica override de esfuerzo; se hereda la configuración del coordinador.

El coordinador evaluará:

- Defectos concretos encontrados visualmente antes de consultar trazas.
- Diferencia entre A y B reconocida sin conocer cuál contiene el arreglo.
- Calidad del contraste: métricas pertinentes, eventos e ids, límites explícitos.
- Falsos positivos y causas afirmadas sin evidencia.
- Resolución y cobertura efectiva de las imágenes empleadas.

Se conserva el criterio del piloto: cero penetración no garantiza movimiento
natural; tick 0→0 en C no demuestra fallo por sí solo. No se facilitarán estas
pistas a los revisores durante la prueba. Los informes originales permanecen
intactos; la evaluación del coordinador irá en un documento separado.
