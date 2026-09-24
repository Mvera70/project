// E4 · El fuego se ve: una casa que arde durante días antes de quedar en ruina.
//
// El motor ya quemaba —el incendio anual de §5.9 y el rayo de §7.10— pero en
// pantalla la casa pasaba a escombro de golpe. Desde E4 el motor apunta la
// quema (`burnBuilding`, marca `burnt:<id>`) y esto la pinta sobre la ruina:
//
//   · **Llamas**: una textura dibujada con cuatro fotogramas (Vera: «textura
//     dibujada animada»; la regla de la piel es que el material sale de dibujo,
//     no de geometría suelta), en planos que miran a cámara, con mezcla aditiva
//     y un parpadeo propio por llama.
//   · **Chispas** que suben mientras hay llama.
//   · **Humo**: negro y espeso con la llama, gris y fino con las brasas. Es la
//     misma idea de las bocanadas de chimenea (`tells.ts`), más grande y más
//     sucia, y con una textura blanda en vez de esferas.
//   · **Una luz naranja** que parpadea, para que de noche el fuego alumbre.
//
// Cuánto dura lo dice `BURNING` (días escénicos: llama, luego brasa) y cuándo
// empezó lo dice el tick de la ruina. Es decorado: no toca el estado, no tira
// dados del motor y lo que parpadea sale de un hash por llama.

import {
  AdditiveBlending, CanvasTexture, Group, NormalBlending, PointLight, Sprite, SpriteMaterial,
  type Texture,
} from 'three';
import { BURNING } from '@engine/balance';
import { SCENIC_DAY_SECONDS } from '../presentation-clock';
import type { Building, GameState } from '@engine/state';
import { elevationAt } from '../world/ground';

const FRAMES = 4;
const FRAME_W = 64;
const FRAME_H = 128;
/** Cuántas llamas como mucho por edificio, y fuegos con luz propia a la vez. */
const MAX_FLAMES = 14;
const MAX_LIGHTS = 4;
const SMOKE_PUFFS = 18;
const SPARKS = 16;

function unit(seed: number, salt: number): number {
  let v = (seed * 374761393 + salt * 668265263) | 0;
  v = (v ^ (v >>> 13)) * 1274126177;
  v ^= v >>> 16;
  return (v >>> 0) / 4_294_967_296;
}

/** La hoja de llamas: cuatro fotogramas de lenguas de fuego, del blanco al rojo. */
function flameSheet(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = FRAME_W * FRAMES;
  canvas.height = FRAME_H;
  const ctx = canvas.getContext('2d');
  if (ctx !== null) {
    for (let frame = 0; frame < FRAMES; frame += 1) {
      const ox = frame * FRAME_W;
      ctx.save();
      ctx.beginPath();
      ctx.rect(ox, 0, FRAME_W, FRAME_H);
      ctx.clip();
      ctx.filter = 'blur(2px)';
      // Tres lenguas por fotograma, de distinta altura y con su vaivén: el
      // cambio de fotograma a fotograma es lo que hace que baile.
      for (let tongue = 0; tongue < 3; tongue += 1) {
        const cx = ox + FRAME_W * (0.3 + tongue * 0.2) + (unit(frame, tongue) - 0.5) * 8;
        const top = FRAME_H * (0.08 + unit(frame, tongue + 10) * 0.3) + (tongue === 1 ? -6 : 8);
        const half = FRAME_W * (0.2 - Math.abs(tongue - 1) * 0.04);
        const sway = (unit(frame, tongue + 20) - 0.5) * 18;
        const gradient = ctx.createLinearGradient(0, FRAME_H, 0, top);
        gradient.addColorStop(0, 'rgba(255, 244, 190, 1)');
        gradient.addColorStop(0.28, 'rgba(255, 190, 70, .95)');
        gradient.addColorStop(0.62, 'rgba(232, 92, 28, .8)');
        gradient.addColorStop(1, 'rgba(150, 30, 10, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(cx - half, FRAME_H - 4);
        ctx.quadraticCurveTo(cx - half * 1.2 + sway * 0.3, FRAME_H * 0.55, cx + sway, top);
        ctx.quadraticCurveTo(cx + half * 1.2 + sway * 0.3, FRAME_H * 0.55, cx + half, FRAME_H - 4);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.repeat.set(1 / FRAMES, 1);
  return texture;
}

/** Una bocanada blanda: un disco con el borde deshecho. */
function puffTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx !== null) {
    for (let blob = 0; blob < 5; blob += 1) {
      const x = 32 + (unit(blob, 1) - 0.5) * 18;
      const y = 32 + (unit(blob, 2) - 0.5) * 18;
      const r = 14 + unit(blob, 3) * 10;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, 'rgba(255, 255, 255, .55)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
    }
  }
  return new CanvasTexture(canvas);
}

/** Un punto de luz para las chispas. */
function sparkTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (ctx !== null) {
    const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    gradient.addColorStop(0, 'rgba(255, 236, 170, 1)');
    gradient.addColorStop(1, 'rgba(255, 120, 30, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 16, 16);
  }
  return new CanvasTexture(canvas);
}

interface Flame { sprite: Sprite; material: SpriteMaterial; texture: Texture; seed: number; x: number; z: number; size: number }
interface Puff { sprite: Sprite; material: SpriteMaterial; seed: number }
interface Spark { sprite: Sprite; material: SpriteMaterial; seed: number }

interface Blaze {
  readonly id: number;
  readonly group: Group;
  readonly centre: { x: number; y: number; z: number };
  readonly spread: { w: number; h: number };
  readonly flames: Flame[];
  readonly puffs: Puff[];
  readonly sparks: Spark[];
  /** Segundos de presentación en que empezó a arder. */
  readonly startSeconds: number;
  light: PointLight | null;
}

export interface Fires {
  readonly group: Group;
  /** Cuántos edificios arden ahora mismo (para la traza y las pruebas del navegador). */
  readonly burning: number;
  update(state: Readonly<GameState>, presentationSeconds: number): void;
  clear(): void;
  dispose(): void;
}

/** Los edificios que arden según el motor: ruina con su marca `burnt:<id>` viva. */
export function burningBuildings(state: Readonly<GameState>): Building[] {
  return state.buildings.filter((b) => {
    if (b.lostTick === null) return false;
    const until = state.flags[`burnt:${b.id}`];
    return until !== undefined && until > state.tick;
  });
}

export function createFires(): Fires {
  const group = new Group();
  group.name = 'Valley_Fires';
  const sheet = flameSheet();
  const puff = puffTexture();
  const spark = sparkTexture();
  const blazes = new Map<number, Blaze>();
  const totalDays = BURNING.FLAME_DAYS + BURNING.EMBER_DAYS;

  const build = (state: Readonly<GameState>, building: Building, presentationSeconds: number): Blaze => {
    const blazeGroup = new Group();
    blazeGroup.name = `Valley_Fire_${building.id}`;
    const cx = building.x + building.w / 2;
    const cz = building.y + building.h / 2;
    const cy = elevationAt(state.map, cx, cz);
    const flames: Flame[] = [];
    // Una llama por celda y unas pocas más: con dos por celda, la mezcla
    // aditiva sumaba hasta quemar a blanco (segunda captura de E4).
    const count = Math.min(MAX_FLAMES, 3 + building.w * building.h);
    for (let i = 0; i < count; i += 1) {
      const seed = building.id * 131 + i;
      const texture = sheet.clone();
      texture.needsUpdate = true;
      const material = new SpriteMaterial({ map: texture, blending: AdditiveBlending, depthWrite: false, transparent: true });
      const sprite = new Sprite(material);
      const x = (unit(seed, 1) - 0.5) * building.w * 0.85;
      const z = (unit(seed, 2) - 0.5) * building.h * 0.85;
      // Más altas que el tejado de la casa (1,47 celdas): es lo que se ve de lejos.
      const size = 0.8 + unit(seed, 3) * 0.6;
      sprite.center.set(0.5, 0.05);
      blazeGroup.add(sprite);
      flames.push({ sprite, material, texture, seed, x, z, size });
    }
    const puffs: Puff[] = [];
    for (let i = 0; i < SMOKE_PUFFS; i += 1) {
      const material = new SpriteMaterial({ map: puff, blending: NormalBlending, depthWrite: false, transparent: true });
      const sprite = new Sprite(material);
      blazeGroup.add(sprite);
      puffs.push({ sprite, material, seed: building.id * 71 + i });
    }
    const sparks: Spark[] = [];
    for (let i = 0; i < SPARKS; i += 1) {
      const material = new SpriteMaterial({ map: spark, blending: AdditiveBlending, depthWrite: false, transparent: true });
      const sprite = new Sprite(material);
      blazeGroup.add(sprite);
      sparks.push({ sprite, material, seed: building.id * 53 + i });
    }
    blazeGroup.position.set(cx, cy, cz);
    group.add(blazeGroup);
    // Si el fuego ya llevaba días —una partida cargada, un salto de velocidad—
    // se estrena donde iba, no desde el primer chispazo.
    const alreadyWeeks = Math.max(0, state.tick - (building.lostTick ?? state.tick));
    const startSeconds = presentationSeconds - alreadyWeeks * 7 * SCENIC_DAY_SECONDS;
    return {
      id: building.id, group: blazeGroup, centre: { x: cx, y: cy, z: cz },
      spread: { w: building.w, h: building.h }, flames, puffs, sparks, startSeconds, light: null,
    };
  };

  const drop = (blaze: Blaze): void => {
    group.remove(blaze.group);
    for (const flame of blaze.flames) { flame.material.dispose(); flame.texture.dispose(); }
    for (const one of blaze.puffs) one.material.dispose();
    for (const one of blaze.sparks) one.material.dispose();
    if (blaze.light !== null) blaze.group.remove(blaze.light);
    blazes.delete(blaze.id);
  };

  return {
    group,
    get burning() { return blazes.size; },
    update(state: Readonly<GameState>, presentationSeconds: number): void {
      const live = new Set<number>();
      for (const building of burningBuildings(state)) {
        live.add(building.id);
        if (!blazes.has(building.id)) blazes.set(building.id, build(state, building, presentationSeconds));
      }
      let lights = 0;
      let firstDays = -1;
      for (const blaze of [...blazes.values()]) {
        const days = (presentationSeconds - blaze.startSeconds) / SCENIC_DAY_SECONDS;
        if (!live.has(blaze.id) || days > totalDays) { drop(blaze); continue; }
        if (firstDays < 0) firstDays = days;
        // Cuánta llama: sube en medio día, arde entera y se apaga al final de
        // los días de llama; después queda un rescoldo que se consume.
        const rise = Math.min(1, days / 0.5);
        const flaming = days < BURNING.FLAME_DAYS;
        const fade = flaming
          ? Math.min(1, (BURNING.FLAME_DAYS - days) / 0.6)
          : Math.max(0, 1 - (days - BURNING.FLAME_DAYS) / BURNING.EMBER_DAYS);
        const flame = flaming ? rise * Math.max(0.25, fade) : 0.22 * fade;
        const t = presentationSeconds;

        for (const one of blaze.flames) {
          const flicker = 0.85 + 0.15 * Math.sin(t * (9 + unit(one.seed, 4) * 5) + one.seed);
          const height = one.size * flame * flicker * 2.1;
          one.sprite.visible = height > 0.02;
          one.sprite.scale.set(one.size * 0.95 * Math.max(0.3, flame), height, 1);
          one.sprite.position.set(one.x, 0.05, one.z);
          const frame = Math.floor(t * 10 + unit(one.seed, 5) * FRAMES) % FRAMES;
          one.texture.offset.x = frame / FRAMES;
          one.material.opacity = Math.min(0.62, 0.2 + 0.45 * flame);
        }

        // El humo: negro y espeso con llama, gris y fino con brasa.
        // Opaco y oscuro de verdad: con mezcla normal y poca opacidad el humo
        // se leía como una neblina azul sobre el prado.
        const thick = flaming ? 0.75 + 0.2 * rise : 0.55 * fade;
        const tone = flaming ? 0.09 : 0.32;
        for (const one of blaze.puffs) {
          const period = 5 + unit(one.seed, 1) * 3;
          const life = ((t + unit(one.seed, 2) * period) % period) / period;
          const drift = (unit(one.seed, 3) - 0.5) * 0.6;
          one.sprite.position.set(drift * life + life * 0.9, 1.2 + life * 4.5, drift * life * 0.6);
          const size = (0.8 + life * 2.6) * (flaming ? 1 : 0.7);
          one.sprite.scale.set(size, size, 1);
          one.material.color.setScalar(tone + life * 0.18);
          one.material.opacity = thick * (1 - life) * Math.min(1, life * 6);
          one.sprite.visible = one.material.opacity > 0.01;
        }

        for (const one of blaze.sparks) {
          const period = 1.2 + unit(one.seed, 1) * 1.4;
          const life = ((t + unit(one.seed, 2) * period) % period) / period;
          const x = (unit(one.seed, 3) - 0.5) * blaze.spread.w * 0.8 + Math.sin(t * 3 + one.seed) * 0.15 * life;
          const z = (unit(one.seed, 4) - 0.5) * blaze.spread.h * 0.8;
          one.sprite.position.set(x, 0.3 + life * 2.4, z);
          one.sprite.scale.setScalar(0.08);
          one.material.opacity = flaming ? rise * (1 - life) : 0;
          one.sprite.visible = one.material.opacity > 0.01;
        }

        // La luz: sólo los primeros fuegos, para no cargar el sombreado.
        const wantsLight = flame > 0.05 && lights < MAX_LIGHTS;
        if (wantsLight) {
          lights += 1;
          if (blaze.light === null) {
            blaze.light = new PointLight('#ff8a33', 0, 7, 1.6);
            blaze.light.position.set(0, 1.1, 0);
            blaze.group.add(blaze.light);
          }
          blaze.light.intensity = 2.2 * flame * (0.8 + 0.2 * Math.sin(t * 13 + blaze.id));
        } else if (blaze.light !== null) {
          blaze.light.intensity = 0;
        }
      }
      // Gancho de observación, como `data-bolts`: en qué día va el primer
      // fuego, para que una captura sepa qué está fotografiando.
      document.documentElement.dataset.fireDays = firstDays < 0 ? '' : firstDays.toFixed(2);
    },
    clear(): void {
      for (const blaze of [...blazes.values()]) drop(blaze);
    },
    dispose(): void {
      for (const blaze of [...blazes.values()]) drop(blaze);
      sheet.dispose();
      puff.dispose();
      spark.dispose();
    },
  };
}
