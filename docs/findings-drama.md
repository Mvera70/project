# Dos sistemas del motor que no se disparan nunca

**Medido:** 13 sep 2026, sobre `main` con el motor tal cual está.
**Quién lo encontró:** el trabajo gráfico de §11.1.1, buscando de dónde sacar la
burbuja de «enfadado» que el dueño del diseño pidió.
**De quién es esto:** del motor, no del render. Aquí no se toca nada; se mide y
se deja escrito.

---

## 1. Los rencores no se forman jamás

`§6.4` define el rencor: la opinión entre dos personas cae por debajo de −50 y
queda registrado con la semana en que se formó. M-39 construyó encima toda la
maquinaria de las riñas: dos que se detestan tienen un mal día, se gritan, la
aldea se entera, y el catálogo pesa más una plantilla de rencilla.

**Nunca pasa.** Medido en tres partidas de cuarenta años, semillas 7, 11 y 23,
con la política `prudent`:

| | semilla 7 | semilla 11 | semilla 23 |
|---|---|---|---|
| Rencores formados | **0** | **0** | **0** |
| Riñas en la crónica | **0** | **0** | **0** |

La cadena es ésta: las opiniones sólo se mueven con los efectos `opinion` de las
encrucijadas y con las propias riñas. Si las encrucijadas que los reparten no
salen, ninguna opinión llega a −50; si ninguna llega a −50, no hay rencor; sin
rencor no hay riña, y sin riña no hay nada que empuje una opinión hacia abajo.
**Es un ciclo que necesita un empujón inicial que nadie da.**

Y arrastra a lo que depende de ello: `smith_feud` y `granary_theft` exigen
`grudge:min 45` en sus requisitos, así que tampoco salen nunca.

## 2. Media docena de encrucijadas al siglo, y medio catálogo muerto

Lo mismo, medido sobre cinco partidas de cuarenta años:

| Semilla | Decisiones en 40 años | Gente al final |
|---|---|---|
| 7 | 9 | 43 |
| 11 | 12 | 72 |
| 23 | 10 | 52 |
| 41 | 7 | 80 |
| 97 | 10 | 72 |

**Entre siete y doce decisiones en cuarenta años**: una cada cuatro o cinco años.
Y de las veinte plantillas del catálogo, **diez no salieron ni una vez en las
cinco partidas**:

`tithe_demand`, `hungry_spring`, `granary_theft`, `plague_blame`, `smith_feud`,
`feud_inherited`, `relic_pedlar`, `wolf_winter`, `first_stone`, `quiet_years`.

## Por qué esto importa para lo que se está haciendo ahora

La ronda gráfica lleva meses haciendo que el valle se vea vivo: la gente anda
por donde debe, se para a hablar, el sol cruza, nieva en los tejados. Y la queja
del jugador sigue siendo **«no parece que haya nada de reacción, es muy
aburrida»**.

Una parte de eso era de dibujo y está arreglada. La otra parte no lo es: el
juego es *tomar decisiones con consecuencias*, y el jugador toma una decisión
cada cuatro años sobre la mitad de un catálogo. Ninguna cantidad de arte tapa
eso.

## Lo que habría que mirar, sin decidirlo aquí

1. **El ritmo.** `CROSSROADS.MIN_TICKS_BETWEEN` son 120 semanas —dos años y
   medio— y `GUARANTEE_TICKS` 960, veinte años. Si el ritmo pretendido es ése,
   está bien y el problema es otro; si no, es un número.
2. **Los requisitos que nadie cumple.** Diez plantillas no salen: hay que ver
   cuál de sus condiciones es la que nunca se da. Un test que corra N partidas y
   liste las plantillas nunca vistas convertiría esto en una regresión vigilada
   en vez de un hallazgo de una tarde.
3. **El empujón que falta a las opiniones.** Sin una vía por la que dos vecinos
   se caigan mal sin haber pasado antes por una encrucijada, §6.4 y M-39 son
   código que no se ejecuta.

**Dicho para que conste:** nada de esto es una propuesta de cambio de balance.
Es una medida. Cambiar cualquiera de los tres números de arriba mueve el
equilibrio del juego y toca correr la suite de balance entera.
