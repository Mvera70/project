# -*- coding: utf-8 -*-
"""G-10 · Lotes de vivienda, sustento, comunidad y mundo.

Todo en metros; `scale` lo lleva a celdas (D.6.2). Una celda son tres metros,
asi que una huella de 2x2 celdas es una casa de seis por seis, que es una casa.
"""
import io, json, collections, os

CELL = 3.0
D = collections.OrderedDict


def cube(name, x, y, z, w, d, h, material):
    return D([('type', 'cube'), ('name', name), ('location', [x, y, z]),
              ('dimensions', [w, d, h]), ('material', material), ('parent', 'Root')])


def gable(name, x, y, z, w, d, h, material, turn=0.0):
    return D([('type', 'gable'), ('name', name), ('location', [x, y, z]),
              ('width', w), ('depth', d), ('height', h),
              ('rotationDegrees', [0, 0, turn]), ('material', material), ('parent', 'Root')])


def cyl(name, x, y, z, radius, depth, material, sides=8, turn=(0, 0, 0)):
    return D([('type', 'cylinder'), ('name', name), ('location', [x, y, z]),
              ('radius', radius), ('depth', depth), ('vertices', sides), ('smooth', True),
              ('rotationDegrees', list(turn)), ('material', material), ('parent', 'Root')])


def cone(name, x, y, z, radius, depth, material, sides=8):
    return D([('type', 'cone'), ('name', name), ('location', [x, y, z]),
              ('radius', radius), ('depth', depth), ('vertices', sides),
              ('rotationDegrees', [0, 0, 0]), ('material', material), ('parent', 'Root')])


def sphere(name, x, y, z, radius, material, seg=7, rings=5):
    return D([('type', 'sphere'), ('name', name), ('location', [x, y, z]),
              ('radius', radius), ('segments', seg), ('rings', rings), ('smooth', True),
              ('material', material), ('parent', 'Root')])


def recipe(asset_id, kind, footprint, materials, primitives, note, ortho=9.0,
           target_z=2.0, house='thatched'):
    return D([
        ('schemaVersion', 1),
        ('id', asset_id),
        ('scale', 1.0 / CELL),
        ('mergeByMaterial', True),
        ('palette', '../palette.json'),
        # D.2.1 decidio que teja y paja conviven en una misma aldea. Cada
        # edificio elige la suya de forma estable y hereda del valle el resto.
        ('house', house),
        ('metadata', D([('cellUnit', 1), ('kind', kind), ('footprint', list(footprint)),
                        ('note', note)])),
        ('materials', materials),
        ('groups', [D([('name', 'Root'), ('location', [0, 0, 0]), ('parent', None)])]),
        ('primitives', primitives),
        ('clips', []),
        ('connectors', []),
        ('referenceRender', D([
            ('width', 390), ('height', 640),
            ('cameraLocation', [ortho, -ortho * 1.25, ortho * 0.8]),
            ('cameraTarget', [0, 0, target_z]),
            ('orthoScale', ortho * 1.4), ('worldRole', 'sky'),
        ])),
    ])


def mat(name, role, rough=0.95):
    return D([('name', name), ('role', role), ('roughness', rough)])


# Los papeles salen de la paleta y no de un color escrito aqui. `roof`,
# `plaster` y `timber` los pone la eleccion de teja o paja de cada edificio.
PLASTER = mat('plaster', 'plaster', 0.95)
STONE = mat('stone', 'stone', 0.95)
THATCH = mat('roof', 'roof', 0.9)
TILE = mat('roof', 'roof', 0.85)
WOOD = mat('wood', 'timber', 0.95)
GRAIN = mat('grain', 'grain', 0.9)
DARK = mat('dark', 'soil', 0.9)

RECIPES = []

# --- mundo ------------------------------------------------------------------
RECIPES.append(recipe(
    'rock', 'rock', [1, 1], [STONE, DARK],
    [sphere('Rock_Big', 0, 0, 0.55, 1.05, 'stone', 6, 4),
     sphere('Rock_Small', 1.05, 0.5, 0.35, 0.62, 'dark', 6, 4)],
    'G-10, lote del mundo. Dos masas de piedra, sin simetria, para que un '
    'afloramiento no parezca una pelota. Se instancia sobre el terreno rocoso.',
    ortho=4.0, target_z=0.6))

# --- vivienda ---------------------------------------------------------------
RECIPES.append(recipe(
    'house', 'house', [2, 2], [PLASTER, THATCH, WOOD, STONE],
    [cube('House_Walls', 3, 3, 1.15, 5.4, 5.4, 2.3, 'plaster'),
     gable('House_Roof', 3, 3, 2.3, 6.0, 6.0, 2.1, 'roof'),
     cube('House_Door', 3, 0.28, 0.85, 1.0, 0.16, 1.7, 'wood'),
     # La chimenea es de piedra y no de yeso, y mas alta que ancha. De yeso y
     # achaparrada, bajo el sol de este valle salia blanca: desde arriba cada
     # casa parecia tener un huevo puesto en el tejado.
     cyl('House_Chimney', 4.4, 4.4, 3.5, 0.22, 2.4, 'stone', 6)],
    'G-10, lote de vivienda. Yeso y paja: la mitad de las casas del valle. La '
    'puerta mira a -Y, que es el frente local, para que el aldeano que sale se '
    'lea saliendo por algun sitio.'))

RECIPES.append(recipe(
    'stone-house', 'stone-house', [2, 2], [STONE, TILE, WOOD],
    [cube('Stone_Walls', 3, 3, 1.3, 5.5, 5.5, 2.6, 'stone'),
     gable('Stone_Roof', 3, 3, 2.6, 6.0, 6.0, 2.0, 'roof'),
     cube('Stone_Door', 3, 0.25, 0.9, 1.05, 0.16, 1.8, 'wood'),
     cyl('Stone_Chimney', 4.5, 4.4, 3.4, 0.3, 1.8, 'stone', 6)],
    'G-10, lote de vivienda. La otra mitad: piedra y teja, mas alta y con la '
    'chimenea mas larga. D.2.1 decidio que los dos materiales conviven.',
    house='tiled'))

# --- sustento ---------------------------------------------------------------
RECIPES.append(recipe(
    'granary', 'granary', [2, 2], [WOOD, THATCH, GRAIN],
    [cyl('Granary_Post_A', 1.4, 1.4, 0.45, 0.22, 0.9, 'wood', 6),
     cyl('Granary_Post_B', 4.6, 1.4, 0.45, 0.22, 0.9, 'wood', 6),
     cyl('Granary_Post_C', 1.4, 4.6, 0.45, 0.22, 0.9, 'wood', 6),
     cyl('Granary_Post_D', 4.6, 4.6, 0.45, 0.22, 0.9, 'wood', 6),
     cube('Granary_Body', 3, 3, 2.05, 5.0, 5.0, 2.3, 'wood'),
     gable('Granary_Roof', 3, 3, 3.2, 5.8, 5.8, 2.0, 'roof'),
     cube('Granary_Sheaf', 3, 0.6, 0.35, 2.2, 0.9, 0.7, 'grain')],
    'G-10, lote de sustento. Levantado sobre postes, que es como se guarda el '
    'grano lejos de la humedad y de los ratones, y una gavilla apoyada fuera '
    'para que se lea que ahi dentro hay grano.'))

RECIPES.append(recipe(
    'mill', 'mill', [2, 2], [STONE, THATCH, WOOD],
    [cyl('Mill_Tower', 3, 3, 2.4, 2.3, 4.8, 'stone', 10),
     cone('Mill_Cap', 3, 3, 5.6, 2.5, 1.8, 'roof', 10),
     cube('Mill_Sail_A', 3, 0.35, 5.2, 5.6, 0.2, 0.55, 'wood'),
     cube('Mill_Sail_B', 3, 0.35, 5.2, 0.55, 0.2, 5.6, 'wood'),
     cube('Mill_Door', 3, 0.75, 0.95, 1.0, 0.2, 1.9, 'wood')],
    'G-10, lote de sustento. Torre de piedra, capucha de paja y aspas en cruz. '
    'Las aspas no giran todavia: girarlas es un clip y va con la ronda que '
    'anime el mundo, no con la que lo modela.',
    ortho=11.0, target_z=3.5))

RECIPES.append(recipe(
    'smithy', 'smithy', [2, 2], [STONE, TILE, DARK],
    [cube('Smithy_Walls', 3, 3, 1.05, 5.4, 5.0, 2.1, 'stone'),
     gable('Smithy_Roof', 3, 3, 2.1, 6.0, 5.6, 1.5, 'roof'),
     cyl('Smithy_Forge', 4.6, 4.5, 2.6, 0.42, 3.2, 'stone', 6),
     cube('Smithy_Mouth', 3, 0.32, 1.0, 2.4, 0.2, 2.0, 'dark')],
    'G-10, lote de sustento. Baja y ancha, con la fragua asomando por detras y '
    'la boca abierta al camino: una herreria trabaja con la puerta abierta.'))

# --- comunidad --------------------------------------------------------------
RECIPES.append(recipe(
    'chapel', 'chapel', [2, 2], [STONE, TILE, WOOD],
    [cube('Chapel_Nave', 3, 3, 1.5, 4.2, 5.6, 3.0, 'stone'),
     gable('Chapel_Roof', 3, 3, 3.0, 4.8, 6.0, 1.8, 'roof'),
     cube('Chapel_Door', 3, 0.15, 1.0, 1.1, 0.2, 2.0, 'wood'),
     cube('Chapel_Cross_V', 3, 3, 5.6, 0.18, 0.18, 1.4, 'wood'),
     cube('Chapel_Cross_H', 3, 3, 5.75, 0.9, 0.18, 0.18, 'wood')],
    'G-10, lote de comunidad. Estrecha y alta, con una cruz en el caballete. La '
    'proporcion es la senal: nada mas del valle es mas alto que ancho.',
    ortho=10.0, target_z=3.0, house='tiled'))

RECIPES.append(recipe(
    'church', 'church', [2, 2], [STONE, TILE, WOOD],
    [cube('Church_Nave', 3, 3.4, 2.0, 4.8, 6.4, 4.0, 'stone'),
     gable('Church_Roof', 3, 3.4, 4.0, 5.4, 6.8, 2.2, 'roof'),
     cube('Church_Tower', 3, 0.9, 3.6, 2.4, 2.4, 7.2, 'stone'),
     cone('Church_Spire', 3, 0.9, 8.4, 1.8, 2.6, 'roof', 4),
     cube('Church_Door', 3, 0.1, 1.2, 1.3, 0.2, 2.4, 'wood'),
     cube('Church_Cross_V', 3, 0.9, 10.4, 0.2, 0.2, 1.5, 'wood'),
     cube('Church_Cross_H', 3, 0.9, 10.6, 1.0, 0.2, 0.2, 'wood')],
    'G-10, lote de comunidad. La torre es lo que se ve desde el otro lado del '
    'valle, y por eso el campanario sube por delante de la nave en vez de '
    'quedarse dentro de la huella comun.',
    ortho=14.0, target_z=5.0, house='tiled'))

RECIPES.append(recipe(
    'well', 'well', [1, 1], [STONE, WOOD, THATCH],
    [cyl('Well_Ring', 1.5, 1.5, 0.4, 0.85, 0.8, 'stone', 10),
     cyl('Well_Post_A', 0.85, 1.5, 1.4, 0.12, 2.0, 'wood', 6),
     cyl('Well_Post_B', 2.15, 1.5, 1.4, 0.12, 2.0, 'wood', 6),
     gable('Well_Roof', 1.5, 1.5, 2.4, 2.0, 1.5, 0.7, 'roof', 90.0)],
    'G-10, lote de comunidad. Una celda entera, brocal de piedra y tejadillo. '
    'Es lo mas pequeno del catalogo y aun asi tiene que leerse: un cilindro '
    'suelto en el prado no dice pozo.',
    ortho=4.5, target_z=1.2))

RECIPES.append(recipe(
    'shed', 'shed', [1, 1], [WOOD, THATCH],
    [cube('Shed_Walls', 1.5, 1.5, 0.85, 2.4, 2.4, 1.7, 'wood'),
     gable('Shed_Roof', 1.5, 1.5, 1.7, 2.8, 2.8, 1.0, 'roof')],
    'G-10, lote de vivienda. Un cobertizo de una celda, para lo que no es casa '
    'ni taller. Sin uso todavia en el motor; el catalogo lo tiene listo para '
    'cuando lo haya.',
    ortho=4.0, target_z=1.0))

# --- escribir ---------------------------------------------------------------
catalog = json.load(io.open('art/catalog.json', encoding='utf-8'), object_pairs_hook=D)
have = {asset['id'] for asset in catalog['assets']}

for item in RECIPES:
    asset_id = item['id']
    folder = 'art/recipes/%s' % asset_id
    os.makedirs(folder, exist_ok=True)
    io.open('%s/%s.json' % (folder, asset_id), 'w', encoding='utf-8', newline='\n').write(
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
