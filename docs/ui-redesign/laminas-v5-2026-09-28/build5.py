import json, math, re
A = json.load(open('assets5.json'))
src = open('lamina.src.html', encoding='utf-8').read()
v4 = open('v4/refinement.css', encoding='utf-8').read()
v4 = v4.split('/* Página de revisión')[0]            # sólo la maqueta, no la galería
v4 = re.sub(r'html,body \{[^}]*\}', '', v4)          # la lámina sigue siendo 390×844 fija
v4 = re.sub(r'\.screen \{[^}]*\}', '', v4)
v4 = re.sub(r'\.compass \{ background-size:[^}]*\}', '', v4)   # la brújula real de la v3, no un recorte de lámina
v5 = open('v5.css', encoding='utf-8').read()
W, H, M = 90, 11, 9
pts = ' '.join(f"{i/24*W:.2f},{H*(1-math.sin(i/24*math.pi))+M:.2f}" for i in range(25))
beads = ''.join(f'<circle class="arc-bead" r="2" cx="{i/4*W:.2f}" cy="{H*(1-math.sin(i/4*math.pi))+M:.2f}"/>' for i in range(5))
rays = ''.join(f'<line x1="{math.cos(a)*6.4:.2f}" y1="{math.sin(a)*6.4:.2f}" x2="{math.cos(a)*8.4:.2f}" y2="{math.sin(a)*8.4:.2f}"/>' for a in [k/12*2*math.pi for k in range(12)])
base = src.replace('</style>', v4 + '\n' + v5 + '\n</style>')
for k in ['cinzel','garamond','wood','woodband','parchment','compass','base','frame','chip','plaque','close']:
    base = base.replace(f'@@{k}@@', A[k])
base = base.replace('@@ARC@@', pts).replace('@@BEADS@@', beads).replace('@@RAYS@@', rays).replace('@@SPRITE@@', A['sprite'])
ico = lambda i: f'<svg class="skin-icon" viewBox="0 0 24 24"><use href="#{i}"/></svg>'
def card(title, what, cost, ill, chip=None):
    chips = f'<img class="chip-real" src="{A[chip]}" alt="">' if chip else '<div class="chip">' + ''.join(f'<span>{ico(i)}{n}</span>' for i, n in cost) + '</div>'
    return f'''<article class="card"><div class="card-ribbon">{title}</div><img class="card-ill" src="{A['ill_'+ill]}" alt="">
<p>{what}</p><div class="card-foot">{chips}<div class="plaque">GIVE</div></div></article>'''
cart = f'''<section class="sheet"><div class="sheet-head">CLOSE <div class="close-ring"></div></div><div class="cards">
{card('A PLOUGH', 'One field worked by half the hands. The rest go where the valley needs them.', [('logs',40),('silver',20)], 'plough', 'chip_plough')}
{card('A STY AND TWO PIGS', 'Room in the pen for more, and two to start. Meat for the winter, and wolves know a full pen.', [('wheat',30),('silver',14)], 'pig', 'chip_pig')}
{card('A BARREL OF ALE', 'A feast this week. Weddings follow a barrel, and so do quarrels.', [('wheat',25),('silver',10)], 'mug', 'chip_mug')}
{card('A GOOD AXE', 'More timber from every woodcutter. The forest will notice.', [('wheat',20),('silver',18)], 'axe')}
</div></section>'''
def note(title, what, facts, count, why=None):
    foot = f'<span class="why">{why}</span><div class="send" style="opacity:.55">SEND</div>' if why else f'<div class="step"><button>−</button><em>{count}</em><button>+</button></div><div class="send">SEND</div>'
    return f'<article class="note v5"><h4>{title}</h4><p>{what}</p><div class="facts">{facts}</div><div class="foot">{foot}</div></article>'
board = f'''<div class="veil"></div><section class="board plank v5"><div class="board-title">NOTICES</div><button class="board-close">×</button><div class="notes">
{note('Mushrooms in the wood','Baskets and a morning. The wood is kind after rain.','One week · Free · Safe',2,'2 people already away.')}
{note('The high seam','Ore in the rocks above the gorge, for rope and picks.',f'3 weeks · <span class="chip"><span>{ico("silver")}8</span></span> · <span class="risk">Dangerous</span>',3)}
{note('Market in the next valley','Goods down the road, silver back. If the road is kind.',f'4 weeks · <span class="chip"><span>{ico("silver")}15</span></span> · A little risk',2,'Not enough silver.')}
</div><div class="away"><span>Away from the valley</span><strong>Ada and Tom</strong><span>Back in 4 days</span></div></section>'''
for k, body in {'carro': cart}.items():
    open(f'lamina5-{k}.html', 'w', encoding='utf-8').write(base.replace('@@BODY@@', body))
print('ok')
