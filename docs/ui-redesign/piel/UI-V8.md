# UI-V8 · Una sola directriz, y la bandeja como la del prototipo

Ronda de correcciones del dueño del diseño probando la demo en su tablet. Cuatro
cosas, y ninguna es de gusto: las cuatro son sitios donde la piel decía una cosa
en móvil y otra en pantalla grande, o donde no se parecía al prototipo.

## 1. La directriz, y por qué la primera versión estaba mal

Lo dijo mirando la crónica: «el de la crónica ha quedado muy mal, eso de que se
despliegue para arriba una tira y a los laterales se siga viendo así; en el resto
de secciones no lo hace igual; **deberíamos tener un estándar y que se viesen los
tres iguales**, aunque uno ocupe más espacio que otro».

Tenía razón, y el defecto era mío de UI-V7: acoté las **hojas** a 390 px y dejé
que las **barras** cruzaran la pantalla. O sea dos reglas distintas para la misma
cosa, y la crónica se veía como una tira de papel flotando con valle a los lados
mientras la bandeja cruzaba entera.

La regla correcta es la que la bandeja y la navegación ya seguían sin que nadie
la hubiera escrito: **la superficie cruza la pantalla y su contenido va en una
columna de 390 px.** Una sola directriz para las tres secciones —la crónica, la
gente, la ficha— y para las dos pantallas que las acompañan —la decisión y la
portada—. Lo que las distingue es **cuánto alto ocupan**, que es lo que tiene que
distinguirlas.

Y la columna son 390 px exactos, no 480 ni 520, porque toda esta piel se midió a
390: así ni un valor de la hoja deja de ser verdad al cambiar de pantalla.

Medido a 1240 × 1900 con el juego empaquetado:

| | 1240 × 1900 | 390 × 844 |
|---|---|---|
| Velo y página de la crónica | x 0, ancho 1240 | x 0, ancho 390 |
| Columna de contenido | x 425, ancho 390 | x 0, ancho 390 |
| Fila de la gente | x 425, ancho 390 | x 0, ancho 390 |
| Ficha y sus botones | x 425, ancho 390 | x 0, ancho 390 |
| Placa de fecha | x 27, ancho 334 | x 27, ancho 334 |

O sea: en móvil la geometría es idéntica pieza por pieza, y en tablet las cinco
pantallas se comportan igual.

## 2. La cabecera compacta recortaba las cifras

«Si te fijas en el título, se están cortando los recursos.» `.hud-compact-header`
estaba topada a 334 px de ancho y 50 de alto, con 183 px para cuatro cifras: con
tres dígitos en el grano no caben. Pasa a `width: auto` con **mínimos** en vez de
topes (`min-height: 50px`, `max-width: min(334px, calc(100% - 54px))`), así que
la cabecera crece con lo que tiene que decir y sigue sin chocar con el botón de
cerrar.

## 3. Fuera el selector de crónicas

«Ese selector de diferentes historias de varios pueblos no me gusta nada, hay que
quitarlo de ahí. Esa barra ahí en medio es horrorosa.» Fuera: `rebuildSourcePicker`
se queda vacía y la crónica abre siempre la del valle en curso. La medida lo
confirma en las dos pantallas: `.chronicle-source` ya no existe en el DOM.

## 4. La bandeja, que no se parecía al prototipo

Señaló el canto de arriba de la bandeja. Tres diferencias, y las tres se
arreglaron **mirando el prototipo en vez de deducirlo** (la técnica de la skill
`calcar-iconos`):

- **La hoja de roble era una piruleta.** La del prototipo es una hoja lobulada
  dibujada, y estaba dibujada, así que se calca: caja (400, 1490, 454, 1560),
  bias 0, cuatro bucles, 2952 caracteres de trazo.
- **El filete moría en seco.** En el prototipo cada hairline acaba en un punto
  de oro. Se hace con un solo pseudo-elemento y dos capas de fondo: la línea de
  1 px y un `radial-gradient` de 2 px en el extremo interior.
- **Y el canto no era un listón, y esto costó tres intentos.** Lo primero que
  probé fue un `border-radius` elíptico: sale un arco y el prototipo **no tiene
  un arco**. Medido en el prototipo 01: la madera baja a y 1507 en la esquina y
  sube a 1452 en el centro —31 px de flecha en medida de pantalla—, y a 27 px de
  la esquina sólo ha subido 6 mientras a 55 ya está arriba. Es decir: **hombros
  cortos y meseta larga**, que es lo que un palo doblado hace y lo que una
  elipse no sabe hacer.

  Así que lo dibuja una tapa SVG colgada por encima del hueco (`bottom: 100%`),
  estirada con `background-size: 100% 100%`: el papel por debajo de la curva, el
  listón encima de la junta, y transparente por arriba, donde se ve el valle. En
  una tablet la meseta se ensancha y los hombros se tienden, que es exactamente
  lo que hace un palo más largo.

  Dos cosas que se aprendieron pintándolo:

  - **El color.** `--skin-wood` es `#2B1F17` y con él el palo salía casi negro,
    como un marco metálico. El listón del prototipo es madera **clara**:
    muestreado en la banda del canto salen tres tonos —`#A9855D` la cara al sol,
    `#785A3C` el cuerpo, `#453624` la sombra— y son tres tokens nuevos.
  - **El relleno no es el token del papel.** Con `--skin-parchment-deep`
    (`#D9C2A5`) plano se veía un escalón clarísimo donde acababa la tapa: la
    bandeja se pinta con la textura encima y sale `#CBB59A`. El relleno lleva el
    color con el que la bandeja se pinta **de verdad**, medido en la captura, no
    el del token.

  Y un intento intermedio que se descartó: con un tramo recto junto a la esquina
  y la curva después, la tangente rompe y salía una rodilla; el canto parecía una
  escuadra. Se dibuja con una cúbica de **tangente horizontal en la esquina**.

## Verificación

Typecheck y lint limpios; 54 pruebas rápidas de interfaz en verde (la del sprite
compara los dos ejemplares del `icons.svg` y todos los `d=`); los cuatro
recorridos de maquetación —el menú, las cuatro velocidades, abrir y cerrar las
secciones y el hueco de mensaje— también. Geometría medida en navegador real a
390 × 844 y 1240 × 1900, sin errores de página en ninguna.

Y una trampa de esta ronda que costó media hora y merece quedar escrita: **un
backtick sin escapar dentro de una plantilla de CSS en un `.ts` rompe el build**
(`TS1005` en `chronicle.ts`), y `bundle-game.ts` **imprime «52 recursos» y un
tamaño aunque su vite interno haya fallado**, así que empaqueta el `dist/`
anterior y las capturas salen idénticas mientras crees que no has cambiado nada.
Typecheck antes de empaquetar, siempre.
