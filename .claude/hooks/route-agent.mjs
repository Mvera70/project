#!/usr/bin/env node
// Elige con qué modelo corre cada agente, para no pagar el caro en lo mecánico.
//
// Hook `PreToolUse` sobre `Agent`. Lee la llamada por stdin, decide el carril y
// devuelve el mismo `tool_input` con el `model` puesto.
//
// **La regla que manda sobre todas las demás:** nada que escriba código fuente
// o pruebas baja a Haiku, aunque se pida explícitamente. Medido en este mismo
// repositorio, con briefs del Anexo E escritos por un modelo superior: Sonnet
// una de una entrega limpia sin supervisión; Haiku cero de dos —una con dos
// defectos de diseño escondidos tras una prueba débil, y otra que, al no
// compilar su fichero, **excluyó su propia prueba del `typecheck`** para poder
// reportar verde. El fallo de base era de infraestructura; esconderlo, no.
//
// Prioridad de la decisión, de más fuerte a más débil:
//   1. `Tier: medir|construir` en el prompt del agente.
//   2. El `model` que venga en la llamada.
//   3. Las palabras del prompt.
//   4. Sonnet.
//
// **La etiqueta manda sobre el paso de seguridad, y lo demás no.** En la primera
// llamada real, una tarea de pura medida etiquetada `Tier: medir` —y que decía
// con todas las letras «esta tarea no escribe código fuente ni pruebas»— subió a
// Sonnet porque el prompt *nombra* `src/` y `tests/` para prohibirlos. El
// heurístico lee palabras, no intención, y no distingue «escribe en src/» de «no
// toques src/». Se corrige donde estaba el error: la etiqueta la escribe quien
// orquesta, a mano y sabiendo lo que pide, así que es una decisión y no una
// pista. El paso de seguridad sigue entero para lo que sí es una pista — un
// `model: 'haiku'` en la llamada con un prompt que habla de escribir código —,
// que es el caso que de verdad se quería atrapar.

import { readFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const HERE = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const LOG = resolve(HERE, 'route-log.jsonl');

/** Los tres carriles. `diseñar` no se delega nunca: lo lleva la sesión. */
const TIERS = {
  medir: { model: 'haiku', writesCode: false },
  construir: { model: 'sonnet', writesCode: true },
};

/** Lo que delata que una tarea va a escribir código o pruebas. */
const CODE = [
  /\bsrc\//i, /\btests?\//i, /\.tsx?\b/i,
  /\bimplementa/i, /\bescribe (el |la |un |una )?(código|módulo|fichero|prueba|test)/i,
  /\bnuevo fichero\b/i, /\brefactor/i, /\bporta\b/i, /\barregla\b/i, /\bcorrige\b/i,
  /\bimplement\b/i, /\bwrite (the )?(code|module|test)/i, /\bfix\b/i, /\bport\b/i,
];

/** Lo que delata que una tarea sólo mide, resume o indexa. */
const MEASURE = [
  /\bmide\b/i, /\bmedir\b/i, /\bejecuta la sonda\b/i, /\bcorre (la |las )?(suite|sonda|prueba)/i,
  /\bresume\b/i, /\bresumen\b/i, /\binforme\b/i, /\bhoja de contactos\b/i,
  /\bíndice\b/i, /\btabla de\b/i, /\brecopila\b/i, /\bmeasure\b/i, /\bsummar/i, /\breport\b/i,
];

function hits(patterns, text) {
  return patterns.filter((pattern) => pattern.test(text)).map(String);
}

function decide(input) {
  const prompt = String(input.prompt ?? '');
  const description = String(input.description ?? '');
  const text = `${description}\n${prompt}`;

  // 1 · La etiqueta explícita gana.
  const tagged = /^\s*Tier:\s*(medir|construir)\s*$/im.exec(prompt);
  let tier = tagged?.[1] ?? null;
  let why = tier === null ? null : `etiqueta \`Tier: ${tier}\``;

  // 2 · Si no, lo que ya venía pedido.
  if (tier === null && typeof input.model === 'string') {
    tier = input.model === 'haiku' ? 'medir' : 'construir';
    why = `\`model: ${input.model}\` en la llamada`;
  }

  // 3 · Si no, las palabras.
  const codeHits = hits(CODE, text);
  const measureHits = hits(MEASURE, text);
  if (tier === null) {
    if (codeHits.length > 0) { tier = 'construir'; why = `habla de código (${codeHits.length} señales)`; }
    else if (measureHits.length > 0) { tier = 'medir'; why = `sólo mide o resume (${measureHits.length} señales)`; }
    else { tier = 'construir'; why = 'sin señales claras, se sube por defecto'; }
  }

  // El paso de seguridad. No se aplica a una etiqueta explícita: ver cabecera.
  let raised = null;
  if (tier === 'medir' && tagged === null && codeHits.length > 0) {
    raised = `pedía Haiku pero la tarea escribe código (${codeHits.length} señales); se sube a Sonnet`;
    tier = 'construir';
  }

  const model = input.model === 'opus' || input.model === 'fable'
    // Un modelo mayor pedido a mano se respeta: subir nunca es el riesgo.
    ? input.model
    : TIERS[tier].model;

  return { tier, model, why, raised, codeHits: codeHits.length, measureHits: measureHits.length };
}

function main() {
  let event;
  try {
    event = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    // Sin entrada legible no se decide nada: se deja pasar la llamada tal cual.
    process.exit(0);
  }
  if (event.tool_name !== 'Agent') process.exit(0);

  const input = event.tool_input ?? {};
  const call = decide(input);

  try {
    mkdirSync(HERE, { recursive: true });
    appendFileSync(LOG, `${JSON.stringify({
      at: new Date().toISOString(),
      session: event.session_id ?? null,
      description: input.description ?? null,
      subagent_type: input.subagent_type ?? null,
      asked: input.model ?? null,
      ...call,
    })}\n`);
  } catch { /* el registro nunca puede tumbar la llamada */ }

  const reason = call.raised ?? `carril \`${call.tier}\` → ${call.model} (${call.why})`;
  process.stdout.write(`${JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      permissionDecisionReason: `route-agent: ${reason}`,
      updatedInput: { ...input, model: call.model },
    },
  })}\n`);
}

main();
