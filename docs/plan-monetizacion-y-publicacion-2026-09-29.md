# Monetización y publicación de The Valley · propuesta

**Iniciado el 29 sep 2026 · actualizado el 30 sep 2026.** Vera ha mostrado
interés por un precio asequible, ofertas y una edición de Switch; el modelo,
los importes y el presupuesto siguen pendientes de decisión. Este documento
plantea cómo vender, dar a conocer y publicar el juego. No autoriza compras, altas
en plataformas, cambios de precio, cambios en la PWA ni un lanzamiento. La
especificación vigente sigue en `design.md`; esta propuesta no la modifica.

## 1. Punto de partida

- The Valley es un juego móvil en TypeScript y Three.js, instalable como PWA y
  jugable sin conexión. `pages.yml` publica el `dist/` completo desde `main` en
  GitHub Pages; `package.json` no define un servidor de cuentas o pagos.
- Las partidas se guardan en IndexedDB (`src/ui/idb.ts`). Hoy no hay un flujo de
  exportación e importación de partidas. El almacenamiento de IndexedDB se
  separa por origen, así que una app empaquetada no heredará automáticamente
  la partida de la web. [MDN: IndexedDB y origen](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Basic_Terminology).
- Antes de elegir una aplicación móvil o probar Capacitor faltan medidas
  sistemáticas del 3D y del combate en dispositivos reales. La experiencia de
  apertura y de las primeras horas también está en revisión.

## 2. Modelo recomendado para estudiar

**Una compra para el juego completo, sin anuncios dentro del juego ni
consumibles en el lanzamiento.** Mantener la PWA como vía de prueba. Antes de
cobrar, preparar una demo pública que enseñe una decisión con consecuencias.
La edición pagada sería la aplicación móvil completa, si la prueba técnica y la revisión de las
tiendas lo permiten. La demo y el juego completo deben compartir el núcleo;
el alcance exacto de la demo se decidirá tras RD-0 a RD-6 y pruebas externas.

| Modelo | Ventaja | Coste o encaje con este juego |
|---|---|---|
| Compra única | Precio claro; el juego conserva su ritmo y su promesa sin conexión | Hay que demostrar el valor antes de la compra; sirve una demo separada |
| Descarga gratuita y desbloqueo único | La prueba ocurre dentro de la misma app | Exige compra integrada, restauración y más estados de producto. En Google Play, una app publicada como gratuita no puede pasar después a pagada con el mismo paquete; [norma de precios](https://support.google.com/googleplay/android-developer/answer/6334373?hl=es-419) |
| Gratis con anuncios o compras repetidas | Entrada sin pago | Requiere diseñar economía, tienda, medición, soporte y cumplimiento de anuncios. Ninguna de esas piezas está en el juego actual; condicionaría su ritmo de observación |

**Precio de prueba, no precio aprobado: 5,99 € en España.** La consulta del
29 sep 2026 tomó como referencias las fichas españolas de
[Pocket City 2](https://apps.apple.com/es/app/pocket-city-2/id1533709428),
[Townscaper](https://apps.apple.com/es/app/townscaper/id1549531491) y
[Kingdom Two Crowns](https://apps.apple.com/es/app/kingdom-two-crowns/id1477991646).
Son referencias de estantería, no una previsión de ventas ni juegos idénticos.
Validar el valor percibido con personas ajenas al proyecto y volver a mirar
esos precios antes de fijar el nuestro. El importe cobrado no equivale al
ingreso neto: intervienen impuestos, devoluciones y condiciones de cada tienda.

Vera plantea **ofertas temporales en torno a 2,50–3 €** desde ese precio base.
Es una hipótesis comercial, no un calendario aprobado: Apple permite
[programar cambios de precio de las apps](https://developer.apple.com/help/app-store-connect/reference/pricing-and-availability/app-pricing-and-availability)
y Google Play ofrece [rebajas de apps de pago](https://support.google.com/googleplay/android-developer/answer/7271135?hl=en-GB).
Comprobar el precio exacto admitido y el resultado de las primeras ventas antes
de elegir fechas y frecuencia.
Si The Valley llega a Switch, incluirlo en la estrategia de ofertas: Nintendo
confirma [promociones de precio tras el lanzamiento](https://developer.nintendo.com/the-process)
y que el desarrollador [decide el precio base](https://developer.nintendo.com/faq).
El precio y el descuento concretos de esa edición se fijarán cuando se conozca
el coste del port y las condiciones de eShop.

Contenido adicional de pago quedaría para después de publicar, si existe una
ampliación sustancial que los jugadores pidan. No reservar contenido esencial
del juego base para venderlo por piezas.

## 3. Canales y orden propuesto

1. **Beta web actual.** Conservar la PWA completa durante desarrollo y pruebas.
   Antes de ofrecer una edición de pago, decidir qué muestra la web y cómo se
   conservan o trasladan las partidas de quienes ya jugaron. No basta con
   ocultar una pantalla: el sitio estático entrega el código y los recursos.
2. **Prueba de aplicación móvil, cuando la experiencia esté lista.** Empaquetar una muestra con
   Capacitor y medir arranque, fotogramas, batería, suspensión/reanudación,
   guardado y un asedio en teléfonos reales. Capacitor conserva una vista web;
   su uso no garantiza mejor rendimiento ni aprobación de tienda. Apple pide
   una experiencia con valor más allá de una web reempaquetada en su
   [regla 4.2](https://developer.apple.com/app-store/review/guidelines/). La
   compilación y el envío de iOS requieren un Mac con
   [Xcode](https://developer.apple.com/documentation/xcode).
3. **Publicación de pago en Google Play y App Store**, si la experiencia pasa
   esas pruebas. Preparar fichas, vídeo/capturas reales, precio por territorio,
   soporte y un proceso de actualizaciones. Un desbloqueo dentro de una app
   gratuita obligaría a integrar los sistemas de compra de las tiendas según
   sus reglas generales: [Apple 3.1.1](https://developer.apple.com/app-store/review/guidelines/) y [Google Play](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en); las excepciones regionales deben revisarse en ese momento.
4. **Nintendo Switch: candidata concreta a edición portátil.** La pantalla
   táctil permite conservar buena parte de los gestos del juego. Nintendo
   [distingue los modos compatibles por título](https://www.nintendo.com/sg/support/switch/playmode/index.html),
   así que se puede estudiar una edición centrada en modo portátil; añadir TV
   requeriría controles con mando y lectura a distancia. La pantalla de Switch
   original es [horizontal, 1280 × 720](https://www.nintendo.com/us/gaming-systems/switch/tech-specs/),
   mientras que la PWA actual se concibió en vertical: habría que comprobar el
   encuadre, las bandejas y la legibilidad. El trabajo pendiente es técnico:
   la PWA/Capacitor no produce un ejecutable de Switch. Nintendo
   exige [acceso específico a su entorno de desarrollo](https://developer.nintendo.com/the-process)
   y revisión para publicar. Tras obtenerlo, la primera prueba sería importar
   una escena pequeña, ejecutar un tick equivalente y medirla en el hardware de
   desarrollo. No dar por inevitable una reescritura completa antes de explorar
   las opciones que ofrezca ese entorno.
5. **PC/Steam, solo si se diseña una edición de escritorio.** El juego actual
   está pensado para pantalla vertical y tacto. Steam añade un coste de entrada
   de [100 USD por aplicación](https://partner.steamgames.com/doc/gettingstarted/appfee?l=spanish), recuperable al alcanzar el umbral que Valve indica; no es el canal que debe dictar ahora la interfaz.

## 4. Cómo se descubrirá el juego

**Promocionar The Valley es una tarea distinta de insertar anuncios en la
partida.** Las tiendas ya tienen búsqueda y recomendaciones: Apple explica el
papel de la [categoría, la ficha y las palabras clave](https://developer.apple.com/app-store/discoverability/),
y Google describe la [búsqueda y recomendación de Play](https://support.google.com/googleplay/android-developer/answer/9958766?hl=en).
Estar en una tienda no garantiza que el juego se descubra; preparar su llegada
forma parte del lanzamiento.

1. **Antes de publicar:** una página de presentación ligera con la propuesta
   del juego, capturas reales, tráiler corto, demo y enlace claro a la futura
   ficha. La página de presentación debe explicar el juego con claridad;
   `tools/graphics/press-kit.mjs` ya produce material
   de prensa. Compartir avances visuales y ofrecer una versión de prueba a
   creadores y comunidades interesados en simulación y juegos de aldea.
2. **En la tienda:** elegir categorías y términos fieles al juego; probar que
   icono, primeras capturas y vídeo enseñen el valle, las decisiones y el
   asedio. Apple detalla [qué aparece en resultados de búsqueda](https://developer.apple.com/app-store/product-page/).
   Google Play y App Store permiten [experimentos de ficha](https://support.google.com/googleplay/android-developer/answer/12053285?hl=en)
   y [pruebas de página](https://developer.apple.com/app-store/product-page-optimization/)
   cuando exista tráfico suficiente.
3. **Publicidad pagada de prueba:** reservar una partida del presupuesto de
   lanzamiento para campañas pequeñas y medibles una vez estén listas las
   fichas. [Apple Ads](https://ads.apple.com/app-store/help/apple-ads-basic/0001-compare-apple-ads-solutions)
   permite promoción en la App Store y [Google App campaigns](https://support.google.com/google-ads/answer/6247380?hl=en)
   en Búsqueda, Play, YouTube y otras superficies. Medir gasto por compra y
   ventas atribuidas antes de ampliar. Con un precio de 5,99 €, una campaña
   cuyo coste por comprador supere lo que queda después de impuestos, comisión
   y devoluciones no recupera su coste con la primera venta. No fijar aquí una
   cifra de inversión sin datos de conversión ni margen real.

La promoción podría necesitar pagos y trabajo continuo; la decisión pendiente
es cuánto invertir y en qué canales según la respuesta a la demo y las primeras
ventas. Cualquier analítica o SDK añadido se refleja en las declaraciones de
privacidad.

## 5. Puertas antes de vender

- **Producto:** completar y probar con jugadores la apertura, la progresión de
  las primeras horas, la claridad de las decisiones y la estabilidad de
  partidas largas. Probar en móviles de distinta capacidad. Garantizar una
  vía de exportación/importación antes de mover a quienes usan la PWA.
- **Derechos:** inventariar código, modelos, imágenes, audio, fuentes, marcas
  y sus condiciones de uso comercial. Confirmar procedencia y licencias de los
  recursos generados o aportados por terceros; comprobar disponibilidad del
  nombre y materiales de la ficha.
- **Privacidad:** publicar una política veraz y rellenar las declaraciones de
  datos de ambas tiendas, aunque no haya cuentas ni analítica. Apple exige
  [URL de privacidad y ficha de datos](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy); Google exige [política y sección Seguridad de los datos](https://support.google.com/googleplay/android-developer/answer/16543315?hl=es). Cualquier SDK añadido cambia las declaraciones.
- **Edad y contenido:** declarar con precisión violencia, armas, sangre y
  fuego. Apple usa su [cuestionario de edad](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating); Google Play exige la [clasificación IARC](https://support.google.com/googleplay/android-developer/answer/9898843?hl=es). No asignar una edad a ojo.
- **Identidad comercial y fiscalidad en España:** decidir quién será titular de
  las tiendas y de los ingresos antes del alta. La AEAT indica que el
  [alta censal se presenta antes de comenzar la actividad](https://sede.agenciatributaria.gob.es/Sede/censos/plazo-presentacion-modelo-306-037.html); la Seguridad Social explica el [alta en trabajo autónomo para actividad habitual por cuenta propia](https://portal.seg-social.gob.es/wps/portal/importass/importass/Categorias/Altas%252C%2Bbajas%2By%2Bmodificaciones/Altas%2By%2Bafiliacion%2Bde%2Btrabajadores/Alta_trabajo_autonomo). Una asesoría debe aterrizar obligaciones, IVA e ingresos según el titular y canal elegidos.
- **UE:** Apple exige declarar si se actúa como comerciante; para quien venda
  en la UE verifica y muestra [dirección, teléfono y correo](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements). Preparar un contacto comercial antes de abrir la ficha.
- **Costes y pruebas de tienda:** [Apple Developer Program cuesta 99 USD al año](https://developer.apple.com/programs/enroll/) y el alta de [Play Console cuesta 25 USD una vez](https://support.google.com/googleplay/android-developer/answer/6112435?hl=es), con importes locales posibles. Las comisiones dependen del programa, región y tipo de transacción: revisar las [condiciones de Apple](https://developer.apple.com/programs/whats-included/) y las [tasas actuales de Google Play](https://support.google.com/googleplay/android-developer/answer/112622?hl=en-GB) al presupuestar. Las cuentas personales nuevas de Google Play tienen actualmente una [prueba cerrada de 12 personas durante 14 días](https://support.google.com/googleplay/android-developer/answer/14151465?hl=es) antes de solicitar producción.
- **Venta web directa, si se elige más adelante:** exigiría pagos, acceso,
  atención al cliente, IVA y condiciones de compra propias. La UE exige
  informar de las características y compatibilidad del contenido digital, y
  regula [desistimiento y consentimiento para acceso inmediato](https://europa.eu/youreurope/business/selling-in-eu/selling-goods-services/ecommerce-distance-selling/index_en.htm). Dejarla fuera de la primera implementación de cobro.

## 6. Decisiones pendientes

1. Ratificar o corregir el modelo de **compra única + demo web**.
2. Confirmar si el primer destino comercial será móvil iOS/Android tras la
   prueba técnica, y si Switch se estudiará después como edición portátil.
   Steam permanece como posible edición de escritorio.
3. Definir dónde acaba la demo cuando la nueva apertura esté probada.
4. Fijar precio y territorios después de pruebas de jugadores y del cálculo
   real de costes, comisiones e impuestos.
5. Aprobar presupuesto y canales de promoción una vez se conozcan el margen por
   venta y la conversión de la demo y las fichas.

**Criterio para cambiar de modelo:** si personas ajenas al proyecto entienden
el valor y quieren seguir jugando después de la demo, pero la compra inicial
impide probarlo en tiendas, estudiar una descarga gratuita con **un solo
desbloqueo permanente**. No pasar a compras repetidas sin evidencia de que ese
modelo mejora el juego para el jugador y sostiene el trabajo de mantenerlo.

## 7. Registro de decisiones y aprendizaje

Este es el registro vivo para separar lo que Vera ha expresado, las propuestas
del equipo y los resultados medidos. La skill del proyecto
[`monetizacion-marketing-valley`](../.agents/skills/monetizacion-marketing-valley/SKILL.md)
mantiene esta sección y actualiza el apartado afectado cuando cambie el plan.

| Fecha | Origen | Aprendizaje | Estado y consecuencia |
|---|---|---|---|
| 29 sep 2026 | Vera | Le interesa partir de un precio asequible y hacer ofertas que podrían rondar los 2,50 €. | Orientación comercial. Los 5,99 € de referencia, el descuento exacto y su calendario no están aprobados. |
| 29 sep 2026 | Vera | Quiere estudiar Switch por su pantalla táctil e incluir la posible edición en las ofertas de eShop. | Candidata portátil; faltan prueba técnica, precio propio y condiciones de publicación. |
| 29 sep 2026 | Vera | Le preocupa que el juego no se descubra sin publicidad. | Preparar y medir promoción externa junto a demo, ficha, prensa y comunidades. El presupuesto sigue abierto; los anuncios dentro de la partida no forman parte de la propuesta inicial. |

Cuando haya una prueba comercial, añadir aquí la fecha, el canal, el público,
la pieza y su llamada a la acción, el gasto, las visitas o descargas, las
compras atribuidas y la decisión tomada. Registrar también qué datos faltan;
no convertir expectativas en resultados. Para aprobar una campaña, comparar
el coste por comprador con el ingreso neto estimado por venta y fijar un límite
de gasto antes de activarla.
