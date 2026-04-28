import { GLTFLoader } from "../../node_modules/three/examples/jsm/loaders/GLTFLoader.js";

export class AssetStore {
  constructor() {
    this.imageCache = new Map();
    this.modelCache = new Map();
    this.gltfLoader = new GLTFLoader();
  }

  getImage(src) {
    if (this.imageCache.has(src)) {
      return this.imageCache.get(src);
    }

    const image = new Image();
    image.src = src;
    this.imageCache.set(src, image);
    return image;
  }

  getModel(src) {
    if (this.modelCache.has(src)) {
      return this.modelCache.get(src);
    }

    const promise = new Promise((resolve, reject) => {
      this.gltfLoader.load(src, resolve, undefined, reject);
    });

    this.modelCache.set(src, promise);
    return promise;
  }
}
