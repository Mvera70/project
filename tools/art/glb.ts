import type { ArtRecipe } from './schema';

interface GltfAccessor { count?: unknown; min?: unknown; max?: unknown }
interface GltfPrimitive { attributes?: unknown; indices?: unknown; mode?: unknown }
interface GltfMesh { name?: unknown; primitives?: unknown }
interface GltfNode { name?: unknown; mesh?: unknown }
interface GltfMaterial { name?: unknown }
interface GltfAnimation { name?: unknown }
interface GltfDocument {
  asset?: unknown;
  accessors?: unknown;
  meshes?: unknown;
  nodes?: unknown;
  materials?: unknown;
  animations?: unknown;
}

export interface GlbInspection {
  version: number;
  declaredLength: number;
  nodeNames: string[];
  meshNames: string[];
  materialNames: string[];
  animationNames: string[];
  finitePositionAccessors: number;
  statistics: { objects: number; meshes: number; materials: number; triangles: number };
}

function objects(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null && !Array.isArray(item));
}

function names(value: unknown): string[] {
  return objects(value).map((item) => item.name).filter((name): name is string => typeof name === 'string' && name.length > 0);
}

function assertUnique(values: readonly string[], label: string): void {
  const duplicate = values.find((value, index) => values.indexOf(value) !== index);
  if (duplicate !== undefined) throw new Error(`${label} contains duplicate name '${duplicate}'.`);
}

function vectorIsFinite(value: unknown): boolean {
  return Array.isArray(value) && value.length === 3 && value.every((item) => typeof item === 'number' && Number.isFinite(item));
}

export function inspectGlb(buffer: Buffer): GlbInspection {
  if (buffer.length < 20) throw new Error(`GLB is truncated: ${buffer.length} bytes.`);
  if (buffer.subarray(0, 4).toString('ascii') !== 'glTF') throw new Error('GLB magic must be glTF.');
  const version = buffer.readUInt32LE(4);
  if (version !== 2) throw new Error(`GLB version must be 2, received ${version}.`);
  const declaredLength = buffer.readUInt32LE(8);
  if (declaredLength !== buffer.length) throw new Error(`GLB length header ${declaredLength} does not match ${buffer.length} bytes.`);
  const jsonLength = buffer.readUInt32LE(12);
  const jsonType = buffer.readUInt32LE(16);
  if (jsonType !== 0x4e4f534a) throw new Error('GLB first chunk must be JSON.');
  const jsonEnd = 20 + jsonLength;
  if (jsonEnd > buffer.length) throw new Error('GLB JSON chunk extends beyond the file.');
  let document: GltfDocument;
  try {
    document = JSON.parse(buffer.subarray(20, jsonEnd).toString('utf8').trim()) as GltfDocument;
  } catch (error) {
    throw new Error(`GLB JSON chunk is invalid: ${error instanceof Error ? error.message : String(error)}`);
  }
  const asset = typeof document.asset === 'object' && document.asset !== null ? document.asset as Record<string, unknown> : {};
  if (typeof asset.version !== 'string' || !asset.version.startsWith('2.')) throw new Error('GLB JSON asset.version must describe glTF 2.x.');

  const accessors = objects(document.accessors) as GltfAccessor[];
  const meshes = objects(document.meshes) as GltfMesh[];
  const nodes = objects(document.nodes) as GltfNode[];
  const materials = objects(document.materials) as GltfMaterial[];
  const animations = objects(document.animations) as GltfAnimation[];
  const positionIndices: number[] = [];
  let triangles = 0;
  for (const mesh of meshes) {
    for (const primitive of objects(mesh.primitives) as GltfPrimitive[]) {
      const attributes = typeof primitive.attributes === 'object' && primitive.attributes !== null
        ? primitive.attributes as Record<string, unknown> : {};
      if (typeof attributes.POSITION === 'number') positionIndices.push(attributes.POSITION);
      const mode = primitive.mode === undefined ? 4 : primitive.mode;
      if (mode !== 4) throw new Error(`Only triangle-list primitives are supported, received mode ${String(mode)}.`);
      const indexAccessor = typeof primitive.indices === 'number' ? accessors[primitive.indices] : undefined;
      const positionAccessor = typeof attributes.POSITION === 'number' ? accessors[attributes.POSITION] : undefined;
      const count = indexAccessor?.count ?? positionAccessor?.count;
      if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) throw new Error('GLB primitive has no valid vertex/index count.');
      triangles += Math.floor(count / 3);
    }
  }
  if (positionIndices.length === 0) throw new Error('GLB contains no POSITION accessors.');
  for (const index of positionIndices) {
    const accessor = accessors[index];
    if (accessor === undefined || !vectorIsFinite(accessor.min) || !vectorIsFinite(accessor.max)) {
      throw new Error(`POSITION accessor ${index} must have finite three-axis min/max bounds.`);
    }
  }
  const nodeNames = names(nodes);
  const meshNames = names(meshes);
  const materialNames = names(materials);
  const animationNames = names(animations);
  assertUnique(nodeNames, 'GLB nodes');
  assertUnique(materialNames, 'GLB materials');
  assertUnique(animationNames, 'GLB animations');
  return {
    version, declaredLength, nodeNames, meshNames, materialNames, animationNames,
    finitePositionAccessors: positionIndices.length,
    statistics: { objects: nodes.length, meshes: meshes.length, materials: materials.length, triangles },
  };
}

function sameMembers(actual: readonly string[], expected: readonly string[], label: string): void {
  const left = [...actual].sort();
  const right = [...expected].sort();
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    throw new Error(`${label} mismatch: expected [${right.join(', ')}], received [${left.join(', ')}].`);
  }
}

export function validateGlb(recipe: ArtRecipe, buffer: Buffer): GlbInspection {
  const inspection = inspectGlb(buffer);
  for (const primitive of recipe.primitives) {
    if (!inspection.nodeNames.includes(primitive.name)) throw new Error(`GLB is missing object '${primitive.name}'.`);
  }
  for (const connector of recipe.connectors) {
    if (!inspection.nodeNames.includes(connector)) throw new Error(`GLB is missing connector '${connector}'.`);
  }
  sameMembers(inspection.materialNames, recipe.materials.map((item) => item.name), 'GLB materials');
  sameMembers(inspection.animationNames, recipe.clips, 'GLB clips');
  return inspection;
}
