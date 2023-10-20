/**
 * TODO: this file is not complete and not used by the plugin because the example of three js cannot be reproduced
 */

import * as THREE from "three";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

const vertexShader = `


varying vec2 vUv;

void main() {

    vUv = uv;

    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

}

`;

const fragmentShader = `


uniform sampler2D baseTexture;
uniform sampler2D bloomTexture;

varying vec2 vUv;

void main() {

    gl_FragColor = ( texture2D( baseTexture, vUv ) + vec4( 1.0 ) * texture2D( bloomTexture, vUv ) );

}
`;

export const BLOOM_SCENE = 1;

export const bloomLayer = new THREE.Layers();

export const params = {
  threshold: 0,
  strength: 1,
  radius: 0.5,
  exposure: 1,
};

export const darkMaterial = new THREE.MeshBasicMaterial({ color: "black" });
export const materials = {};

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5,
  0.4,
  0.85
);
bloomPass.threshold = params.threshold;
bloomPass.strength = params.strength;
bloomPass.radius = params.radius;

const getRenderScene = (scene: THREE.Scene, camera: THREE.Camera) => new RenderPass(scene, camera);

export const getBloomComposer = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera
) => {
  const bloomComposer = new EffectComposer(renderer);
  bloomComposer.renderToScreen = false;
  bloomComposer.addPass(getRenderScene(scene, camera));
  bloomComposer.addPass(bloomPass);
  return bloomComposer;
};

const getMixPass = (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) => {
  const bloomComposer = getBloomComposer(renderer, scene, camera);
  const mixPass = new ShaderPass(
    new THREE.ShaderMaterial({
      uniforms: {
        baseTexture: { value: null },
        bloomTexture: { value: bloomComposer.renderTarget2.texture },
      },
      vertexShader,
      fragmentShader,
      defines: {},
    }),
    "baseTexture"
  );
  mixPass.needsSwap = true;
  return mixPass;
};

export const getOutputPass = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera
) => {
  const outputPass = new OutputPass();
  const finalComposer = new EffectComposer(renderer);
  const renderScene = getRenderScene(scene, camera);
  const mixPass = getMixPass(renderer, scene, camera);
  finalComposer.addPass(renderScene);
  finalComposer.addPass(mixPass);
  finalComposer.addPass(outputPass);
  return finalComposer;
};

export function onPointerDown(
  //   event: MouseEvent,
  node: THREE.Object3D,
  //   camera: THREE.Camera,
  scene: THREE.Scene,
  bloomComposer: EffectComposer,
  finalComposer: EffectComposer
) {
  //   mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  //   mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  //   raycaster.setFromCamera(mouse, camera);
  //   const intersects = raycaster.intersectObjects(scene.children, false);
  //   if (intersects.length > 0) {
  //     const object = intersects[0]!.object;
  node.layers.toggle(BLOOM_SCENE);
  render(scene, bloomComposer, finalComposer);
}

function darkenNonBloomed(obj: THREE.Object3D) {
  // @ts-ignore
  if (obj.isMesh && bloomLayer.test(obj.layers) === false) {
    // @ts-ignore
    materials[obj.uuid] = obj.material;
    // @ts-ignore
    obj.material = darkMaterial;
  }
}

function restoreMaterial(obj: THREE.Object3D) {
  // @ts-ignore
  if (materials[obj.uuid]) {
    // @ts-ignore
    obj.material = materials[obj.uuid];
    // @ts-ignore
    delete materials[obj.uuid];
  }
}

export function render(
  scene: THREE.Scene,
  bloomComposer: EffectComposer,
  finalComposer: EffectComposer
) {
  scene.traverse(darkenNonBloomed);
  bloomComposer.render();
  scene.traverse(restoreMaterial);

  // render the entire scene, then render bloom scene on top
  finalComposer.render();
}
