# La fauna por estaciones — medida y capturas (2 oct 2026, v5.85)

Carril de la tanda del 2 oct (director `session_01EYvYxVxEhUmyBSSTytRT3u`),
rama `claude/fauna-estaciones`. **Sólo vida, derive y render**: el motor no se
toca y ninguna partida cambia (Vera, 2 oct 2026).

## Antes, en `main` (`ea97cc5`)

| Estación | Lo que tenía propio |
|---|---|
| Primavera | Nada. Luciérnagas de noche (también en verano) |
| Verano | El oso (suceso del motor, también en otoño); cuervos con el grano madurando |
| Otoño | El oso |
| Invierno | Los lobos de noche (`derive/animals.ts`) y la visita del lobo al corral (suceso) |
| Todo el año | Ciervos (2), conejos (3), perdiz, jabalí de caza, peces, patos — **y las golondrinas cruzando el cielo también en enero** |

## Después: lo que cuenta cada estación

Aldea de veinte (`foundTwenty`), **ocho semillas** (3, 5, 7, 11, 13, 23, 29,
41), a mitad de cada estación del primer año, una jornada de 240 pasos.
Ciervos y jabalíes, de `village.wildlife`; conejos, de `createRabbits`; crías,
de `village.young`; cigüeñas, mariposas y abejas, de `createSeasonalFauna` a
mediodía con cielo raso. El informe es la prueba
`tests/fast/life-seasonal-fauna.test.ts` (cuatro de estas semillas).

| | Primavera | Verano | Otoño | Invierno |
|---|---|---|---|---|
| Ciervos a la vista | 16 | 16 | 16 | **8** |
| Distancia media del ciervo al centro (celdas) | 19,4 | 19,4 | 19,4 | **15,8** |
| Conejos | 24 | 24 | 24 | **8** |
| Jabalíes hozando | 0 | 0 | **16** (2 en cada valle) | 0 |
| Crías | **59** (13 cervatillos, 42 polluelos, 4 terneros) | 0 | 0 | 0 |
| Cigüeñas | 16 | 16 | 0 | 0 |
| Mariposas + abejas | 48 + 32 | 128 + 64 | 0 | 0 |
| Golondrinas (`birdsAt`) | sí | sí | no | no |
| Grullas en uve (`cranesAt`) | no | no | **15** | no |

Ningún lechón: ninguna de esas aldeas tiene cerdos (la cría sale **sólo si la
aldea tiene esa cabaña**). Con `&means=pigs` en la semilla 23 al año 10 hay
cerdas; ese año la tirada no les dio lechones (la mitad de las cerdas, a
suertes por madre y año).

**En el juego** (`node tools/graphics/seasons.mjs --seed 11 --year 8`, que abre
`?debug=1&live=1&season=…` y guarda la traza `__valleyLife().seasonal`): primavera, 2 crías, 2 cigüeñas, 6 mariposas, 4
abejas, 18 golondrinas; verano, 0 crías, 2 cigüeñas, 16 + 8, 18 golondrinas;
otoño, 2 jabalíes y 15 grullas, sin golondrinas; invierno, un ciervo y nada en
el cielo.

## Lo que costó encuadrarlo (tres capturas del jabalí)

1. Hozando en la celda de al lado del bosque, **la copa y la hierba alta de
   otoño lo tapaban entero**.
2. A dos celdas de la linde, seguían tapándolo las copas que tenía **delante**,
   entre él y la cámara (que mira desde +x, +z).
3. Con «nada de bosque en cuatro celdas hacia la cámara», la hembra y su cría
   se ven las dos (`otono-jabalies.jpg`). Si ningún prado del valle cumple, se
   relaja de uno en uno, y en las ocho semillas salen los dos.

Y el cervatillo metía la cabeza en la grupa de la cierva con la estela de un
radio: va a vez y media. La cría pierde la cuerna, los cuernos, la ubre y los
colmillos (los huesos `head_antler`, `head_ivory`, `body_udder` y
`Curved_Tusk_*` a escala cero).

## Capturas (`fauna-img/`, 390 × 844 a 2×)

| Fichero | Qué enseña |
|---|---|
| `primavera-cervatillo.jpg` | La cierva con su cervatillo, sin cuerna, detrás (semilla 23, año 10) |
| `primavera-polluelos.jpg` | Gallina con polluelos junto a la casa: **se leen mal** (son gallinas diminutas; encargo de malla propia) |
| `primavera-valle.jpg` | El valle en primavera, encuadre de juego |
| `verano-ciguena-mariposas.jpg` | Una cigüeña picando en el prado húmedo junto al río, y mariposas sobre la hierba |
| `verano-mariposas.jpg` | Mariposas y abejas sobre los campos |
| `otono-jabalies.jpg` | La hembra y la cría del año (sin colmillos) hozando fuera de la linde |
| `otono-valle.jpg` | El valle en otoño |
| `invierno-ciervo-en-el-prado.jpg` | El ciervo del invierno, solo, en el prado nevado |
| `invierno-valle.jpg` | El valle en invierno |

## Abierto

- **La grulla no tiene captura.** La uve pasa a catorce celdas de altura cada
  minuto y medio de reloj real (`ambience.ts` corre con el tiempo real de cada
  fotograma, como las golondrinas), y en el dibujo por software ese reloj
  avanza a una décima: tras diez minutos esperando con `seasons.mjs --cranes`
  la bandada seguía entrando por la esquina del mapa. Lo que hay es la prueba
  (quince aves en otoño, ninguna golondrina; nada en invierno) y la traza
  `seasonal.craneLead`. **Hay que mirarla en el aparato.**
- **Los polluelos se leen mal** a escala de móvil: son gallinas diminutas.
- Las mallas propias y el nido de la cigüeña: `docs/encargos-3d.md`, «La fauna
  por estaciones».
- **Rendimiento en el aparato**: cuatro llamadas de dibujo más con todo
  encendido (tres más las grullas en otoño), medidas sólo por recuento.
