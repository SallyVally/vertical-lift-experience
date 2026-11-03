import { Mesh, Matrix4 } from 'three';
import { mergeGeometries } from './addons/utils/BufferGeometryUtils.js';

// Only immutable meshes are batched. Controls, LEDs and the mirror keep their identities.
export function batchStatic(root, excluded = new Set()) {
  root.updateMatrixWorld(true);
  const inverse = new Matrix4().copy(root.matrixWorld).invert();
  const groups = new Map();
  const candidates = [];
  root.traverse(object => {
    if (!object.isMesh || !object.visible || excluded.has(object) || Array.isArray(object.material) || object.material.transparent) return;
    const attributes = Object.keys(object.geometry.attributes).sort().join(',');
    const key = `${object.material.uuid}/${attributes}/${!!object.geometry.index}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(object);
    candidates.push(object);
  });
  let removed = 0, batches = 0;
  const protectedGeometry = new Set([...excluded].map(object => object.geometry));
  const released = new Set();
  for (const meshes of groups.values()) {
    if (meshes.length < 2) continue;
    const clones = meshes.map(mesh => mesh.geometry.clone().applyMatrix4(new Matrix4().multiplyMatrices(inverse, mesh.matrixWorld)));
    const geometry = mergeGeometries(clones, false);
    clones.forEach(clone => clone.dispose());
    if (!geometry) continue;
    geometry.computeBoundingSphere();
    const combined = new Mesh(geometry, meshes[0].material);
    combined.name = 'Static batch / ' + meshes[0].material.name;
    root.add(combined);
    meshes.forEach(mesh => {
      mesh.removeFromParent();
      if (!protectedGeometry.has(mesh.geometry) && !released.has(mesh.geometry)) {
        released.add(mesh.geometry);
        mesh.geometry.dispose();
      }
    });
    removed += meshes.length;
    batches++;
  }
  return { input: candidates.length, removed, batches };
}
