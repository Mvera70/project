"""Variantes nuevas con alma estrecha y clave de vértice; CPU únicamente."""
from pathlib import Path
import hashlib
import json
import runpy

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OUT = ROOT/'artifacts/graphics/E3b2-candidates/round-3'
base = runpy.run_path(str(HERE/'study.py'))
helpers = runpy.run_path(str(HERE.parent/'e3b-walkway-turn-candidate/review.py'))
strip, disk_path = (base[k] for k in ('strip','disk_path'))
recipe, source_boxes, svg = (helpers[k] for k in ('recipe','source_boxes','svg'))


def save(identifier, primitives, note):
    path = HERE/(identifier+'.json')
    source = recipe(identifier,'wall-walkway-diagonal-supported-candidate',[2,2],primitives,note)
    path.write_text(json.dumps(source,indent=2)+'\n',encoding='utf-8')
    boxes=source_boxes(path)
    target=OUT/identifier
    target.mkdir(parents=True,exist_ok=True)
    for view in ('plan','section','oblique'):
        (target/(view+'.svg')).write_text(svg(identifier,boxes,view,note),encoding='utf-8')
    return {'path':path.relative_to(ROOT).as_posix(),
            'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
            'cubes':len(primitives),'materials':1,
            'estimatedTriangles':12*len(primitives)}


def main():
    support_path=OUT/'support-grid.json'
    se=[strip('Deck',(.5,.5),(1,1),.94,.93,1.02),
        strip('OuterParapet',(.5,.5),(1,1),.10,1.02,1.20,-.42),
        strip('WallWeb',(.5,.5),(1,1),.20,.755,.93),
        strip('VertexKeystone',(.95,.95),(1.05,1.05),.20,.755,.93)]
    nw=[strip('Deck',(.5,.5),(0,0),.94,.93,1.02),
        strip('OuterParapet',(.5,.5),(0,0),.10,1.02,1.20,-.42),
        strip('WallWeb',(.5,.5),(0,0),.20,.755,.93)]
    se_info=save('e3b-walkway-diagonal-supported-se-candidate',se,
        'SE half: 0.20 web on real clipped wall; keystone bridges the shared vertex. Candidate only.')
    nw_info=save('e3b-walkway-diagonal-supported-nw-candidate',nw,
        'NW matching half: 0.20 web; explicit orientation without negative scale. Candidate only.')
    if not support_path.exists():
        print(json.dumps({'status':'sources_ready',
                          'next':'npx tsx art/recipes/e3b-walkway-diagonal-candidate/check-supported-web.ts'}))
        return
    support=json.loads(support_path.read_text(encoding='utf-8'))
    assert support['candidateWebWidth']==.20
    assert support['keystone']['anchoredAtBothEndsOnSampledGrid']
    assert support['seamGrid']['unsupportedSpan']==[1,1]
    assert {v['sha256'] for v in support['variants']}=={se_info['sha256'],nw_info['sha256']}, \
        'Support-grid hashes are stale: rerun check-supported-web.ts, then make-supported.py.'
    shifted=[]
    for p in nw:
        q=json.loads(json.dumps(p))
        q['location'][0]+=1
        q['location'][1]-=1
        shifted.append(q)
    sweep=disk_path([se[0],shifted[0]],[(.75,.75),(1,1),(1.25,1.25)])
    assert sweep['passed']
    report={
      'status':'conditional_cpu_geometry',
      'sources':{'se':se_info,'nw':nw_info},
      'floorY':1.02,'deckUndersideY':.93,'deckWidth':.94,
      'floorJoin':{'vertex':[1,1],'step':0,'gap':0,'diskSweep':sweep},
      'wallContact':{'gridSource':support_path.relative_to(ROOT).as_posix(),
                     'webWidth':.20,'webBottomY':.755,
                     'sampledSupported':support['supported'],
                     'sampledTotal':support['samples'],
                     'seamUnsupported':support['seamGrid']['misses']},
      'keystone':{'along':[.95,1.05],'width':.20,'bottomY':.755,'topY':.93,
                  'sampledAnchorageAtBothEnds':True,
                  'seamUnsupportedSpan':support['seamGrid']['unsupportedSpan'],
                  'upperBoundAtGridResolution':support['keystone']['unsupportedSpanLengthUpperBoundAtGridResolution']},
      'limits':['The raycast samples, not all continuous points, contact with the current wall GLB.',
                'The keystone bridges a sampled seam; load capacity and weld to neighbouring cubes are untested.',
                'Bends, tree overlap, exported GLB, colliders and in-game walking remain unverified.']}
    (OUT/'supported-variants.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':report['status'],'wallContact':f"{support['supported']}/{support['samples']}",
                      'diskSweep':sweep['passed'],'keystoneAnchored':True}))


if __name__=='__main__':
    main()
