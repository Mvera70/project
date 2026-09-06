// @ts-check
import tseslint from 'typescript-eslint';

/** Identificadores prohibidos dentro de src/engine/ — design.md §2.4 */
const ENGINE_BANNED_GLOBALS = ['document', 'window', 'navigator', 'localStorage', 'performance'];

export default tseslint.config(
  { ignores: ['dist', 'artifacts', 'node_modules', 'coverage'] },

  ...tseslint.configs.recommended,

  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      eqeqeq: ['error', 'always'],
      'no-console': 'off',
    },
  },

  // --- El motor no sabe que existe una pantalla. design.md §2.4 ---
  {
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', ...ENGINE_BANNED_GLOBALS.map((name) => ({
        name,
        message: 'El motor no conoce el DOM. design.md §2.4',
      }))],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Usa el Rng sembrado. design.md §4.3' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date']",
          message: 'El tiempo entra como parámetro (tick). design.md §2.4',
        },
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'El tiempo entra como parámetro (tick). design.md §2.4',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@render/*', '@ui/*', '**/render/*', '**/ui/*'],
              message: 'El motor no importa de render ni de ui. design.md §2.4' },
          ],
        },
      ],
    },
  },

  // El CLI sí puede escribir por consola y leer argv.
  { files: ['src/cli/**/*.ts', 'tools/**/*.ts', 'tests/**/*.ts'], rules: { 'no-restricted-globals': 'off' } },
);
