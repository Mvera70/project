// IA-12 · Herramientas pequeñas del gesto; las posee el actor, no la biblioteca.
import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial } from 'three';

export function handTool(clip: string): Group | undefined {
  if (!['hammer', 'chop', 'mine', 'drink'].includes(clip)) return undefined;
  const group = new Group(); group.userData.ownedTool = true;
  const wood = new MeshStandardMaterial({ color: 0x795633, roughness: 1 });
  const metal = new MeshStandardMaterial({ color: 0x555b59, roughness: 0.85 });
  if (clip === 'drink') {
    const cup = new Mesh(new CylinderGeometry(0.085, 0.07, 0.16, 8), wood);
    cup.position.y = 0.07; group.add(cup); metal.dispose();
  } else if (clip === 'mine' || clip === 'chop') {
    // IA-anim · Pico y hacha de leñador, en metros como los demás respaldos:
    // mango de 1,0 y cabeza exagerada para que se lea a veinte píxeles de
    // aldeano. Se construyen con el mango en +Y y la cabeza en +X, y `grip`
    // los gira al marco de la mano: medido en el banco de gestos sobre el GLB
    // publicado, esa orientación deja el mango hacia delante y abajo en el
    // golpe y la cabeza en el plano del golpe.
    const tool = new Group();
    const handle = new Mesh(new BoxGeometry(0.06, 1.0, 0.06), wood);
    handle.position.y = 0.4; tool.add(handle);
    if (clip === 'mine') {
      // Dos puntas que se curvan hacia el mango, como un pico de cantero.
      for (const side of [-1, 1]) {
        const arm = new Mesh(new BoxGeometry(0.34, 0.08, 0.08), metal);
        arm.position.set(side * 0.16, 0.86, 0); arm.rotation.z = side * 0.28; tool.add(arm);
      }
    } else {
      const blade = new Mesh(new BoxGeometry(0.26, 0.24, 0.05), metal);
      blade.position.set(0.13, 0.82, 0); tool.add(blade);
      const poll = new Mesh(new BoxGeometry(0.08, 0.1, 0.08), metal);
      poll.position.set(-0.04, 0.82, 0); tool.add(poll);
    }
    tool.quaternion.set(0.6794, 0.2790, 0.6522, 0.1878);
    group.add(tool); return group;
  } else {
    const length = 0.4;
    const handle = new Mesh(new BoxGeometry(0.045, length, 0.045), wood);
    handle.position.y = length * 0.3; group.add(handle);
    const head = new Mesh(new BoxGeometry(0.23, 0.13, 0.09), metal);
    head.position.y = length * 0.8; group.add(head);
  }
  return group;
}
