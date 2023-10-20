import * as THREE from "three";

export function setBoundingSpace(scene: THREE.Scene): void {
  const boundingBox = new THREE.Box3();
  // scene.traverse((node: THREE.Object3D) => {
  //   if (node instanceof THREE.Mesh) {
  //     boundingBox.expandByObject(node);
  //   }
  // });
  const boundingBoxSize = new THREE.Vector3();
  boundingBox.getSize(boundingBoxSize);
  const boundingBoxCenter = new THREE.Vector3();
  boundingBox.getCenter(boundingBoxCenter);
  const centerForce = boundingBoxCenter.negate();
  const repulsionForce = 10;

  const boundingBoxMin = new THREE.Vector3(-500, -500, -500);
  const boundingBoxMax = new THREE.Vector3(500, 500, 500);
  boundingBox.set(boundingBoxMin, boundingBoxMax);
  scene.userData.forceGraphData = {
    center: centerForce,
    boundingBox: boundingBox,
    boundingSphereRadius: 500,
    repulsion: repulsionForce,
  };

  // show this bounding box
  const box = new THREE.Box3Helper(boundingBox);
  scene.add(box);
  scene.traverse((node: THREE.Object3D) => {
    const nodeCenter = new THREE.Vector3();
    node.getWorldPosition(nodeCenter);
    if (!boundingBox.containsPoint(nodeCenter)) {
      const closestPoint = boundingBox.clampPoint(nodeCenter, new THREE.Vector3());
      node.position.sub(nodeCenter).add(closestPoint);
    }
  });
}
