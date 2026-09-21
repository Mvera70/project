# Plaza persistente y sitios de vida

La primera medida conserva el fallo previo; su resolución vigente está en el
apartado final del 21 sep 2026.

## Medida · 21 sep 2026

La plaza que veía la vida no era la plaza persistente del valle. `state.plaza`
se elige al fundar, se reserva para no construir y el render le pone empedrado y
fuente; `life/places.ts` volvía a buscar, en cambio, el prado abierto más grande.
En diez partidas a cuarenta años las dos posiciones distaban entre 6,71 y 21,21
celdas.

Se ancla `square:common` a `state.plaza`. La fuente ocupa la celda central de la
máscara, por lo que sus cuatro puestos de cotilleo se escogen en el círculo
reservado, en suelo libre y en la componente alcanzable del pueblo. No se escribe
estado, no se consume azar del motor y no cambian ofertas ni horarios.

## Efecto que destapa la separación

En las seis semillas de la jornada V-10 (`7, 11, 23, 31, 37, 41`), al reproducir
la detección anterior sobre el mismo estado, la antigua plaza y el claro eran el
**mismo punto** en las seis: distancia 0. La prueba agregada de visitas contaba
por tanto una actividad del claro como si confirmara dos sitios distintos.

Con la plaza persistente, las distancias plaza-claro son 8,25; 10,77; 13,34;
20,22; 21 y 23 celdas. No es un corte de navegación: desde cada habitante inicial
hay ruta a plaza y claro en las seis muestras (72/72, 57/57, 24/24, 37/37, 47/47
y 57/57). El claro conserva seis puestos válidos, pero recibe 0 visitas de 6:
su oferta `work` pierde frente a trabajo y edificios más cercanos una vez que ya
no está co-localizada con la falsa plaza.

La propiedad de V-10 —el claro recibe visita en al menos la mitad de las
jornadas— queda como `it.fails`, sin bajar el umbral. Plaza y vado se comprueban
por separado como aserciones normales. Resolver la competencia de utilidad exige
una decisión de diseño sobre una oferta que no duplique plaza/campos; no se
reajusta en esta ronda.

## Resolución · 21 sep 2026

La oferta `work` del claro era inelegible para casi toda la aldea: `decide()`
descarta trabajo de niños y mayores y de adultos cuyo oficio está asignado en
otro sitio. El claro deja de fingir que es una segunda era y ofrece `loiter`,
la contemplación y descanso ya usados por el vado, con su hora de mediodía.
La plaza conserva `gossip` y el vado conserva agua y estancia: los tres tienen
papeles, lugares y horarios distintos, sin convocatoria ni bonificación nueva.

Con esa única variante, V-10 pasa **9/9** pruebas, incluidas las visitas reales
de plaza, vado y claro en al menos 3/6 jornadas cada uno. El `it.fails` del
claro se convirtió en aserción ordinaria; no se redujo el umbral. La cifra
exacta de visitas por sitio no se remidió separadamente; la prueba confirma la
cota y se conservan arriba las cifras del diagnóstico anterior.
