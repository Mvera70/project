# Catálogo de historias y encrucijadas

> **FOTO DEL 17 SEP 2026, y no se mantiene a mano.** Decía que había que
> actualizarlo cada vez que cambiara una historia, y desde entonces han
> entrado el rey (K-5, K-8), el cierre de la muralla, el portón y el clan
> vecino sin que nadie lo tocara — que es lo que le pasa siempre a un
> documento que copia lo que el código ya sabe. **La respuesta viva es
> `npm run eligibility`**, que mide el catálogo real y dice además cuáles no
> salen nunca. Esto se queda como lo que es: la foto de un día.

**Creado:** 17 de septiembre de 2026

**Última actualización:** 17 de septiembre de 2026
**Fuente:** catálogo actual del motor y bancos de texto de `src/engine/`

Este documento resume el contenido narrativo disponible en el juego. La fecha
de actualización debe cambiarse cada vez que se añadan, eliminen o modifiquen
historias, encrucijadas o familias de textos.

## Tamaño actual del catálogo

- **20 encrucijadas jugables.**
- **29 familias de historias automáticas** de la crónica.
- **258 claves de texto narrativo**, contando variantes, agregados anuales,
  consecuencias y formas para distintos casos.
- **152 textos de encrucijadas**, entre títulos, situaciones, opciones, costes y
  consecuencias.
- **186 textos de interfaz.**

Las cifras de claves incluyen las distintas formas que puede tomar una historia;
no representan 258 historias independientes. Tampoco todas las entradas aparecen
en cada partida: las encrucijadas tienen condiciones, pesos y enfriamientos.

## Encrucijadas jugables

1. **La deuda de grano de Wealdmere** — el señor exige que la aldea pague una
   deuda durante el invierno. Se puede negociar, rechazar o robar el cargamento.
2. **El diezmo y las gavillas** — un recaudador cuenta la cosecha y reclama su
   parte.
3. **Semilla o pan** — hay grano para sembrar o para alimentar a la población,
   pero no para ambas cosas.
4. **El granero forzado** — alguien roba comida y dos aldeanos se acusan
   mutuamente.
5. **Dónde enterrar a los muertos** — una epidemia obliga a decidir entre
   entierros individuales, una fosa común o quemar casas.
6. **Un culpable para la peste** — el sacerdote acusa a alguien de haber
   provocado la enfermedad.
7. **El yunque y el altar** — herrero y cura arrastran una disputa que acaba
   delante de toda la aldea.
8. **La herencia del padre** — un conflicto antiguo pasa a la siguiente
   generación.
9. **Madera para una sola obra** — la aldea debe escoger entre construir una
   capilla o ampliar el granero.
10. **El vendedor de reliquias** — un mercader ofrece un supuesto hueso de santo.
11. **El bosque viejo** — se decide si talar el bosque antiguo, explotar sólo el
    borde o conservarlo.
12. **Huellas junto a la empalizada** — lobos rondan la aldea durante el
    invierno.
13. **Nueve en el vado** — un grupo de desconocidos pide refugio y comida.
14. **Seis hombres y un caballo** — aparecen bandidos y la aldea debe pagar,
    luchar o fortificarse.
15. **El tratante de ganado** — un comerciante ofrece animales a cambio de
    recursos.
16. **La sal de la costa** — un mercader ofrece sal y propone distintos
    intercambios.
17. **El factor de grano** — un intermediario quiere comprar el excedente de la
    cosecha.
18. **Quién habla ahora** — la aldea debe resolver una sucesión de liderazgo.
19. **La primera piedra** — se decide si levantar las primeras construcciones de
    piedra, una muralla o casas nuevas.
20. **Unos años tranquilos** — la aldea disfruta de abundancia y puede invertir
    en granero, comida o una obra gratuita.

## Familias de historias automáticas

- Fundación del valle y llegada de nuevos habitantes.
- Estaciones y paso de los años.
- Nacimientos.
- Muertes por edad, hambre, frío, enfermedad, fuego y violencia.
- Llegadas, partidas, abandono y dispersión de la aldea.
- Construcción y pérdida de edificios.
- Tala del bosque, agotamiento, cosechas y forraje.
- Hambre, peste, incendios y otros sucesos del valle.
- Ganado, caza, pesca y cuervos.
- Riñas, rencores, recuerdos y sucesiones.
- Hitos, bienvenida, rasgos del valle y consecuencias de las decisiones.
- Extinción o final de la aldea.

## Cómo mantenerlo actualizado

Cuando cambie el catálogo, actualizar en este orden:

1. La fecha de **Última actualización** de la cabecera.
2. Las cifras de la sección **Tamaño actual del catálogo**.
3. La lista de encrucijadas o familias afectadas.
4. La ruta y el commit que contienen el cambio, si se está preparando una
   revisión de contenido.
