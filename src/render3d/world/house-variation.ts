import { Box3, Color, Matrix4, Mesh, MeshStandardMaterial, Vector3, type Object3D } from 'three';

// Variación de oficio, no de riqueza: misma huella y mismo material básico.
// Sólo cambia la pendiente sobre el alero y el tono de la receta aprobada.
const FINISHES = [
  { rise: 0.82, roof: '#d5c3a3', wall: '#e6dcc9' },
  { rise: 1, roof: '#ffffff', wall: '#ffffff' },
  { rise: 1.16, roof: '#e8dbbc', wall: '#e2c6ac' },
  { rise: 0.94, roof: '#c5b9a2', wall: '#dad9cf' },
] as const;

export function houseVariant(seed: number, x: number, z: number): number {
  let hash = Math.imul(seed ^ Math.imul(x, 73856093), 19349663) ^ Math.imul(z, 83492791);
  hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
  return (hash >>> 0) % FINISHES.length;
}

/** Copias privadas: no modifica geometría/materiales de la biblioteca GLB. */
export function varyHouse(source: Object3D, variant: number): () => void {
  const finish = FINISHES[variant % FINISHES.length] ?? FINISHES[1];
  const owned: Array<{ dispose(): void }> = [];
  source.updateMatrixWorld(true);
  let base = Number.POSITIVE_INFINITY;
  source.traverse(child => {
    if (child instanceof Mesh && child.material instanceof MeshStandardMaterial
      && child.material.name.includes('roof')) base = Math.min(base, new Box3().setFromObject(child).min.y);
  });
  source.traverse((child) => {
    if (!(child instanceof Mesh) || !(child.material instanceof MeshStandardMaterial)) return;
    const roof = child.material.name.includes('roof');
    const wall = child.material.name.includes('plaster') || child.material.name.includes('stone');
    if (roof || wall) {
      const material = child.material.clone();
      material.color.multiply(new Color(roof ? finish.roof : finish.wall));
      child.material = material;
      owned.push(material);
    }
    if (new Box3().setFromObject(child).max.y <= base) return;
    // El GLB conserva transformaciones de Blender: deformar en Y mundial
    // evita confundir altura con fondo cuando el nodo gira sus ejes locales.
    // Entramado, caballete y chimenea acompañan al tejado por encima del
    // mismo alero. Deformar sólo la paja separaría las vigas de la cubierta.
    const geometry = child.geometry.clone();
    const points = geometry.getAttribute('position');
    const inverse = new Matrix4().copy(child.matrixWorld).invert();
    const point = new Vector3();
    for (let i = 0; i < points.count; i++) {
      point.fromBufferAttribute(points, i).applyMatrix4(child.matrixWorld);
      if (point.y > base) point.y = base + (point.y - base) * finish.rise;
      point.applyMatrix4(inverse);
      points.setXYZ(i, point.x, point.y, point.z);
    }
    points.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    child.geometry = geometry;
    owned.push(geometry);
  });
  return () => { for (const resource of owned) resource.dispose(); };
}
