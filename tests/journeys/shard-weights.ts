// Lo que pesa cada jornada, en segundos de prueba del servidor de CI.
//
// **Para qué.** vitest reparte los trozos (`--shard`) por el hash de la ruta,
// no por lo que cuesta cada fichero, y el 1 oct 2026 eso daba trozos de 11, 33
// y 30 minutos con los mismos tres servidores: uno se llevaba `threat` entera
// y otro casi nada. `vitest.journeys.config.ts` reparte con esta tabla —el más
// pesado primero, al trozo que menos lleva— y así todos acaban a la vez.
//
// **De dónde salen.** De los registros de CI del 1 oct 2026 (vuelta
// 36930779436): los trabajos `journeys (1..3)` para lo que ya vivía aquí, y el
// trabajo `fast` para lo que se mudó en v5.56. Son tiempos de un servidor con
// cuatro hilos ocupados, así que valen para comparar ficheros entre sí, no
// como reloj.
//
// **Cuenta también la recogida.** Un fichero que calcula en el cuerpo de su
// `describe`, fuera de las pruebas, paga ese tiempo antes de la primera y el
// informe no se lo apunta: `catalogue-coverage` decía 0,1 s y juega doce
// valles de cien años al recoger (~700 s en CI, 487 s en local); `founding`,
// ~245; `life-wildlife`, ~80 más sobre sus 160; y de lo mudado en v5.56,
// `ui-milestones-long` y `fate-long` (189 y 148 s en local). Medido con
// `vitest run <fichero> -t '^nada$'`, que recoge sin correr nada.
//
// **Si falta un fichero**, pesa la mediana y no rompe nada: el reparto sale
// un poco peor, no mal. Si una jornada nueva pasa de unos cien segundos,
// apúntala aquí con su medida.
export const JOURNEY_WEIGHTS: Readonly<Record<string, number>> = {
  // v5.68: cada partida una vez por fichero (18 → 6). Medido en local, que por
  // núcleo va como el servidor (ledger: 666 s local, 689 s CI).
  'threat': 470,
  'life-props': 1041,
  'wall-rings-gates-era': 953,
  'e3b-corridor': 894,
  'threat-defence': 825,
  'sim-long': 752,
  'catalogue-coverage': 700,
  // v5.68: 11 partidas de ochenta años → 3. Medido en local, como `threat`.
  'ledger': 161,
  'wall-rings': 573,
  'plaza-long': 507,
  'works': 445,
  'life-scenes': 407,
  'fate-chaos': 403,
  'engine-long': 395,
  'life-beasts': 290,
  'life-body-long': 281,
  'ui-milestones-long': 280,
  'chronicle-long': 250,
  'e3b-rampart': 247,
  'founding': 245,
  'crossroads-reachability': 240,
  'life-wildlife': 240,
  'life-needs-long': 239,
  'animals-long': 223,
  'assault': 217,
  'fate-long': 215,
  'save-long': 183,
  'life-trade': 180,
  'density': 173,
  'life-navigate': 166,
  'notices': 166,
  'sim-endings-long': 154,
  'ui-doing-long': 153,
  'graphics-steading-long': 138,
  'work-contact': 136,
  'road-long': 133,
  'ui-long': 132,
  'life-decide': 128,
  'life-places': 124,
  'garrison': 114,
  'plaza-gatherings': 110,
  'invariants-long': 107,
  'herd-long': 106,
  'sim-policies-long': 92,
  'life-staging': 78,
  'trade-long': 77,
  'archery': 76,
  'life-expeditions': 76,
  'murrain-long': 63,
  'moods': 62,
  'life-companions': 61,
  'life-beasts-long': 60,
  'life-lost-child': 60,
  'gates': 53,
  'means-long': 53,
  'reader-packet': 53,
  'life-given': 52,
  'life-orders': 50,
  'raiders': 49,
  'daylife-long': 46,
  'life-wood-run': 43,
  'life-commitments-long': 41,
  'visit-sign': 40,
  'marks-long': 37,
  'life-motion': 34,
  'work-gestures-long': 33,
  'life-eaves': 31,
  'expeditions-long': 29,
  'e3b-published-models': 28,
  'life-visitors': 28,
  'bastion-access-history': 27,
  'demo-presets': 26,
  'demography-long': 25,
  'founding-ford-long': 25,
  'graphics-ridge': 25,
  'ui-title-long': 25,
  'gorge-corridors': 24,
  'graphics-world-long': 24,
  'fire-brigade': 23,
  'watchtower': 23,
  'crown-long': 21,
  'yards': 21,
  'sound-long': 19,
  'graphics-effects-long': 18,
  'rest-no-defeat': 18,
  'life-perf': 17,
  'quarrels-long': 17,
  'life-story-long': 16,
  'gorge-water': 15,
  'graphics-scenic-state-long': 15,
  'crown-hall-long': 14,
  'puddles': 13,
  'grass-long': 12,
  'era-long': 11,
  'water-long': 11,
  'crown-will-long': 10,
  'life-rabbits': 10,
  'life-resources-long': 10,
  'title-cooperative': 10,
  'ui-redesign-people-long': 10,
  'graphics-budget-long': 9,
  'ui-annals-long': 8,
  'pressure-long': 6,
  'life-bear-visit': 2,
};
