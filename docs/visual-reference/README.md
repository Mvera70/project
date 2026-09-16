# Referencias visuales para Claude

**16 septiembre 2026 · Propuesta, sin implementar ni calibrar.** Encargo del
dueño: responder a las cuatro referencias solicitadas por Claude. Base leída:
`9e22079`, rama `rework/parada-a-media`, con trabajo de IA concurrente sin commit.
Los documentos normativos siguen siendo `../design.md` y `../rework.md`.

Abre [el cuaderno visual](index.html) en un navegador. Funciona sin red; contiene
24 viñetas, tres escenas a escala sobre el encuadre existente, diez plantas y
cuatro estados de la franja inferior. GitHub muestra el código HTML: descargar
la carpeta o abrirla desde el checkout para ver los dibujos. Las imágenes de
evidencia sí se pueden consultar directamente en GitHub.

Láminas estáticas para consulta directa: [saludo](evidence/preview-story.png),
[cesión](evidence/preview-yield.png), [riña](evidence/preview-quarrel.png),
[diez plantas](evidence/preview-maps.png),
[franja inferior](evidence/preview-docks.png) y
[comparación de escala](evidence/preview-scale.png). Esta última es una lámina:
para mantener 1:1 CSS px, usar el cuaderno al 100 %, no la miniatura de GitHub.

## 1. Cómo usar estos números

Cada tiempo del cuaderno es una **hipótesis de montaje**, elegida para separar
visualmente intención, respuesta y salida. No es una medida de conducta humana
ni una constante autorizada del juego. Los tamaños de la interfaz son geometría
de prototipo. Las alturas 6 y 20 son condiciones de ensayo en píxeles CSS.
Las medidas observadas se distinguen en §5.

El código actual avanza la vida a `LIFE_STEP = 1/30` segundos escénicos y
`scenicRate` sigue la velocidad entera. A ×1, un segundo escénico nominal equivale
a uno real; a ×64, 2,1 segundos escénicos duran nominalmente 33 ms reales.
El rendimiento puede alterar esa equivalencia observada. **No prometer que un
saludo se lee a ×64 ni alargarlo según cámara/FPS**: cambiaría la reconstrucción
determinista. La validación detallada de gestos se hace a ×1; a velocidades altas
se evalúan flujos y ocupación, documentando la pérdida de legibilidad.

Hay texto histórico desactualizado en `design.md` §4.1 (15 s/semana) frente a
`balance.ts` (840 000 ms/semana) y `CLAUDE.md`. Este cuaderno usa el reloj actual;
no modifica esa discrepancia normativa.

## 2. Coreografía a cuatro tiempos

Las ocho viñetas de cada escena son instantes clave, no ocho estados nuevos de
IA. La aproximación real depende de distancia, velocidad y ruta: el cronómetro
empieza cuando ambos ya están próximos. Los pies mandan sobre la orientación
del cuerpo; la mirada no debe hacer que el personaje camine de espaldas.

| Escena | Aproximación | Encuentro | Resolución | Vuelta | Motivo de la hipótesis |
|---|---|---|---|---|---|
| Saludo | 0–0,6 s | 0,6–1,2 s | 1,2–1,7 s | 1,7–2,1 s | Dar tiempo a que una respuesta se distinga del gesto inicial, conservando la marcha |
| Cesión | 0–0,8 s | 0,8–1,4 s | 1,4–2,6 s* | 2,6–3,6 s* | Separar desplazamiento lateral, espera y reanudación; sólo uno se detiene |
| Riña | 0–1,6 s | 1,6–3,2 s | 3,2–5,2 s | 5,2–6,4 s | Hacer legible la oposición, una réplica y la separación sin convertirla en combate repetido |

\* En cesión, manda que el otro haya despejado el corredor, no que venza este
cronómetro. Los tiempos dibujan un ejemplo, con salida por cancelación si no hay
progreso. Ninguna escena fuerza un destino imposible.

**Saludo.** Dos trayectorias continuas, sin parada ni encuentro frontal. La cara
se orienta al otro antes del gesto, la mano sube una sola vez y el segundo
responde ligeramente después. Al quedar atrás el interlocutor, la mirada vuelve
al camino; no sigue rastreándolo hasta torcer el cuerpo. El brazo necesita pose
de render: no se da por existente. Si sólo hay `body.facing`, probar primero el
gesto disponible y encargar la separación cabeza/torso; no fingirla girando el
cuerpo entero.

**Cesión.** El cedente ocupa un hueco lateral válido antes de parar. El que pasa
mantiene rumbo, sin bailar a izquierda y derecha. El cedente mira al que pasa,
espera fuera de su círculo y reanuda después de que ambos radios hayan despejado
la trayectoria. Si no hay apartadero, espera antes del estrechamiento. No
inventar espacio detrás de una pared; reservarlo y comprobarlo.

**Riña.** Sólo con los ids del hecho real (`happenings[].who` en la riña de
plaza) o una escena ya autorizada por la especificación. Se acercan y frenan
fuera del contacto, se encaran, uno gesticula y el otro responde con un paso
atrás. Bajan los brazos y toman salidas alcanzables diferentes. El boceto no
añade golpes, heridas, reconciliación ni público obligatorio. Un hecho que
requiera violencia explícita necesita su representación específica.

**Qué cambia respecto al saludo actual.** `scenes.ts` documenta `GREET_SPAN`
0,3–0,6 s, `GREET_ODDS = 0.2` y `playGreet` orienta ambos cuerpos. El montaje de
2,1 s es un candidato a comparar, no una orden de sustituirlos. El gesto central
dura 0,6 s en esta propuesta; el resto es anticipación y recuperación.

**La frecuencia no sale de las viñetas.** Contar cruces elegibles únicos,
saludos aceptados, escenas completadas y repeticiones por pareja/jornada, además
del tiempo en interacción. Verificar si la tirada se repite por paso mientras la
pareja permanece cerca: con probabilidad p repetida n veces, la probabilidad
acumulada es `1 − (1 − p)^n`, no p. A modo de cálculo ilustrativo, diez intentos
con p=0,2 dan 89,3 %; no se ha medido que hoy ocurran diez intentos. La llave de
`proposeGreet` incluye el paso: corresponde auditar la elegibilidad en su
llamante antes de interpretar «uno de cada cinco cruces».

## 3. Legibilidad y escala

El cuaderno muestra un encuadre móvil **390 × 844 CSS px**. La fotografía
histórica de fondo tiene 780 × 1688 píxeles (DPR 2); se presenta a la mitad,
sin confundir píxeles de imagen con píxeles CSS. Los personajes esquemáticos
superpuestos tienen 20 o 6 CSS px de alto. El ancho del teléfono no se reduce:
en ventanas estrechas se desplaza horizontalmente para conservar la escala.
Usar zoom de navegador 100 %. No equivalen a milímetros físicos de un móvil.

Los dibujos sobre fondo real son **composiciones de referencia**, no capturas
de comportamientos implementados. Cambiar el selector de instante permite
comparar saludo, picoteo y cesión. La gallina mide respectivamente 7 o 2,1 CSS px
en este ensayo: proporción propuesta, pendiente de medir en el recurso real.

Lectura esperada, todavía por verificar en el juego:

- A 20 px, apostar por contorno del brazo, pausa y separación; una cara o una
  mano detallada no son portadores fiables de significado.
- A 6 px, un giro de cabeza o un pico aislado no ofrece detalle suficiente para
  confiarle el significado. Probar continuidad de trayectorias, alternancia de
  quietud/marcha y separación. No aumentar toda la población por este boceto.
- Picoteo: cuerpo que permanece en un parche, cabeza que baja/sube y pequeño
  avance entre tandas. No desplazar el cuerpo entero como un pistón. A distancia
  puede leerse «animal buscando» sin distinguir cada picotazo.
- Cesión: el vacío abierto en el paso y el orden «A espera / B pasa / A sigue»
  tienen más oportunidad de sobrevivir a la reducción que cualquier gesto fino.

Para medir: fijar semilla/día/pasos, cámara, velocidad, viewport y DPR; capturar
la misma interacción con y sin gesto. Medir caja del cuerpo sin sombra ni
herramienta. Presentar sin etiquetas y registrar qué acción se reconoce y con
cuál se confunde. Varias semillas y jornadas, tanto suelo claro como sombra y
oclusiones. No fijar un umbral de éxito con los dibujos. Si sólo se reconoce con
zoom, documentar ese alcance; la cámara general sigue mostrando vida por flujos.

## 4. Los diez rasgos en planta

Las plantas usan el mismo rectángulo 72 × 112 y señalan el corazón 36 × 56.
Son composiciones esquemáticas, sin semilla generada ni promesa de distribución
exacta. Gris = relieve/roca; verde oscuro = bosque; azul = agua; ocre = suelo
especial/camino; pequeños rectángulos = fundación; trazo discontinuo = corazón.

| Id | Señal espacial propuesta | Qué no debe confundirse |
|---|---|---|
| `good_clay` | Bancos de arcilla rojiza compactos en una ribera baja | No teñir todo el río ni introducir un recurso de inventario nuevo |
| `thin_soil` | Prado pálido con calvas extensas y parcelas discontinuas | Suelo pobre, no una cantera ni un valle nevado |
| `old_forest` | Masas grandes de copa irregular, claros escasos distribuidos | Bosque viejo general; no sólo el muro norte de `wolf_country` |
| `bare_hills` | Lomas abiertas de hierba y afloramientos escasos | El código reduce pedregales a la mitad; no dibujar un desierto de piedra |
| `marsh_valley` | Cinturón ancho encharcado junto al río, islas secas y juncos | Fundación en tierra seca; agua y ruta deben coincidir con transitabilidad |
| `stone_valley` | Afloramientos agrupados cerca del corazón y frentes de roca | No casas de piedra regaladas: el beneficio propuesto está en R-3 |
| `old_ruins` | Rectángulos incompletos de muros y patio invadido | Distinguir ruina antigua de casa recién destruida; acordar su colisión |
| `wolf_country` | Franja forestal cerrada al norte, entradas estrechas al claro | No lobos permanentes de adorno que prometan un suceso inexistente |
| `spring_valley` | Nacimiento puntual y pequeña cuenca al pie de la ladera | Sin río atravesando el mapa, sin vado ni camino de cruce |
| `wide_ford` | Banda somera ancha, dos orillas abiertas y camino exterior continuo | No puente dibujado encima de agua que el navegador no puede cruzar |

Los cuatro primeros son rasgos existentes; sus nuevas señales visuales son
propuestas. Los seis últimos proceden de `rework.md` R-3 y siguen pendientes.
No todos sus efectos mecánicos están implementados por tener aquí un dibujo.

**Composición de parejas.** Aplicar primero hidrología, después relieve/cobertura,
después detalles/fundación. Probar cada rasgo aislado y después las parejas;
conservar al menos una señal de cada uno sin tapar accesos. `spring_valley` y
`wide_ford` se contradicen literalmente: **decisión pendiente del dueño del
generador** (excluir pareja o revisar uno). Este documento no cambia el sorteo
ni establece una precedencia silenciosa. `spring_valley` con `marsh_valley`
también necesita acordar si admite humedal de manantial o se excluye. La prueba
de seis semillas y distancia de R-3 sigue siendo la exigencia del rework.

## 5. Franja inferior y evidencia del juego

Una única pila de layout, de abajo arriba: área segura → navegación → acceso
a órdenes/tiempo → un espacio de mensaje. Cada pieza mide su contenido; no
compiten cuatro `bottom` independientes. Este diseño concreta la bandeja única
de `../ui-redesign/implementation-plan.md`, no abre un rediseño paralelo.

Prototipo: márgenes laterales 12 px, separación 8 px, navegación 56 px más
safe area; fila de controles mínimo 52 px; mensaje mínimo 56 px que crece con
el texto. Motivos: objetivos táctiles de 44 px ya exigidos en el proyecto y
separación visible entre lectura y acción. A 390 × 844, safe area 0 y mensaje
de 56 px: navegación y=788–844, controles y=728–780, mensaje y=664–720.
Con texto largo, la pila crece hacia arriba: esos y no son constantes del juego.
Safe area se añade una vez debajo de navegación. El ensayo de 34 px es un caso
de prueba, no la medida de todos los iPhone.

| Coincidencia | Ocupa el mensaje | Qué cede y cómo vuelve |
|---|---|---|
| Pista de órdenes + aviso de crónica | Aviso de crónica | Pista pendiente, sin marcar como vista; reaparece cuando el espacio queda libre |
| Decisión pendiente + aviso ordinario | Acceso persistente a la decisión | Aviso queda en crónica; no oculta la decisión |
| Velocidad abierta + pista/aviso | Bandeja de órdenes y tiempo | Mensaje compacto cede; crónica conserva noticia y su indicador de novedad |
| Más de un aviso | Uno según prioridad existente | Agrupar novedad en crónica, sin una cola interminable de cartelas |
| Encrucijada/epitafio abiertos | La superposición completa | Ocultar y retirar de foco controles cubiertos; restaurar navegación al salir cuando proceda |

La velocidad actual y el acceso a las órdenes persisten en la fila de control;
la pista no es el acceso. Una decisión pendiente conserva acceso también en la
bandeja expandida. Un hito de `moment.ts` es otro emisor que debe someterse al
arbitraje; no conservar una quinta cartela flotante sobre esta pila. El sonido
también necesita hueco reservado (44 px en el prototipo).

**Observado en código:** pista `bottom:82px`, aviso `bottom:118px + safe area`,
controles `bottom:60px + safe area`; la pista puede crecer varias líneas. Esas
reglas permiten intersección vertical; el `z-index` no resuelve la reserva de
espacio. No se ha reproducido en esta ronda la coincidencia concreta de ambos
mensajes: no se presenta como un solapamiento nuevo medido en DOM.

**Capturas nuevas, abiertas y revisadas:** [01](evidence/live-01.png),
[02](evidence/live-02.png), [03](evidence/live-03.png),
[04](evidence/live-04.png) y [final](evidence/live.png).
Semilla 7, año 1/primavera/día 1, ×1, viewport 390 × 844, DPR 2,
render 3D reconocible visualmente. El capturador no guarda una comprobación
explícita del contexto WebGL: esa aserción queda pendiente para la validación
de IA. No hay avance artificial de semanas ni respuestas a encrucijadas.

```powershell
npm run dev -- --host 127.0.0.1 --port 4173
node tools/graphics/shot.mjs --page http://127.0.0.1:4173/ --seed 7 --settle 4 --sequence 4 --every 0.5 --out docs/visual-reference/evidence/live.png
```

Salida real: cero errores de página. Antes de cada disparo: 09:00/fase 0,3131;
09:00/0,3276; 10:00/0,3429; 10:00/0,3603. Lectura posterior al disparo final:
11:00, dos personas, grano 75, madera 100, ánimo 55 (el PNG todavía muestra
10:00). **0,5 s es la espera entre capturas, no su
cadencia efectiva**: capturar también consume tiempo. Son fotogramas espaciados,
no un vídeo de 2 s ni evidencia suficiente de un saludo de 0,3 s.

Mi lectura: entre 01 y 04 el vuelo inicial cambia mucho la escala; por eso esa
secuencia no sirve para comparar el tamaño del gesto a cámara fija. En 04 se
distinguen cuerpos y herramientas, pero la cara no permite juzgar un saludo.
El bosque produce oclusiones fuertes alrededor de las casas. La pista de
órdenes ocupa cuatro líneas y una porción importante del pie de paisaje. En 01
coexisten cartela de fundación y aviso de rasgo; en 04 queda la pista. No aparece
una secuencia completa de saludo, picoteo, cesión o riña que permita validarlos.
La medida histórica de seis píxeles en reposo procede de `../dos-sesiones.md`;
no se ha confirmado como encuadre de reposo actual.

## 6. Entrega y siguiente comprobación

Referencias entregadas: tres guiones de ocho viñetas, comparador a 6/20 px,
diez plantas, cuatro estados de interfaz y cinco capturas reales. No se cambia
código del juego, modelos, balance ni documentación normativa. No se ejecutan
las suites del motor para una entrega documental.

Verificación documental reproducible: `node docs/visual-reference/verify.mjs`.
Comprueba los 24 cuadros, diez mapas, cuatro estados de franja, enlaces locales,
carga de imágenes y cambio de las tres escenas. Ensaya anchos 320/390/1280 sin
desbordamiento global y conserva los teléfonos de escala en 390 CSS px.
El [informe](evidence/verification.json) recoge el resultado; las láminas
anteriores son capturas del cuaderno, no del juego. El script requiere el
Chromium instalado que ya utiliza la herramienta de capturas del proyecto.

Para Claude: seleccionar una interacción ya reproducible, guardar su semilla,
estado de jornada e ids, esperar a cámara estable y entregar los cuatro tiempos
con pasos exactos y contexto 3D comprobado. Comparar gesto actual con candidato,
medir el cuerpo en CSS px y escribir qué lectura mejora o empeora. Si faltan
poses del rig, devolver ese encargo a arte. El cuaderno permite decidir qué
se quiere ver; **la fase sólo se valida sobre la secuencia del juego**.
