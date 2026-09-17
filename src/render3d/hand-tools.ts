// IA-12 · Herramientas pequeñas del gesto; las posee el actor, no la biblioteca.
import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial } from 'three';

export function handTool(clip: string): Group | undefined {
  if (!['hammer', 'chop', 'drink'].includes(clip)) return undefined;
  const group = new Group(); group.userData.ownedTool = true;
  const wood = new MeshStandardMaterial({ color: 0x795633, roughness: 1 });
  const metal = new MeshStandardMaterial({ color: 0x555b59, roughness: 0.85 });
  if (clip === 'drink') {
    const cup = new Mesh(new CylinderGeometry(0.085, 0.07, 0.16, 8), wood);
    cup.position.y = 0.07; group.add(cup); metal.dispose();
  } else {
    const length = clip === 'chop' ? 0.65 : 0.4;
    const handle = new Mesh(new BoxGeometry(0.045, length, 0.045), wood);
    handle.position.y = length * 0.3; group.add(handle);
    const head = new Mesh(new BoxGeometry(clip === 'chop' ? 0.3 : 0.23, 0.13, 0.09), metal);
    head.position.y = length * 0.8; group.add(head);
  }
  return group;
}
