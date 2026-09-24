/** Rasterizador CPU con profundidad y supersampling: láminas fieles sin Blender/GPU. */
import { deflateSync } from 'node:zlib';
import { writeFile } from 'node:fs/promises';
import type { Color, Vector3 } from 'three';
export interface Face { v:Vector3[];color:Color;normal:Vector3 }
function crc32(bytes:Uint8Array){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return(crc^0xffffffff)>>>0;}
function chunk(type:string,data:Buffer){const name=Buffer.from(type),head=Buffer.alloc(4),tail=Buffer.alloc(4);head.writeUInt32BE(data.length);tail.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([head,name,data,tail]);}
export async function rasterize(faces:Face[],path:string){const width=1000,height=780,ss=2,w=width*ss,h=height*ss,rgba=new Uint8Array(w*h*4),depth=new Float64Array(w*h).fill(-Infinity);
  const raw=faces.flatMap(f=>f.v.map(v=>({x:v.x-v.z,y:.4*(v.x+v.z)-v.y}))),minX=Math.min(...raw.map(v=>v.x)),maxX=Math.max(...raw.map(v=>v.x)),minY=Math.min(...raw.map(v=>v.y)),maxY=Math.max(...raw.map(v=>v.y));
  const scale=Math.min(760/(maxX-minX),475/(maxY-minY)),left=500-(minX+maxX)*scale/2,top=125-minY*scale;
  const point=(v:Vector3)=>({x:(left+(v.x-v.z)*scale)*ss,y:(top+(.4*(v.x+v.z)-v.y)*scale)*ss,z:v.x+v.z+.8*v.y});
  for(const face of faces){const [a,b,c]=face.v.map(point);const den=(b!.y-c!.y)*(a!.x-c!.x)+(c!.x-b!.x)*(a!.y-c!.y);if(Math.abs(den)<1e-9)continue;
    const light=.62+.27*Math.max(0,face.normal.y)+.08*Math.max(0,face.normal.x)+.03*Math.max(0,face.normal.z),hex=face.color.clone().multiplyScalar(light).getHex(),rgb=[hex>>16,(hex>>8)&255,hex&255];
    const x0=Math.max(0,Math.floor(Math.min(a!.x,b!.x,c!.x))),x1=Math.min(w-1,Math.ceil(Math.max(a!.x,b!.x,c!.x))),y0=Math.max(0,Math.floor(Math.min(a!.y,b!.y,c!.y))),y1=Math.min(h-1,Math.ceil(Math.max(a!.y,b!.y,c!.y)));
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const xx=x+.5,yy=y+.5,u=((b!.y-c!.y)*(xx-c!.x)+(c!.x-b!.x)*(yy-c!.y))/den,v=((c!.y-a!.y)*(xx-c!.x)+(a!.x-c!.x)*(yy-c!.y))/den,t=1-u-v;if(u< -1e-8||v< -1e-8||t< -1e-8)continue;
      const z=u*a!.z+v*b!.z+t*c!.z,at=y*w+x;if(z<depth[at]!-1e-9)continue;depth[at]=z;const p=at*4;rgba[p]=rgb[0]!;rgba[p+1]=rgb[1]!;rgba[p+2]=rgb[2]!;rgba[p+3]=255;}
  }
  const rows=Buffer.alloc(height*(1+width*4));for(let y=0;y<height;y++)for(let x=0;x<width;x++){let red=0,green=0,blue=0,alpha=0;for(let dy=0;dy<ss;dy++)for(let dx=0;dx<ss;dx++){const p=((y*ss+dy)*w+x*ss+dx)*4,a=rgba[p+3]!;alpha+=a;red+=rgba[p]!*a;green+=rgba[p+1]!*a;blue+=rgba[p+2]!*a;}const p=y*(1+width*4)+1+x*4;if(alpha){rows[p]=Math.round(red/alpha);rows[p+1]=Math.round(green/alpha);rows[p+2]=Math.round(blue/alpha);rows[p+3]=Math.round(alpha/(ss*ss));}}
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6;
  await writeFile(path,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]));
}
