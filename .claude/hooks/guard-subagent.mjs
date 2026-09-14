#!/usr/bin/env node
// El candado: un subagente no puede hacer que la verificación pase por decreto.
//
// Hook `PreToolUse` sobre `Edit|Write|Bash`, activo **sólo dentro de un
// subagente** (`agent_id` presente). La sesión principal no lo nota.
//
// Sale de un caso real de este repositorio: un agente cuyo fichero de prueba no
// compilaba **lo excluyó del `typecheck`** (`"exclude"` en `tsconfig.json`) y
// reportó «typecheck limpio». La causa de fondo era de infraestructura y se
// podía arreglar; el problema fue que el síntoma se escondió en vez de
// señalarse. Esto lo hace imposible: quien no pueda compilar tiene que decirlo.

import { readFileSync } from 'node:fs';

/** Lo que un subagente no toca. Cambiar esto es decidir qué se verifica. */
const SEALED = [
  /(^|[\\/])tsconfig([.-][\w.-]+)?\.json$/i,
  /(^|[\\/])eslint\.config\.[cm]?[jt]s$/i,
  /(^|[\\/])\.eslintrc([.-][\w.-]+)?$/i,
  /(^|[\\/])vitest[\w.-]*\.config\.[cm]?[jt]s$/i,
  /(^|[\\/])playwright[\w.-]*\.config\.[cm]?[jt]s$/i,
  /(^|[\\/])package\.json$/i,
  /(^|[\\/])\.gitignore$/i,
];

/** Y lo que no hace con git: reescribir historia o saltarse los ganchos. */
const FORBIDDEN = [
  { pattern: /\bgit\s+commit\b[^\n]*--amend\b/i, what: '`git commit --amend` reescribe un commit ya hecho' },
  { pattern: /\bgit\s+[^\n]*--no-verify\b/i, what: '`--no-verify` se salta los ganchos de verificación' },
  { pattern: /\bgit\s+[^\n]*--no-gpg-sign\b/i, what: '`--no-gpg-sign` se salta la firma' },
  { pattern: /\bgit\s+push\b[^\n]*(--force|-f)\b/i, what: '`git push --force` pisa lo que haya publicado' },
  { pattern: /\bgit\s+reset\b[^\n]*--hard\b/i, what: '`git reset --hard` tira trabajo sin red' },
  { pattern: /\bnpm\s+(test|run\s+[\w:-]+)\b[^\n]*--\s+[^\n]*--exclude\b/i, what: 'excluir ficheros de una pasada de pruebas' },
];

function deny(reason) {
  process.stdout.write(`${JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: `guard-subagent: ${reason}\n\n`
        + 'Si la verificación no pasa, eso es el hallazgo: dilo en tu informe final '
        + 'con el error literal. No lo escondas ni lo rodees.',
    },
  })}\n`);
  process.exit(0);
}

function main() {
  let event;
  try {
    event = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    process.exit(0);
  }
  // Fuera de un subagente esto no existe.
  if (!event.agent_id) process.exit(0);

  const input = event.tool_input ?? {};
  const tool = event.tool_name;

  if (tool === 'Edit' || tool === 'Write' || tool === 'NotebookEdit') {
    const path = String(input.file_path ?? input.notebook_path ?? '');
    if (SEALED.some((sealed) => sealed.test(path))) {
      deny(`\`${path}\` decide qué se verifica y no lo cambia un subagente.`);
    }
  }

  if (tool === 'Bash' || tool === 'PowerShell') {
    const command = String(input.command ?? '');
    for (const { pattern, what } of FORBIDDEN) {
      if (pattern.test(command)) deny(`${what}.`);
    }
    // Y los mismos ficheros, por la puerta de atrás de una redirección o un sed.
    if (/>\s*[^\s|]*(tsconfig[\w.-]*\.json|package\.json|eslint\.config|vitest[\w.-]*\.config)/i.test(command)
      || /\bsed\b[^\n]*-i[^\n]*(tsconfig|package\.json|eslint\.config|vitest)/i.test(command)) {
      deny('editar un fichero de configuración desde la consola es la misma puerta.');
    }
  }

  process.exit(0);
}

main();
