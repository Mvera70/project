# OBS-02 piloto ciego — revisión visual Luna2

## Alcance y método

Revisé hojas de contacto construidas localmente a partir de PNG contiguos, sin leer las trazas en esta fase. A y B: frames `0000–0060` (61 consecutivos, 4 s a 15 fps), en cuatro hojas por caso. C: frames `0000–0016` (17 consecutivos), en una hoja. También amplié visualmente A/B en 0000, 0030 y 0060 y C en 0000, 0008 y 0016. La evaluación cubre movimiento humano visible, contactos/aproximaciones, y colocación del entorno.

## Caso A

En los 61 frames se ve una aldea estable con casas, valla y puerta, rocas, troncos, parcela y tienda en posiciones constantes. Varios aldeanos cambian de posición de forma gradual entre el inicio, mitad y final; hay cuerpos que permanecen quietos y otros que avanzan por el espacio abierto o alrededor de la puerta. La puerta aparece abierta en las vistas ampliadas. Se observan aproximaciones y pequeños grupos junto a la entrada y las casas; no se ve un cuerpo atravesando claramente una pared o la valla. Una gallina permanece en el área inferior derecha y cambia ligeramente de posición/pose.

**Clasificación en el intervalo `0000–0060`: sin anomalía visual clara.** Hay una burbuja de conversación visible en parte de la secuencia. La escala de los cuerpos es coherente con la profundidad y el entorno no deriva entre frames.

## Caso B

Los 61 frames muestran el mismo tipo de escena de aldea y una evolución continua de las posiciones humanas. Se ven trayectorias alrededor de la puerta, casas y parcela; algunos aldeanos convergen cerca de la entrada y otros se separan hacia el campo. La puerta sigue visible y abierta. En las ampliaciones no se aprecia penetración inequívoca de edificios, valla o suelo. La gallina cambia de postura/posición ligeramente sin abandonar su zona visible.

**Clasificación en el intervalo `0000–0060`: sin anomalía visual clara.** La secuencia contiene aproximaciones de varios cuerpos, pero no permite confirmar contacto físico ni colisión sólo por píxel. El entorno permanece colocado de forma estable.

## Caso C

En los 17 frames la escena es un asentamiento pequeño junto a un río, parcela y casa. Los dos aldeanos cambian de posición; entre frames se ve a uno avanzar hacia el área de la parcela/ribera y al otro terminar junto al vado. En el frame final, el aldeano de la derecha está colocado en el vado/agua somera y la escena muestra un cruce plausible, sin salto visual ni cuerpo hundido. Tres gallinas se desplazan poco y cambian de pose. La puerta de la casa se ve abierta en frames intermedios y finales.

**Clasificación en el intervalo `0000–0016`: sin anomalía visual clara.** El cruce del río sólo puede describirse como colocación visible; la hoja no demuestra la ruta completa ni ausencia de penetración entre muestras.

## Limitaciones

La inspección visual no identifica ids, estados internos, rutas completas, contactos fuera de los PNG ni eventos entre muestras. Las hojas A/B permiten ver movimiento a 15 fps pero no juzgan con precisión la articulación de cada zancada. C tiene sólo 17 frames a 2 fps y por ello es evidencia breve. No concluyo ausencia global de fallos a partir de estas ventanas.
