"""Rasteriza las tres vistas CPU del codo 9 para revisión, con CairoSVG local."""
import sys
sys.dont_write_bytecode = True
import cairosvg
from generate import OUT

for view in ['plan', 'section', 'oblique']:
    source = OUT / f'turn-9-{view}.svg'
    destination = OUT / f'turn-9-{view}.png'
    data = cairosvg.svg2png(url=str(source))
    if destination.exists():
        assert destination.read_bytes() == data, f'No se sobrescribe evidencia diferente: {destination}'
    else:
        with destination.open('xb') as out:
            out.write(data)
