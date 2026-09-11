# -*- coding: utf-8 -*-
"""G-10 - El aldeano gana una frente.

La deuda mas vieja del programa grafico: el aldeano era simetrico delante y
detras, asi que de espaldas y de cara se veia igual. De lejos eso quita la
mitad de la informacion de una figura -hacia donde mira es hacia donde va- y de
cerca se lee como un muneco.

Se arregla con dos cosas y no con una cara:

  * **Un mandil**, del color de las perneras, en la pechera. Es lo que se ve a
    la escala del valle, donde un ojo son cero pixeles: una mancha clara
    delante y nada detras, y ya se sabe de que lado esta mirando alguien.
  * **Dos ojos**, que solo cuentan de cerca, pero de cerca cuentan mucho.

Esto **retoca la receta de G-04 en su sitio** en vez de reescribirla: la receta
del aldeano se escribio a mano en aquella ronda y su guion no sobrevivio. El
resto del catalogo se genera desde `tools/art/lots/`.
"""
import io, json, collections

D = collections.OrderedDict
PATH = 'art/recipes/villager/villager.json'

recipe = json.load(io.open(PATH, encoding='utf-8'), object_pairs_hook=D)

# Un cuarto material, y cuesta una llamada de dibujo por aldeano porque el
# aldeano se une por material (v3.28). Se paga a proposito: unos ojos del color
# de la piel no son ojos, y del color de la ropa tampoco.
# El papel es `trunk`, el marron oscuro del valle, y no uno de los de casa: el
# aldeano no elige teja ni paja, asi que esos papeles no existen para el.
DARK = D([('name', 'dark'), ('role', 'trunk'), ('roughness', 0.9)])
recipe['materials'] = [m for m in recipe['materials'] if m['name'] != 'dark'] + [DARK]


def cube(name, x, y, z, w, d, h, material):
    return D([('type', 'cube'), ('name', name), ('location', [x, y, z]),
              ('dimensions', [w, d, h]), ('material', material), ('parent', 'Villager_Root')])


def sphere(name, x, y, z, radius, material, seg=6, rings=4):
    return D([('type', 'sphere'), ('name', name), ('location', [x, y, z]),
              ('radius', radius), ('segments', seg), ('rings', rings), ('smooth', True),
              ('material', material), ('parent', 'Villager_Root')])


# El frente es -Y: los pies salen hacia ahi (su centro esta en y = -0,06) y la
# puerta de la casa mira al mismo lado.
ADDED = [
    # El mandil, pegado a la pechera y un pelo mas ancho que ella, para que se
    # recorte contra la tunica desde arriba.
    cube('Villager_Apron', 0.0, -0.16, 1.02, 0.42, 0.05, 0.46, 'cloth-accent'),
    sphere('Villager_Eye_L', -0.1, -0.24, 1.76, 0.045, 'dark'),
    sphere('Villager_Eye_R', 0.1, -0.24, 1.76, 0.045, 'dark'),
]
BIND = {'Villager_Apron': 'spine', 'Villager_Eye_L': 'head', 'Villager_Eye_R': 'head'}

have = {primitive['name'] for primitive in recipe['primitives']}
for primitive in ADDED:
    if primitive['name'] not in have:
        recipe['primitives'].append(primitive)
recipe['rig']['bind'].update(BIND)

io.open(PATH, 'w', encoding='utf-8', newline='\n').write(
    json.dumps(recipe, indent=2, ensure_ascii=False) + u'\n')
print('villager: %d piezas, %d materiales' % (len(recipe['primitives']), len(recipe['materials'])))
