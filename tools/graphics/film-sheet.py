# -*- coding: utf-8 -*-
u"""Monta la pelicula de `film.mjs` en algo que se pueda leer de un tiron.

Dos salidas, y hacen falta las dos:

  tira.png     todos los fotogramas en **una** imagen, numerados. Es lo que
               sustituye a mirar cien capturas: en una rejilla se ve si alguien
               se queda clavado, si algo parpadea, si un cuerpo salta de sitio.
  informe.md   lo que la **traza** delata, con numeros y con el numero de
               fotograma al que hay que mirar. Los pixeles dicen que algo se ve
               mal; la traza dice quien y por que.

El reloj de la pelicula es `steps`: la capa de vida da treinta pasos por
segundo, asi que el tiempo entre dos fotogramas se sabe exacto aunque la
captura tarde lo que tarde. Todos los ritmos de aqui se miden en pasos.

  python tools/graphics/film-sheet.py artifacts/graphics/film/toma
"""
import json
import math
import os
import sys

from PIL import Image, ImageDraw

STEPS_PER_SECOND = 30.0
# Un cuerpo mide 0,32 celdas de radio: medio paso de estos y ya se solapan dos.
# Un salto de mas de una celda entre dos fotogramas contiguos no es andar.
TELEPORT_CELLS = 1.0
# «Quieto» no es velocidad cero: es no haber llegado a ningun sitio. Se mide
# sobre el recorrido total de la pelicula, en celdas.
STILL_CELLS = 0.25
# Un giro de mas de medio angulo llano mientras casi no se avanza es la vuelta
# sobre si mismo de `rework.md` §3.
SPIN_RADIANS = math.pi / 2
SLOW_PACE_SHARE = 0.25


def load(folder):
    with open(os.path.join(folder, 'trace.json'), 'r', encoding='utf-8') as handle:
        return json.load(handle)


def turn_of(a, b):
    """La diferencia de dos rumbos, siempre entre -pi y pi."""
    turn = b - a
    while turn > math.pi:
        turn -= math.pi * 2
    while turn < -math.pi:
        turn += math.pi * 2
    return turn


def strip(folder, frames, columns=10, width=140):
    u"""La tira de contactos: todos los fotogramas en una imagen, numerados."""
    shots = []
    for frame in frames:
        path = os.path.join(folder, 'frames', frame['name'])
        if os.path.exists(path):
            shots.append((frame, Image.open(path).convert('RGB')))
    if not shots:
        return None
    sample = shots[0][1]
    scale = width / sample.width
    cell_w = width
    cell_h = int(sample.height * scale)
    label = 14
    rows = (len(shots) + columns - 1) // columns
    sheet = Image.new('RGB', (columns * cell_w, rows * (cell_h + label)), (24, 21, 17))
    draw = ImageDraw.Draw(sheet)
    for index, (frame, shot) in enumerate(shots):
        row, column = divmod(index, columns)
        x = column * cell_w
        y = row * (cell_h + label)
        sheet.paste(shot.resize((cell_w, cell_h), Image.LANCZOS), (x, y + label))
        life = frame.get('life')
        steps = '' if life is None else u' · %d' % life['steps']
        draw.text((x + 3, y + 2), u'%d%s' % (frame['n'], steps), fill=(201, 171, 107))
    out = os.path.join(folder, 'tira.png')
    sheet.save(out)
    return out, sheet.size, len(shots)


def frame_diffs(folder, frames):
    u"""Cuanto cambia cada fotograma respecto al anterior, en gris medio.

    Sirve para dos cosas que la traza no ve: un valle **congelado** (el render
    se ha parado y la diferencia es cero) y un **parpadeo** (una diferencia
    enorme entre dos fotogramas contiguos que vuelve al valor de antes).
    """
    diffs = []
    previous = None
    for frame in frames:
        path = os.path.join(folder, 'frames', frame['name'])
        if not os.path.exists(path):
            continue
        small = Image.open(path).convert('L').resize((96, 208), Image.LANCZOS)
        if previous is not None:
            a = previous.tobytes()
            b = small.tobytes()
            total = sum(abs(a[i] - b[i]) for i in range(len(a)))
            diffs.append((frame['n'], total / len(a)))
        previous = small
    return diffs


def analyse(trace):
    u"""Lo que la traza delata, persona por persona."""
    frames = [f for f in trace['frames'] if f.get('life') is not None]
    if len(frames) < 2:
        return None
    first, last = frames[0]['life'], frames[-1]['life']
    span = max(1, last['steps'] - first['steps'])

    # Cada persona, fotograma a fotograma.
    tracks = {}
    for frame in frames:
        life = frame['life']
        for person in life['people']:
            tracks.setdefault(person['id'], []).append((frame['n'], life['steps'], person))

    people = []
    for pid, track in sorted(tracks.items()):
        path = 0.0
        jump = 0.0
        jump_at = None
        spins = 0
        spin_at = []
        for (na, _sa, a), (nb, _sb, b) in zip(track, track[1:]):
            step = math.hypot(b['x'] - a['x'], b['z'] - a['z'])
            path += step
            if step > jump:
                jump, jump_at = step, nb
            speed = math.hypot(b['vx'], b['vz'])
            if abs(turn_of(a['facing'], b['facing'])) > SPIN_RADIANS and speed < b['pace'] * SLOW_PACE_SHARE:
                spins += 1
                spin_at.append(nb)
        last_person = track[-1][2]
        doing = last_person['doing']
        # Una intencion que no cambia y nunca llega: el atasco que importa.
        places = {p['doing']['place'] + '/' + p['doing']['offer'] if p['doing'] else None
                  for _n, _s, p in track}
        never_arrived = all(p['doing'] is not None and not p['doing']['there'] for _n, _s, p in track)
        worst_need = max(last_person['needs'].items(), key=lambda kv: kv[1])
        people.append({
            'id': pid,
            'recorrido': round(path, 2),
            'salto': round(jump, 2),
            'salto_en': jump_at,
            'giros': spins,
            'giros_en': spin_at[:6],
            'sitios': len([p for p in places if p is not None]),
            'yendo_sin_llegar': never_arrived and len(track) > 4,
            'haciendo': None if doing is None else '%s/%s%s' % (
                doing['place'], doing['offer'], '' if doing['there'] else u' (aun yendo)'),
            'ruta': None if doing is None else doing['route'],
            'necesidad': '%s %.2f' % worst_need,
            'clip': next((a['clip'] for a in last['actors'] if a['id'] == pid), None),
            'escena': last_person['scene'],
        })
    return {
        'span': span,
        'segundos': round(span / STEPS_PER_SECOND, 1),
        'gente': len(people),
        'people': people,
        'interacciones': last['interactions'],
        'dia': last['day'],
    }


def report(folder, trace, data, diffs, strip_info):
    meta = trace['meta']
    lines = []
    lines.append(u'# Pelicula del valle · %s' % os.path.basename(folder))
    lines.append('')
    lines.append(u'Rodada con `tools/graphics/film.mjs`; esto lo monta '
                 u'`tools/graphics/film-sheet.py`. **El reloj es `steps`**: la capa de '
                 u'vida da treinta pasos por segundo.')
    lines.append('')
    lines.append(u'| | |')
    lines.append(u'|---|---|')
    lines.append(u'| valle | %s, ano %s |' % (meta.get('seed') or 'al azar', meta.get('year') or '1'))
    lines.append(u'| camara | zoom %s, giro %s, alzado %s%s |' % (
        meta['zoom'], meta['turn'], meta['tilt'],
        u', recorte ' + meta['clip'] if meta.get('clip') else ''))
    lines.append(u'| fotogramas | %d pedidos, %d tomados en %.1f s de pared |' % (
        meta['wantedFrames'], meta['gotFrames'], meta['realSeconds']))
    if data is not None:
        lines.append(u'| aldea rodada | %d pasos = **%.1f s de vida**, %d personas |' % (
            data['span'], data['segundos'], data['gente']))
        lines.append(u'| interacciones | %s |' % ', '.join(
            '%s %s' % (k, v) for k, v in sorted(data['interacciones'].items())))
    if meta.get('hud'):
        lines.append(u'| reloj del juego | %s %s |' % (
            meta['hud'].get('date') or '', meta['hud'].get('time') or ''))
    lines.append(u'| errores de pagina | %s |' % (
        u'ninguno' if not meta.get('errores') else ' · '.join(meta['errores'])))
    lines.append('')
    if strip_info is not None:
        lines.append(u'**La tira:** `tira.png` (%dx%d, %d fotogramas). El numero de cada '
                     u'casilla es el fotograma, y detras sus pasos de vida.'
                     % (strip_info[1][0], strip_info[1][1], strip_info[2]))
        lines.append('')

    if data is None:
        lines.append(u'**Sin traza**: el enganche `window.__valleyLife` no contesto. '
                     u'Sin el, esto es una tira de fotos y nada mas.')
    else:
        still = [p for p in data['people'] if p['recorrido'] < STILL_CELLS]
        jumpy = [p for p in data['people'] if p['salto'] > TELEPORT_CELLS]
        spinny = sorted([p for p in data['people'] if p['giros'] > 0],
                        key=lambda p: -p['giros'])
        stuck = [p for p in data['people'] if p['yendo_sin_llegar']]
        lines.append(u'## Lo que la traza delata')
        lines.append('')
        lines.append(u'| que | cuantos | quienes |')
        lines.append(u'|---|---|---|')
        lines.append(u'| **no se movieron** (menos de %.2f celdas en toda la pelicula) | %d de %d | %s |'
                     % (STILL_CELLS, len(still), data['gente'],
                        ', '.join(str(p['id']) for p in still[:12]) or u'—'))
        lines.append(u'| **saltaron de sitio** (mas de %.1f celdas entre dos fotogramas) | %d | %s |'
                     % (TELEPORT_CELLS, len(jumpy),
                        ', '.join('%d (f%s, %.2f celdas)' % (p['id'], p['salto_en'], p['salto'])
                                  for p in jumpy[:8]) or u'—'))
        lines.append(u'| **giraron sobre si mismos** (mas de pi/2 casi parados) | %d | %s |'
                     % (len(spinny),
                        ', '.join('%d x%d (f%s)' % (p['id'], p['giros'],
                                                    ','.join(str(n) for n in p['giros_en'][:3]))
                                  for p in spinny[:8]) or u'—'))
        lines.append(u'| **fueron a algo y nunca llegaron** | %d | %s |'
                     % (len(stuck),
                        ', '.join('%d -> %s (ruta %s)' % (p['id'], p['haciendo'], p['ruta'])
                                  for p in stuck[:8]) or u'—'))
        lines.append('')
        lines.append(u'## Cada persona')
        lines.append('')
        lines.append(u'| id | recorrido | salto | giros | sitios | al final | clip | necesidad |')
        lines.append(u'|---:|---:|---:|---:|---:|---|---|---|')
        for p in sorted(data['people'], key=lambda p: p['recorrido']):
            lines.append(u'| %d | %.2f | %.2f | %d | %d | %s | %s | %s |' % (
                p['id'], p['recorrido'], p['salto'], p['giros'], p['sitios'],
                p['haciendo'] or u'nada', p['clip'] or u'—', p['necesidad']))
        lines.append('')

    if diffs:
        values = [d for _n, d in diffs]
        frozen = [n for n, d in diffs if d < 0.2]
        mean = sum(values) / len(values)
        peaks = [n for n, d in diffs if d > mean * 4]
        lines.append(u'## Lo que cambia en pantalla')
        lines.append('')
        lines.append(u'Diferencia media entre fotogramas contiguos: **%.2f** de 255 '
                     u'(gris, 96x208).' % mean)
        lines.append('')
        lines.append(u'- **Fotogramas congelados** (diferencia < 0,2): %s' % (
            ', '.join(str(n) for n in frozen[:20]) if frozen else u'ninguno'))
        lines.append(u'- **Saltos de imagen** (mas de cuatro veces la media): %s' % (
            ', '.join(str(n) for n in peaks[:20]) if peaks else u'ninguno'))
        lines.append('')
        lines.append(u'Un valle congelado con gente que la traza dice que se mueve es un fallo '
                     u'del render; al contrario, es un fallo de la capa de vida.')
    out = os.path.join(folder, 'informe.md')
    with open(out, 'w', encoding='utf-8') as handle:
        handle.write('\n'.join(lines) + '\n')
    return out


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    folder = sys.argv[1]
    # A 140 px por casilla la tira entera cabe en una imagen pero la gente son
    # dos pixeles: para mirar conducta hay que rodar con `film.mjs --zoom N` o
    # `--clip x,y,w,h` y ensanchar las casillas aqui.
    #   --width 320 --columns 5
    args = sys.argv[2:]
    def opt(name, fallback):
        return int(args[args.index('--' + name) + 1]) if '--' + name in args else fallback
    columns = opt('columns', 10)
    width = opt('width', 140)
    trace = load(folder)
    frames = trace['frames']
    strip_info = strip(folder, frames, columns=columns, width=width)
    diffs = frame_diffs(folder, frames)
    data = analyse(trace)
    out = report(folder, trace, data, diffs, strip_info)
    print(u'tira:    %s' % (strip_info[0] if strip_info else u'sin fotogramas'))
    print(u'informe: %s' % out)
    if data is not None:
        print(u'%d personas, %.1f s de vida rodada' % (data['gente'], data['segundos']))
    return 0


if __name__ == '__main__':
    sys.exit(main())
