# -*- coding: utf-8 -*-
"""G-10 - Lote de herramienta y carga.

El aldeano cavaba con las manos vacias. El clip `work_hoe` esta bien hecho -la
espalda se dobla, los brazos bajan- y aun asi no se leia como cavar, porque
cavar sin azada no es cavar: es agacharse. Lo mismo con `carry_walk`, que sin
nada en las manos es andar con los brazos raros.

Las dos piezas se cuelgan de los conectores `hand_l` y `hand_r` que G-04 dejo en
el aldeano, y por eso van con el origen **en el punal**: lo que se agarra es lo
que tiene que caer donde esta la mano, no el centro de la pieza.

Todo en metros; `scale` lo lleva a celdas, igual que el resto del catalogo.
"""
import io, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lot_village import cube, cyl, recipe, mat, D  # noqa: E402

WOOD = mat('wood', 'timber', 0.9)
IRON = mat('iron', 'timberDark', 0.55)
# Arpillera, no lienzo: con el papel claro de la paleta, de lejos parecia que
# la gente volvia del campo con un folio en la mano.
SACK = mat('sack', 'timber', 1.0)

RECIPES = []

RECIPES.append(recipe(
    'hoe', 'hoe', [1, 1], [WOOD, IRON],
    # El mango sale de la mano hacia abajo y hacia delante, que es como se lleva
    # una azada cuando se cava: el origen esta donde agarra el puno.
    #
    # Las tres piezas se colocan sobre el eje del mango **ya girado**, no a ojo:
    # un cilindro girado 145 grados tiene sus extremos donde dice el seno y el
    # coseno, y el primer intento puso la hoja a medio metro del palo.
    #
    #   el mango apunta a d = (0, -0,6, -0,8): delante y abajo
    #   eje del cilindro = (0, -sin t, cos t)  ->  t = 143 grados
    #   centro = puno + 0,75 * d = (0, -0,45, -0,6)
    #   punta  = puno + 1,50 * d = (0, -0,90, -1,20)
    #
    [cyl('Hoe_Shaft', 0.0, -0.45, -0.6, 0.035, 1.5, 'wood', 6, (143, 0, 0)),
     cube('Hoe_Blade', 0.0, -0.97, -1.27, 0.22, 0.07, 0.2, 'iron'),
     cube('Hoe_Collar', 0.0, -0.82, -1.09, 0.07, 0.1, 0.12, 'iron')],
    'G-10, lote de herramienta. Azada: metro y medio de mango y una hoja de '
    'hierro. Se cuelga de la mano derecha mientras dure el clip de cavar. Sin '
    'ella, cavar se lee como agacharse.',
    # La casa de teja, que su madera oscura es casi negra: una hoja de hierro
    # del color de un mango no es una hoja de hierro.
    ortho=1.3, target_z=-0.6, house='tiled'))

RECIPES.append(recipe(
    'bundle', 'bundle', [1, 1], [SACK, WOOD],
    # Un fardo atado, colgando de la mano. Ancho y corto: lo que se lleva a
    # casa desde el campo, no una maleta.
    [cube('Bundle_Body', 0.0, 0.0, -0.34, 0.44, 0.3, 0.46, 'sack'),
     cube('Bundle_Tie', 0.0, 0.0, -0.34, 0.47, 0.33, 0.07, 'wood'),
     cube('Bundle_Neck', 0.0, 0.0, -0.09, 0.1, 0.1, 0.14, 'sack')],
    'G-10, lote de carga. Fardo atado que cuelga de la mano mientras alguien '
    'vuelve del campo. Ancho y corto: es lo que se lleva a casa, no una maleta.',
    ortho=1.2, target_z=-0.3))

# Estas dos piezas **no se escalan a celdas**, y son las unicas del catalogo que
# no lo hacen.
#
# Cuelgan de un hueso del aldeano, y el esqueleto del aldeano esta en metros: la
# escala a celdas se la aplica su raiz, por encima de los huesos. Una azada ya
# convertida a celdas colgada ahi se escala dos veces y queda de diecisiete
# centimetros, que es invisible y parece que no se ha puesto nada.
for item in RECIPES:
    item['scale'] = 1.0

catalog = json.load(io.open('art/catalog.json', encoding='utf-8'), object_pairs_hook=D)
have = {asset['id'] for asset in catalog['assets']}
for item in RECIPES:
    asset_id = item['id']
    os.makedirs('art/recipes/%s' % asset_id, exist_ok=True)
    io.open('art/recipes/%s/%s.json' % (asset_id, asset_id), 'w', encoding='utf-8', newline='\n').write(
        json.dumps(item, indent=2, ensure_ascii=False) + u'\n')
    if asset_id in have:
        continue
    catalog['assets'].append(D([
        ('id', asset_id), ('artifactRound', 'G-10'), ('status', 'study'),
        ('recipe', 'art/recipes/%s/%s.json' % (asset_id, asset_id)),
        ('generator', 'tools/art/blender-build.py'), ('blenderVersion', '5.2.1 LTS'),
        ('approved', None), ('bounds', None), ('recipeSha256', None),
        ('materials', []), ('clips', []), ('motion', []), ('connectors', []),
        ('statistics', None), ('hashes', None),
        ('provenance', D([('kind', 'original'),
                          ('source', 'Original %s authored for The Valley G-10' % asset_id),
                          ('license', 'Project original')])),
    ]))
io.open('art/catalog.json', 'w', encoding='utf-8', newline='\n').write(
    json.dumps(catalog, indent=2, ensure_ascii=False) + u'\n')
print(' '.join(item['id'] for item in RECIPES))
