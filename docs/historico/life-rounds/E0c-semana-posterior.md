# E0c · La semana posterior al saqueo

20 sep 2026.

## Entrega

`life/aftermath.ts` deriva una huella efímera de la llegada que ya resolvió el
motor. Sólo existe si el valle sigue vivo, `just_sacked` aún vale,
`threat.arrivedTick` es el tick anterior y la crónica de ese tick contiene
`raid.open`, `raid.walled` o `raid.assault`.

- Deja dos o tres `grain`/`bundle` fijos junto a un granero o molino en pie; si
  no existe, usa una casa.
- `raid.beast` en aquel tick añade exactamente dos `bundle` fijos junto a una
  casa o campo real. Si no caben los dos, no inventa un corral.
- Cada punto exige suelo para un círculo y ruta desde su puerta, y queda fuera
  de parcelas y del margen de cualquier edificio; se prioriza el claro delante
  de un almacén/casa. Ante falta de suelo la escena se reduce. Los ids son
  negativos y separados de los trastos corrientes y de las huellas D6.
- Los restos no se incluyen en `propPlaces`, no se pueden coger, no bloquean y
  no escriben `GameState`. `bundle` y `grain` ya los dibuja el renderer tumbados
  con el recurso existente.

La entrada de depuración `?aftermath=1&beast=1` construye la foto exacta que
queda al siguiente tick: llegada anterior, marca vigente y crónica de saqueo;
no simula una segunda mecánica. `observe-life.mjs` expone lo mismo con
`--aftermath [--beast]`.

## Pruebas

`tests/fast/aftermath.test.ts` prueba activación estricta, crónica, estado final,
suelo real, reducción sin suelo, los dos travesaños condicionados a `raid.beast`,
reconstrucción estable e inercia/serialización. Junto a las regresiones D6,
animales y llegada: 22 pruebas verdes.

También pasan `npm run typecheck`, `npm run lint` y `git diff --check`.

## Observación en navegador

Se reconstruyó el bundle y se rodó vida real a 30 Hz, dos segundos por toma:

| Valle | Control | Pos-saqueo | Resultado |
|---|---|---|---|
| 7, año 20 | `artifacts/graphics/E0c/seed-7-control/` | `seed-7-aftermath/` con `--beast` | 0 errores; el control no tiene trastos y el valle posterior deja 2 cargas. Este valle no tenía ancla honesta de ganado/casa disponible, por lo que no finge travesaños. |
| 23, año 20 | `artifacts/graphics/E0c/seed-23-control-detail-v3/` | `seed-23-aftermath-beast-detail-v3/` | 0 errores; pareja con idéntico constructor de depuración y encuadre. Las 3 cargas quedan sobre suelo abierto, fuera de los cultivos; hay 2 travesaños junto a un ancla real. |

Las trazas no registran cambios de inventario, bloqueos, penetraciones ni errores
de página. La pareja final está en `seed-23-control-detail-v3/before.png` y
`seed-23-aftermath-beast-detail-v3/before.png`; la traza enumera los cinco
`Prop` fijos, con sus coordenadas y pantalla.

## Límites

No se tocó el motor, balance, esquema, catálogo, economía, combate, Rapier ni
activos. La huella no persiste al tick siguiente y no representa fuego, sangre
ni un corral destruido sin una pérdida de animal confirmada.
