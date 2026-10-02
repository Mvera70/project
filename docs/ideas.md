# El buzón de ideas de Vera

Lo que el dueño del diseño dice de pasada y no es de la ronda en curso. Existe
porque el 2 oct 2026 seis ideas de una mañana estaban sólo en mensajes entre
sesiones, y el director le dijo «apuntado» cuando sólo estaban encargadas.

**La regla:** cuando Vera suelta una idea que no es de la ronda —«estaría guay
que…», «que no se olvide…»—, la sesión que la oye la copia aquí **el mismo
día**, con sus palabras, la fecha y la sesión. No se ordena ni se decide nada:
se guarda. El director, al cerrar cada tanda, la reparte a donde toca
(`plan-meta.md` si es mecánica, `encargos-3d.md` si es algo que se ve) y la
marca **repartida → dónde**. Lo que no encaja en ningún sitio se queda aquí, a
la vista. «Apuntado» quiere decir escrito en este fichero o en el plan, en
`main`; un encargo a otra sesión no es apuntar.

## Sin repartir

### 2 oct 2026 · Las partes del cuerpo: cabeza, torso, brazos y piernas
> «¿De momento no hay partes débiles, como cabeza, torso?» — «Sí, apunta.»

Hoy, en el asalto, una flecha o un golpe cuenta igual dé donde dé: el cuerpo es
una sola pieza. Sólo la caza distingue lo vital del cuarto trasero
(`VITAL_BACK`, `hunt-encounter.ts`). La propuesta: la **cabeza** multiplica el
daño, el **torso** es el daño normal y los **brazos y piernas** quitan menos; y
**cada pieza protege su zona** —el casco la cabeza (y es donde más rebota), el
peto, la malla y las placas el torso, las grebas las piernas— en vez de un
porcentaje para todo el cuerpo. Necesita que el impacto de la flecha salga del
contacto físico, que hoy sólo se mide en sombra (F-0, «la flecha que toca»,
`docs/diagnostico-fisica-combate-2026-09-29.md`). Va **después** de la ronda del
daño, como ronda propia, y se apoya en su tabla arma × pieza.

La tabla de v5.81 ya está preparada: cada pieza dice qué zona cubre (`COVERS`
en `render3d/life/wounds.ts`) y `strike` recibe la zona del golpe; hoy todo es
torso.

### 2 oct 2026 · La ropa abriga
> «La ropa no es que sea el ánimo, sino también la ropa te calienta en
> invierno, ese tipo de cosas. Por eso sí sube el ánimo, claro, a la ropa.»

**Encargado** a K5 (lino y sastrería): que la ropa pese más en invierno, o
apuntarlo como siguiente paso.

### 2 oct 2026 · Los encargos, en el edificio de su oficio
> «Las cosas se deberían encargar desde la sastrería igual que la herrería,
> igual que todas las profesiones que tengan este tipo de encargos, no la plaza
> del pueblo; ahí habrá cosas excepcionales.»

**Encargado** a K5 para `design.md`/`plan-meta.md`.

### 2 oct 2026 · Los recursos son bases, y el nivelado va después
> «Los recursos y todo eso para un futuro se podrán usar para muchas más cosas.
> Vamos a establecer las bases, pero no te preocupes por todo en el futuro.
> Habrá que ir nivelando.» «Todo lo que sea nivelar no pasa nada. Estamos
> creando sistemas. Después se nivelará todo junto.»

Es un principio, no una tarea. El lino servirá también para las vendas de la
enfermería («no está nada mal»).

## Repartidas

### 2 oct 2026 · La fauna, por estaciones
> «¿Ahora mismo los animales salen por temporada? … Esta es un poco la idea.»

Eligió las cuatro: crías en primavera (cervatillos, polluelos, lechones,
terneros), aves de paso (cigüeñas o golondrinas en primavera y verano,
bandadas que se van en otoño), invierno escaso (menos caza, huellas en la
nieve, el ciervo baja al prado), y mariposas, abejas y jabalíes al bosque en
verano y otoño. Sólo vida, sin tocar el motor.
**Repartida → hecha en v5.85** (PR #54, sólo vida, derive y render): crías
detrás de las madres, golondrinas sólo en primavera y verano y una uve de
grullas en otoño, cigüeñas, mariposas y abejas, el invierno con un ciervo que
baja al prado y un conejo, y dos jabalíes hozando en otoño. Medida y capturas en
`docs/medidas/fauna-estaciones-2026-10-02.md`; lo que falta por verse, en
`docs/encargos-3d.md` («La fauna por estaciones»).

### 2 oct 2026 · Establos y cercados fuera de la muralla
> «En invierno el ganado debe guardarse en establos, el que no tenemos; en los
> pueblos medievales, cuando se cerraba la muralla, fuera quedan cosas así como
> campos de cultivo y zonas para el ganado donde pastar y luego pasar la noche.
> Con cercas de valla de madera quedaría bien. Además luego aporta a las
> invasiones porque tendrán que ir a la aldea y algunos no lo conseguirán…
> hay mucho que desarrollar aquí.»

Toca el motor (edificio nuevo, el asedio) y el pasto de la falda del valle
natural (PR #48). **Repartida → K12 en `plan-meta.md`**, como punto propuesto,
con lo que ya existe (el modo `secure` de `beasts.ts`, el pasto de la falda, el
cerco) y cinco preguntas de diseño abiertas para Vera. Sin implementar.

### 2 oct 2026 · El daño por arma y la armadura que para unas cosas y otras no
> «Cuero no debe proteger mucho. No sé si es posible en función del arma
> establecer un daño, en plan el arco hace menos daño que una espada. A lo
> mejor el cuero sí que puede parar una flecha, pero no puede parar una
> espada. … a lo mejor la flecha hace un 15 % de daño y la espada hace un 50 %
> o un 60 %.»

**Cómo se lee, corregido por Vera el mismo día:** «No quita un 15 %, lo
entendiste mal: el cuero protege un 15 %, la flecha quita 85.» La tabla arma ×
pieza dice **cuánto protege la pieza** contra cada arma. A cuerpo descubierto
una flecha sigue tumbando de un tiro; con peto de cuero se aguanta una y se cae
con la segunda. Leído al revés («la flecha quita un 15 %»), la muralla dejaba de
aguantar: 20 de 20 cercos tomados en la medida del 2 oct.

**Repartida → hecha en v5.81** (`render3d/life/wounds.ts`): vida en porcentaje,
daño por arma a cuerpo descubierto y la tabla de lo que protege cada pieza.
Medida en `docs/medidas/dano-por-arma-2026-10-02.md`.

### 2 oct 2026 · El rebote, con el metal
> «También como los juegos de balas que hay ricochet. … cuando ya en un futuro
> encima con el metal, los cascos de metal, la malla de metal, después la
> pechera de metal, la armadura entera de metal … que pueda haber probabilidad
> de que la flecha o lo que sea rebote.»

**Repartida → v5.81**: la probabilidad de rebote por pieza y arma ya está en la
tabla de `wounds.ts`, con las piezas de metal escritas; su llegada, en
`docs/plan-meta.md` (AR).

### 2 oct 2026 · Las cuatro edades de la armadura
> «La edad del metal después de la de piedra.» «Eso, apuntad, que no se olvide.»

Decidido con ella, en la sesión de los petos y con el director:

| Edad | En el juego | Pieza (en la herrería) | Llega con |
|---|---|---|---|
| del Cuero | Age of Leather | cuero y acolchado (el peto de hoy) | la herrería |
| del Hierro | Age of Iron | cota de malla y casco de hierro | la primera mina |
| del Acero | Age of Steel | placas sobre la malla (pechera, grebas o brigantina) | la villa cerrada con muralla de piedra |
| de los Caballeros | Age of Knights | arnés completo | después de la villa: el castillo y el rey |

Las cuatro piezas hay que hacerlas, «replicando la Edad Media sin ser súper
fiel»; los nombres se pueden afinar. **Pregunta abierta para Vera:** design.md
(v4.66) dice «leader hasta la Edad del Hierro»; si el rey pasa a la de los
Caballeros, hay que retocarlo.

**Repartida → `docs/plan-meta.md`, punto AR** (v5.81), y una fila por pieza en
`docs/encargos-3d.md`.

### 2 oct 2026 · La minería, y la mina que se ve
> El metal sale de las dos fuentes, pero sobre todo de la minería, que tiene
> que ser «bonita de ver y de manejar como la tala de árboles»; el buhonero,
> secundario.
>
> «Estaría muy guay que la mina tuviese una entrada que se viese como la cueva
> del oso, más grande, y que entrasen y se viesen entrar y desaparecer y salir,
> carruajes con el mineral. Que lleguen llenos, se descarguen y salgan vacíos
> para adentro.»

Lo que habrá que modelar: la boca (a partir de la cueva del oso, más grande),
la vagoneta llena y vacía, el montón de mineral, y los gestos de picar,
empujar y descargar.

**Repartida → `docs/plan-meta.md`, AR-2** (punto propio, con su cita), y en
`docs/encargos-3d.md` una fila por pieza: la boca, entrar y salir como el oso,
la vagoneta, el montón y los tres gestos (v5.81).

