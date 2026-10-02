import { readFile, writeFile } from 'node:fs/promises';
const here = new URL('./', import.meta.url);
const read = async p => JSON.parse(await readFile(new URL(p, here), 'utf8'));
const cube=(name,location,dimensions,material)=>({type:'cube',name,location,dimensions,material,parent:'Root'});
const gable=(name,location,width,depth,height,rotation=0,material='roof')=>({type:'gable',name,location,width,depth,height,rotationDegrees:[0,0,rotation],material,parent:'Root'});
const pyramid=(name,x,y,width,base,height)=>({type:'cone',name,location:[x,y,base+height/2],radius:width/Math.sqrt(2),depth:height,vertices:4,rotationDegrees:[0,0,45],material:'roof',parent:'Root',smooth:false});
const timber=await read('../house/house.json'), rock=await read('../stone-house/stone-house.json');
const recipes=[];
function base(id,stone=false){
 const r=structuredClone(stone?rock:timber);r.id=id;
 r.primitives=r.primitives.filter(p=>!/(Roof|Eaves|Ridge|ThatchCourse|TileCourse|Chimney)/.test(p.name));
 recipes.push(r);return r;
}
function chimney(r,x,y,base,top){const p=r.id.startsWith('stone')?'Stone':'House';r.primitives.push(cube(p+'_Chimney',[x,y,(base+top)/2],[.5,.5,top-base],'stone'),cube(p+'_ChimneyCap',[x,y,top],[.68,.68,.16],'stone'),cube(p+'_ChimneyOpening',[x,y,top+.085],[.36,.36,.01],'window'));}
function roofBands(r,cx,cy,w,d,z,h,rotate=0){
 for(const side of [-1,1])for(const f of [.3,.65]){
  const loc=rotate?[cx,cy+side*w/2*f,z+h*(1-f)+.025]:[cx+side*w/2*f,cy,z+h*(1-f)+.025];
  r.primitives.push(cube('RoofCourse_'+r.primitives.length,loc,rotate?[d,.085,.065]:[.085,d,.065],'roof'));
 }
}
// Dos hastiales muy estrechos y altos, con una diferencia de altura visible.
const twin=base('house-twin-gable');
twin.primitives=twin.primitives.filter(p=>p.name!=='House_Walls');
twin.primitives.push(cube('House_LeftBody',[1.72,3,1.62],[2.6,5.16,3.24],'plaster'),cube('House_RightBody',[4.3,3,1.3],[2.56,5.16,2.6],'plaster'),gable('House_LeftRoof',[1.55,3,3.24],3.1,6,2.08),gable('House_RightRoof',[4.55,3,2.6],2.9,6,1.68));
for(const y of [.38,5.62]){twin.primitives.push(cube('House_UpperBeam_'+y,[1.72,y,3.12],[2.75,.17,.18],'wood'),cube('House_UpperPost_'+y,[1.56,y,2.82],[.16,.17,.9],'wood'));}
roofBands(twin,1.55,3,3.1,6,3.24,2.08);roofBands(twin,4.55,3,2.9,6,2.6,1.68);chimney(twin,3.2,4.8,2.6,4.15);
// Gran pirámide sobre cuerpo bajo: el contorno se reconoce por sus cuatro faldones.
const hip=base('house-hip-roof');
hip.primitives.push(pyramid('House_HipRoof',3,3,6,2.45,2.9));
for(const f of [.28,.58,.8]){const w=6*(1-f),z=2.45+2.9*f+.025;for(const s of [-1,1])hip.primitives.push(cube('HipX_'+f+'_'+s,[3,3+s*w/2,z],[w,.09,.07],'roof'),cube('HipY_'+f+'_'+s,[3+s*w/2,3,z],[.09,w,.07],'roof'));}
chimney(hip,4.8,4.7,2.6,3.75);
// Casa pétrea baja con cumbrera transversal y porche frontal de ancho completo.
const low=base('stone-house',true);
low.primitives.push(gable('Stone_RearRoof',[3,3.28,2.6],5.44,6,.9,90),cube('Stone_Ridge',[3,3.28,3.52],[6,.18,.16],'roof'));
roofBands(low,3,3.28,5.44,6,2.6,.9,90);
// El porche ocupa solamente el retranqueo existente delante de las ventanas.
low.primitives.push(gable('Stone_PorchRoof',[3,.41,2.42],.82,5.9,.22,90));
for(const x of [.18,5.82])low.primitives.push(cube('Stone_PorchPost_'+x,[x,.16,1.18],[.18,.18,2.36],'wood'));
chimney(low,4.8,4.6,2.6,4.2);
// Gran cruz: dos hastiales perpendiculares de alturas comparables, sin torre.
const cross=base('stone-house-cross-gable',true);
cross.primitives.push(gable('Stone_TransverseRoof',[3,3.55,2.6],4.9,6,1.9,90),cube('Stone_FrontUpper',[3,1.7,3.05],[2.3,2.62,.9],'stone'),gable('Stone_FrontRoof',[3,2.1,3.5],2.95,4.2,2.15),cube('Stone_FrontRidge',[3,2.1,5.65],[.18,4.2,.14],'roof'));
roofBands(cross,3,2.1,2.95,4.2,3.5,2.15);chimney(cross,.9,4.7,2.6,4.2);
// Altillo doméstico alto: una torre ancha sobre el ala derecha y faldón bajo a la izquierda.
const tower=base('stone-house-tower-loft',true);
tower.primitives.push(gable('Stone_LowRoof',[3,3,2.6],6,6,.75,90),cube('Stone_LoftWalls',[4.45,3.95,4.28],[2.65,3.3,3.44],'stone'),cube('Stone_LoftBelt',[4.45,3.95,4.35],[2.8,3.45,.2],'wood'),gable('Stone_LoftRoof',[4.45,3.95,6],3.1,4.1,1.38),cube('Stone_LoftRidge',[4.45,3.95,7.39],[.17,4.1,.14],'roof'));
// Entramado cerrado del altillo: ningún hueco nocturno adicional.
for(const x of [3.2,4.45,5.7])tower.primitives.push(cube('Stone_LoftPost_'+x,[x,2.27,5.15],[.15,.13,1.65],'wood'));
roofBands(tower,4.45,3.95,3.1,4.1,6,1.38);chimney(tower,1.2,4.7,2.6,3.65);
for(const r of recipes){
 const stone=r.id.startsWith('stone'),door=r.primitives.find(p=>p.name===(stone?'Stone_Door':'House_Door'));
 r.metadata.note='V2, 2 oct 2026: silueta reconstruida para lectura móvil; tres ventanas, puerta y origen conservados literalmente.';
 r.candidateBuild={adapter:'build-candidates.py',triangleLimit:stone?1200:900,doorPivot:[door.location[0]-door.dimensions[0]/2,door.location[1],0],removeBuriedFaces:true,masonry:stone?[{primitive:'Stone_Walls',rows:3,columns:3,relief:.035,joint:.035},...(r===tower?[{primitive:'Stone_LoftWalls',rows:3,columns:2,relief:.025,joint:.035}]:[])]:[]};
 for(const p of r.primitives)p.name=p.name.replaceAll('.','_').replaceAll('-','n');
 await writeFile(new URL(r.id+'.json',here),JSON.stringify(r,null,2)+'\n');
}
