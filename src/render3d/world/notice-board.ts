// §7.13 · El tablón de misiones de la plaza, provisional (28 sep 2026).
//
// Dos postes, una tabla, un tejadillo y tres papeles clavados, hechos de
// cajas: se lee como tablón de avisos desde la vista de juego y se puede tocar
// (`userData.noticeBoard`, que `renderer.pick` busca). El modelo de verdad está
// pedido a Astra (`docs/encargos/visitantes-y-expediciones.md`, `notice-board`);
// cuando llegue, esto se sustituye por `library.instance('notice-board')`.

import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';

/** Cuántos papeles se clavan: los que el tablón anuncia, hasta tres. */
const MAX_NOTES = 3;

export interface NoticeBoardMesh {
  readonly group: Group;
  /** Pone el tablón en su sitio y enseña tantos papeles como misiones haya. */
  place(x: number, y: number, z: number, yaw: number, notes: number): void;
}

export function createNoticeBoard(): NoticeBoardMesh {
  const group = new Group();
  group.name = 'Valley_NoticeBoard';
  group.userData['noticeBoard'] = true;
  const timber = new MeshStandardMaterial({ color: '#5e3f25', roughness: 0.95, metalness: 0 });
  const plank = new MeshStandardMaterial({ color: '#8a6038', roughness: 0.9, metalness: 0 });
  const paper = new MeshStandardMaterial({ color: '#efe4c8', roughness: 1, metalness: 0 });
  const add = (mesh: Mesh, x: number, y: number, z: number): Mesh => {
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  };
  const post = new BoxGeometry(0.08, 1.3, 0.08);
  add(new Mesh(post, timber), -0.42, 0.65, 0);
  add(new Mesh(post, timber), 0.42, 0.65, 0);
  add(new Mesh(new BoxGeometry(0.9, 0.55, 0.05), plank), 0, 0.85, 0);
  // El tejadillo, dos faldones.
  const eave = new BoxGeometry(1.02, 0.04, 0.24);
  const left = add(new Mesh(eave, timber), 0, 1.24, -0.06);
  left.rotation.x = -0.45;
  const right = add(new Mesh(eave, timber), 0, 1.24, 0.06);
  right.rotation.x = 0.45;
  const notes: Mesh[] = [];
  const noteShape = new BoxGeometry(0.2, 0.26, 0.01);
  for (let k = 0; k < MAX_NOTES; k += 1) {
    const note = add(new Mesh(noteShape, paper), -0.26 + k * 0.26, 0.86 + (k % 2 === 0 ? 0.04 : -0.03), 0.035);
    note.rotation.z = (k - 1) * 0.08;
    note.castShadow = false;
    notes.push(note);
  }
  group.visible = false;
  return {
    group,
    place(x, y, z, yaw, count): void {
      group.visible = true;
      group.position.set(x, y, z);
      group.rotation.y = yaw;
      notes.forEach((note, k) => { note.visible = k < count; });
    },
  };
}
