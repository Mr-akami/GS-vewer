import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SplatMesh } from '@sparkjsdev/spark';
import { type ISplatViewer } from '../types';

export class SparksViewer implements ISplatViewer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;
  private splatMesh: SplatMesh | null = null;

  constructor(container: HTMLElement) {
    this.container = container;

    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );
    this.camera.position.set(0, 2, 5);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    // Controls setup
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, 0, 0);
    this.controls.enabled = true;
    
    console.log('[Sparks] Controls enabled:', this.controls.enabled);
    console.log('[Sparks] Canvas element:', this.renderer.domElement);

    console.log('[Sparks] Viewer initialized');

    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  async init(): Promise<void> {
    // Sparks doesn't require initialization
  }

  async loadFromFile(file: File): Promise<void> {
    try {
      const url = URL.createObjectURL(file);
      await this.loadSplat(url);
      URL.revokeObjectURL(url);
      console.log('[Sparks] Gaussian splat loaded successfully');
    } catch (error) {
      console.error('[Sparks] Error loading splat file:', error);
      throw error;
    }
  }

  async loadFromURL(url: string): Promise<void> {
    try {
      await this.loadSplat(url);
      console.log('[Sparks] Gaussian splat loaded successfully from URL');
    } catch (error) {
      console.error('[Sparks] Error loading splat from URL:', error);
      throw error;
    }
  }

  private async loadSplat(url: string): Promise<void> {
    // Remove old splat if exists
    if (this.splatMesh) {
      this.scene.remove(this.splatMesh);
      this.splatMesh.dispose();
    }

    console.log('[Sparks] Loading splat from:', url);

    // Create new SplatMesh
    this.splatMesh = new SplatMesh({ url });
    // Set quaternion like in Spark examples
    this.splatMesh.quaternion.set(1, 0, 0, 0);
    this.scene.add(this.splatMesh);
    
    console.log('[Sparks] SplatMesh quaternion:', this.splatMesh.quaternion);
    console.log('[Sparks] SplatMesh rotation:', this.splatMesh.rotation);

    // Wait for splat to load and initialize
    if (this.splatMesh.initialized) {
      await this.splatMesh.initialized;
    }
    
    const adjustCamera = () => {
      if (this.splatMesh) {
        console.log('[Sparks] Splat ready');

        // Set default camera position (SplatMesh bounding box might not work yet)
        const defaultDistance = 5;
        this.camera.position.set(defaultDistance, defaultDistance / 2, defaultDistance);
        this.camera.lookAt(0, 0, 0);
        this.controls.target.set(0, 0, 0);
        this.controls.update();

        console.log('[Sparks] Camera adjusted to:', this.camera.position);
      }
    };
    adjustCamera();
  }

  private updateCount = 0;
  
  update(): void {
    this.updateCount++;
    if (this.updateCount === 1) {
      console.log('[Sparks] First update called');
      console.log('[Sparks] Controls enabled:', this.controls.enabled);
      console.log('[Sparks] Canvas in DOM:', document.body.contains(this.renderer.domElement));
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.controls.dispose();
    this.renderer.dispose();

    if (this.splatMesh) {
      this.scene.remove(this.splatMesh);
      this.splatMesh.dispose();
    }

    this.container.removeChild(this.renderer.domElement);
  }
}
