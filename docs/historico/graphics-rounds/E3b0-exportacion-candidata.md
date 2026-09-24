# E3b.0 · Exportación de la junta abierta, todavía candidata

**22 sep 2026.** Con permiso específico de Vera se ejecutó `game-dev doctor`
con `BLENDER_PATH` limitado a esa ejecución y después el
[build aislado](../../../art/recipes/e3b-bastion-joint-candidate/build.ts).
Doctor 1.0.2 devolvió `healthy: true` y encontró Blender 5.2; la exportación
corrió en Blender 5.2.1 LTS y dejó tres `.blend`, `.glb` y vistas Eevee en
`artifacts/graphics/E3b-bastion-joint-candidate/blender-review-01/`. No
modificó el Blender abierto, el catálogo ni `public/assets/`.

| Candidato | Bytes GLB | Triángulos | Mallas/materiales | SHA-256 GLB |
|---|---:|---:|---:|---|
| Bastión con salida este | 88.972 | 1.236 | 2/2 | `543dd56f580893f56a5cbd62237c36e0ee1f1d8bb20e9538373d36d7a422536e` |
| Primer tramo de entrada | 11.428 | 144 | 1/1 | `4792c63b4e279b63089d61f3702dabf2e93162381ea94cc0db272255d6b49678` |
| Tramo recto | 11.416 | 144 | 1/1 | `ab541602681c656a6839bc680548ab7df7956db3213d03c26ad32c8d46083601` |

`game-dev asset inspect` leyó los tres GLB: sin mallas ni triángulos no
dibujados, con normales y cajas acordes a las recetas. Su aviso de ausencia
de texturas de color corresponde al material plano del proyecto. El
[recibo de GLTFLoader](../../../artifacts/graphics/E3b-bastion-joint-candidate/blender-review-01/three-validation.json)
confirma carga real en Node, nombres, materiales y límites:
bastión X=[0,1]/Y=[0,1,36]/Z=[0,2]; módulos
X=[0,1]/Y=[0,36;1,20]/Z=[0,33;1,27]. `typecheck`, ESLint focal y
`git diff --check` pasan.

La [vista Blender del bastión](../../../artifacts/graphics/E3b-bastion-joint-candidate/blender-review-01/e3b-bastion-joint-candidate-blender.png)
muestra la pieza aislada. No demuestra la unión compuesta, la navegación,
colisiones, flechas ni sombras del juego. El corredor de 0,70 está probado en
la geometría fuente; E3b.1 aún requiere integración selectiva y prueba real.
**No se ha publicado ni hecho commit/push.**
