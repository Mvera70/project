#!/usr/bin/env python3
"""AN-4b · Tiras de un actor siguiendo su posición en la traza del observatorio.

  python3 trace-strip.py <toma> --find
      Lista, fotograma a fotograma, lo que interesa: clips de combate y de
      caza de la gente (con id), la caza (`hunt`: fase, especie, acción de la
      presa, clip del cazador), los animales salvajes con acción (`wild`) y
      los asaltantes por fase.
  python3 trace-strip.py <toma> --id N [--animal] [--from A] [--to B]
      [--every K] [--size S] [--scale X] [--cols C] --out tira.png
      Tira de contactos con el recorte centrado en el actor N en cada
      fotograma (persona por defecto; `--animal` para un animal pintado),
      rotulada con el fotograma y el clip o la acción.

Sólo lee `trace.json` y `frames/`; no inventa nada: un fotograma sin el actor,
o con el actor fuera de cuadro, se salta y se dice. Las coordenadas se escalan
al tamaño real del PNG (la resolución adaptativa puede bajarlo).
"""
import argparse
import json
import os
from collections import Counter

from PIL import Image, ImageDraw

COMBAT = {'bow_draw', 'bow_loose', 'gate_strike', 'spear_thrust', 'hit_take', 'fall', 'flee'}


def load(take):
    with open(os.path.join(take, 'trace.json'), encoding='utf-8') as handle:
        return json.load(handle)


def find(trace):
    frames = trace['frames']
    print(f"fotogramas {len(frames)} · fps {trace.get('fps')} · errores {trace.get('errors')}")
    clips = Counter()
    first = {}
    for i, frame in enumerate(frames):
        life = frame['life']
        for person in life.get('renderedPeople', []):
            clip = person.get('clip')
            if clip in COMBAT:
                clips[clip] += 1
                first.setdefault(clip, []).append((i, person['id']))
        hunt = life.get('hunt')
        wild = [(a['kind'], a.get('action')) for a in life.get('wild', []) if a.get('action') not in (None, 'walk')]
        raiders = Counter(r['phase'] for r in life.get('raiders', []))
        physics = life.get('physics') or {}
        line = []
        if hunt:
            prey = hunt.get('prey') or {}
            hunter = hunt.get('hunter') or {}
            line.append(f"caza {hunt.get('stage')} {hunt.get('species')} presa={prey.get('action')} cazador={hunter.get('clip')}")
        if wild:
            line.append(f"salvajes {wild}")
        bears = [a for a in life.get('wild', []) if a['kind'] == 'bear']
        if bears:
            line.append(f"oso {[(round(b['x'], 1), round(b['z'], 1), b.get('action')) for b in bears]}")
        if raiders:
            line.append(f"asaltantes {dict(raiders)}")
        if physics:
            line.append(f"ragdolls {physics.get('ragdolls')}")
        if line and (i % 5 == 0 or hunt or bears):
            print(f"{i:04d} " + ' · '.join(line))
    print('clips de combate (muestras):', dict(clips))
    for clip, where in first.items():
        ids = Counter(pid for _, pid in where).most_common(4)
        print(f"  {clip}: primer fotograma {where[0][0]}, último {where[-1][0]}, ids {ids}")


def strip(trace, take, args):
    frames = trace['frames']
    last = len(frames) - 1 if args.to is None else min(args.to, len(frames) - 1)
    tiles = []
    skipped = []
    for i in range(args.start, last + 1, args.every):
        life = frames[i]['life']
        at = None
        label = ''
        if args.animal:
            for animal in life.get('renderedAnimals', []):
                if animal['id'] == args.id:
                    at = animal['screen']
                    break
            action = next((a.get('action') for a in life.get('wild', []) if a['id'] == args.id), None)
            hunt = life.get('hunt') or {}
            if hunt.get('targetId') == args.id:
                action = (hunt.get('prey') or {}).get('action')
            label = str(action)
        else:
            person = next((p for p in life.get('people', []) if p['id'] == args.id), None)
            if person is None:
                person = next((r for r in life.get('raiders', []) if r['id'] == args.id), None)
            if person is not None:
                at = person['screen']
            clip = next((p.get('clip') for p in life.get('renderedPeople', []) if p['id'] == args.id), None)
            label = str(clip)
        view = life.get('viewport') or {'width': 1, 'height': 1}
        if at is None or not (0 <= at['x'] <= view['width'] and 0 <= at['y'] <= view['height']):
            skipped.append(i)
            continue
        image = Image.open(os.path.join(take, frames[i]['file'])).convert('RGB')
        # La traza da la pantalla en píxeles CSS del viewport; la captura puede
        # salir más pequeña si la resolución adaptativa la bajó (SwiftShader).
        k = image.width / view['width']
        half = args.size // 2
        cx, cy = int(at['x'] * k), int(at['y'] * k - args.size * 0.15)
        tile = image.crop((cx - half, cy - half, cx + half, cy + half))
        tile = tile.resize((args.size * args.scale, args.size * args.scale), Image.NEAREST)
        draw = ImageDraw.Draw(tile)
        draw.rectangle((0, 0, tile.width, 12), fill=(0, 0, 0))
        draw.text((3, 1), f"{i:04d} {label}", fill=(255, 255, 255))
        tiles.append(tile)
    if not tiles:
        raise SystemExit(f"el actor {args.id} no aparece en ningún fotograma del rango")
    cols = min(args.cols, len(tiles))
    rows = (len(tiles) + cols - 1) // cols
    side = args.size * args.scale
    sheet = Image.new('RGB', (side * cols, side * rows), (20, 20, 20))
    for k, tile in enumerate(tiles):
        sheet.paste(tile, ((k % cols) * side, (k // cols) * side))
    sheet.save(args.out)
    print(f"{args.out}: {len(tiles)} casillas; sin el actor: {skipped[:20]}{' …' if len(skipped) > 20 else ''}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('take')
    parser.add_argument('--find', action='store_true')
    parser.add_argument('--id', type=int)
    parser.add_argument('--animal', action='store_true')
    parser.add_argument('--from', dest='start', type=int, default=0)
    parser.add_argument('--to', type=int)
    parser.add_argument('--every', type=int, default=1)
    parser.add_argument('--size', type=int, default=90)
    parser.add_argument('--scale', type=int, default=2)
    parser.add_argument('--cols', type=int, default=8)
    parser.add_argument('--out')
    args = parser.parse_args()
    trace = load(args.take)
    if args.find:
        find(trace)
        return
    if args.id is None or args.out is None:
        raise SystemExit('hace falta --id y --out (o --find)')
    strip(trace, args.take, args)


if __name__ == '__main__':
    main()
