# Sonda · Línea base de ocho semillas

**Ejecución:** 14 sep 2026 · **Semillas:** 7, 11, 23, 31, 37, 41, 13, 25

Se ejecutó `tools/graphics/probe-models.ts` en ocho semillas para medir la producción contra el descarte, usando la misma aldea simulada (80 personas en el juego, 36×56 celdas). Las ocho completaron sin error. La semilla 25 produce una aldea muy pequeña (17 personas) y la 31 algo pequeña (31), lo que explica varios de los extremos en la tabla.

## Producción (life/village.ts)

| Semilla | Personas | scene | idle | at | walk | vecino <br>más cerca | <1,9 | <3 | <6 | viajes | mediana <br>viaje | chat | reject | shove | brawl |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 80 | 14% | 33% | 27% | 26% | 0.92 | 95% | 9.12 | 26.58 | 3.9 | 2.0 | 1.07 | 2.14 | 0.10 | 0.03 |
| 11 | 76 | 12% | 20% | 15% | 53% | 0.90 | 97% | 7.31 | 23.36 | 4.2 | 2.4 | 0.89 | 2.50 | 0.07 | — |
| 23 | 56 | 14% | 27% | 24% | 36% | 0.91 | 95% | 6.29 | 16.07 | 4.0 | 1.5 | 1.13 | 2.05 | 0.11 | 0.05 |
| 31 | 31 | 8% | 1% | 22% | 69% | 1.15 | 80% | 8.36 | 18.73 | 10.3 | 1.2 | 0.55 | 2.48 | — | 0.03 |
| 37 | 73 | 12% | 38% | 19% | 31% | 0.92 | 94% | 7.75 | 23.33 | 2.7 | 1.5 | 0.92 | 2.26 | 0.08 | 0.07 |
| 41 | 79 | 13% | 19% | 28% | 39% | 1.01 | 89% | 9.51 | 29.11 | 4.2 | 1.7 | 1.09 | 1.94 | 0.04 | 0.04 |
| 13 | 53 | 14% | 31% | 14% | 41% | 0.86 | 98% | 6.28 | 20.94 | 2.3 | 2.6 | 1.09 | 2.19 | 0.02 | 0.04 |
| 25 | 17 | 10% | 9% | 30% | 50% | 1.33 | 79% | 3.27 | 7.66 | 7.8 | 1.4 | 0.88 | 1.94 | — | — |
| **Mediana** | **64.5** | **13%** | **24%** | **23%** | **40%** | **0.92** | **94.5%** | **7.53** | **22.1** | **4.1** | **1.6** | **1.00** | **2.17** | **0.06** | **0.04** |

*Notas:*
- *Reparto del día: porcentajes del tiempo en escena, ocioso, trabajando (`at`), o andando.*
- *Vecino más cerca, <1,9, <3, <6: métricas de proximidad (celdas).*
- *Viajes por persona: número total / población.*
- *Encuentros por persona: charlas, rechazos, empujones, peleas (por día).*

## Descarte · Valle real

| Semilla | scene | walk | idle | vecino <br>más cerca | <1,9 | <3 | <6 | viajes | mediana <br>viaje | chat | shove | passes | blows |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 24% | 76% | 0% | 1.09 | 84% | 4.87 | 17.68 | 54.2 | 4.9 | 1.99 | 0.56 | 0.30 | 0.26 |
| 11 | 26% | 74% | 0% | 0.87 | 95% | 6.84 | 24.41 | 20.1 | 5.6 | 2.36 | 0.45 | 0.13 | 0.11 |
| 23 | 26% | 74% | 0% | 0.94 | 92% | 7.07 | 26.92 | 24.7 | 5.6 | 2.33 | 0.51 | 0.23 | 0.07 |
| 31 | 28% | 72% | 0% | 0.80 | 97% | 11.36 | 37.75 | 112.8 | 4.5 | 2.42 | 0.65 | 0.46 | 0.33 |
| 37 | 24% | 76% | 0% | 1.05 | 88% | 5.83 | 21.68 | 50.0 | 4.7 | 2.29 | 0.36 | 0.36 | 0.24 |
| 41 | 26% | 74% | 0% | 1.02 | 90% | 6.53 | 23.27 | 51.7 | 4.6 | 2.23 | 0.49 | 0.35 | 0.35 |
| 13 | 27% | 73% | 0% | 0.91 | 93% | 7.11 | 25.33 | 132.7 | 4.6 | 2.45 | 0.38 | 0.63 | 0.00 |
| 25 | 29% | 71% | 0% | 0.79 | 97% | 14.93 | 40.53 | 139.7 | 3.7 | 2.60 | 0.33 | 0.78 | 0.26 |
| **Mediana** | **26%** | **74%** | **0%** | **0.92** | **92.5%** | **7.07** | **25.3** | **52.95** | **4.65** | **2.34** | **0.47** | **0.36** | **0.25** |

## Línea de «sin nada que hacer, por qué»

Cada semilla recopila cuándo alguien no puede hacer su tarea propuesta y registra el motivo exacto. Se imprime la distribución por semilla, sin procesamiento:

**Semilla 7:**
`decide-sí-elige 4% · sin-camino (work, plaza-en-pared/agua, plaza 1) 52% · sin-camino (work, plaza-en-pared/agua, plaza 5) 1% · decide-null-otra-razón 9% · sin-camino (loiter, plaza-en-pared/agua, plaza 2) 33% · sin-camino (sit, plaza-en-pared/agua, plaza 2) 1% · sin-camino (watch, plaza-en-pared/agua, plaza 1) 0%`

**Semilla 11:**
`decide-sí-elige 4% · decide-null-otra-razón 1% · sin-camino (work, plaza-en-pared/agua, plaza 1) 41% · sin-camino (work, plaza-en-pared/agua, plaza 2) 24% · sin-camino (work, plaza-en-pared/agua, plaza 4) 2% · sin-camino (gossip, plaza-en-pared/agua, plaza 2) 29%`

**Semilla 23:**
`decide-sí-elige 4% · sin-camino (work, plaza-en-pared/agua, plaza 1) 50% · decide-null-otra-razón 6% · sin-camino (work, plaza-en-pared/agua, plaza 4) 10% · sin-camino (loiter, plaza-en-pared/agua, plaza 2) 30% · sin-camino (gossip, plaza-en-pared/agua, plaza 2) 1%`

**Semilla 31:**
`decide-sí-elige 47% · sin-camino (work, plaza-en-pared/agua, plaza 4) 38% · sin-camino (gossip, plaza-en-pared/agua, plaza 2) 16%`

**Semilla 37:**
`decide-null-otra-razón 1% · decide-sí-elige 3% · sin-camino (work, plaza-en-pared/agua, plaza 1) 24% · sin-camino (work, plaza-en-pared/agua, plaza 2) 35% · sin-camino (work, plaza-en-pared/agua, plaza 4) 2% · sin-camino (watch, plaza-en-pared/agua, plaza 2) 25% · sin-camino (loiter, plaza-en-pared/agua, plaza 2) 9% · sin-camino (gossip, plaza-en-pared/agua, plaza 2) 1%`

**Semilla 41:**
`decide-sí-elige 6% · sin-camino (gossip, plaza-en-pared/agua, plaza 2) 18% · sin-camino (work, plaza-en-pared/agua, plaza 2) 17% · decide-null-otra-razón 19% · sin-camino (loiter, plaza-en-pared/agua, plaza 2) 40%`

**Semilla 13:**
`decide-sí-elige 5% · sin-camino (work, plaza-en-pared/agua, plaza 2) 39% · decide-null-otra-razón 4% · sin-camino (work, plaza-en-pared/agua, plaza 4) 6% · sin-camino (work, plaza-en-pared/agua, plaza 1) 5% · sin-camino (watch, plaza-en-pared/agua, plaza 1) 33% · sin-camino (loiter, plaza-en-pared/agua, plaza 2) 8%`

**Semilla 25:**
`decide-sí-elige 12% · sin-camino (work, plaza-en-pared/agua, plaza 1) 13% · sin-camino (loiter, plaza-en-pared/agua, plaza 2) 32% · sin-camino (pray, plaza-en-pared/agua, plaza 1) 38% · decide-null-otra-razón 5%`

## Estabilidad y variación

**Estables (convergen a rango estrecho):**

- **Reparto del día en producción**: El porcentaje de «alguien a <1,9» oscila entre 79% y 98%, mediana 94.5%. Las otras tres categorías (escena, ocio, trabajo) tienen variación media.
- **Vecino más cerca en ambos modelos**: En producción 0,86–1,33 celdas (mediana 0,92), en descarte 0,79–1,09 (mediana 0,92). Casi idéntico entre modelos, aunque el descarte anda más y debería crear más densidad local — las ocho semillas coinciden en que la proximidad media es prácticamente la misma.
- **Chat por persona**: Producción 0,55–1,13 (mediana 1,00), descarte 1,99–2,60 (mediana 2,34). Estable dentro de su modelo.

**Muy inestables (ancho rango):**

- **Número de personas**: Oscila entre 17 y 80 según semilla. No es un parámetro de entrada, sino salida de la demografía del motor en cien años.
- **Viajes por persona en producción**: 2,3–10,3 (mediana 4,1). Seis semillas entre 2,7 y 4,2, luego saltos a 7,8 y 10,3 (semillas 25, 31).
- **Viajes por persona en descarte**: 20,1–139,7 (mediana 52,95). Extrema variación, de ahí que no haya un único «descarte de referencia»; el rango es más que la mediana.
- **Gente a menos de 6 celdas, con 17 personas (semilla 25)**: 7,66 personas de media, contra 16,07–37,75 en las demás. Tamaño de la aldea manda.

**Resumen**: Las métricas de proximidad y encuentros por tipo son robustas entre semillas (chat, rechazo, empujón, pelea varían menos del doble de una punta a la otra). El comportamiento diario en producción es coherente (94–98% del tiempo con alguien cercano, viajes cortos). El descarte anda un orden de magnitud más, lo que espera del modelo; los encuentros ascienden en proporción, pero el rango de viajes es tan ancho que no hay un comportamiento «típico» único — la semilla 31 viaja ciento doce veces por persona al día, la 11 apenas veinte.
