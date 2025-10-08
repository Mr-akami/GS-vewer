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
  private keyState: { [key: string]: boolean } = {};
  public moveSpeed = 1.0; // Make public so it can be accessed from main.ts
  private gamepadIndex: number | null = null;
  private initialCameraPosition = new THREE.Vector3();
  private initialCameraTarget = new THREE.Vector3();

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
    
    // Handle keyboard input
    this.setupKeyboardControls();
    
    // Handle gamepad input
    this.setupGamepadControls();
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public resetCamera(): void {
    this.camera.position.copy(this.initialCameraPosition);
    this.controls.target.copy(this.initialCameraTarget);
    this.camera.lookAt(this.controls.target);
    this.controls.update();
    console.log('[Sparks] Camera reset to initial position');
  }

  private setupKeyboardControls(): void {
    const onKeyDown = (event: KeyboardEvent) => {
      // R key to reset camera
      if (event.key.toLowerCase() === 'r') {
        this.resetCamera();
        return;
      }
      this.keyState[event.key.toLowerCase()] = true;
    };

    const onKeyUp = (event: KeyboardEvent) => {
      this.keyState[event.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
  }

  private setupGamepadControls(): void {
    window.addEventListener('gamepadconnected', (e) => {
      const gamepad = (e as GamepadEvent).gamepad;
      this.gamepadIndex = gamepad.index;
      console.log('[Sparks] Gamepad connected:', gamepad.id);
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      const gamepad = (e as GamepadEvent).gamepad;
      if (this.gamepadIndex === gamepad.index) {
        this.gamepadIndex = null;
        console.log('[Sparks] Gamepad disconnected');
      }
    });
  }

  private updateGamepadMovement(): void {
    if (this.gamepadIndex === null) return;

    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[this.gamepadIndex];
    if (!gamepad) return;

    // Xbox controller mapping:
    // Axes: 0=Left stick X, 1=Left stick Y, 2=Right stick X, 3=Right stick Y
    const deadzone = 0.15;
    const leftStickX = Math.abs(gamepad.axes[0]) > deadzone ? gamepad.axes[0] : 0;
    const leftStickY = Math.abs(gamepad.axes[1]) > deadzone ? gamepad.axes[1] : 0;
    const rightStickX = Math.abs(gamepad.axes[2]) > deadzone ? gamepad.axes[2] : 0;
    const rightStickY = Math.abs(gamepad.axes[3]) > deadzone ? gamepad.axes[3] : 0;

    // Buttons: 0=A, 1=B, 2=X, 4=LB, 5=RB, 6=LT, 7=RT, 9=Left Stick Click
    const buttonA = gamepad.buttons[0]?.pressed;
    const buttonB = gamepad.buttons[1]?.pressed;
    const buttonX = gamepad.buttons[2]?.pressed;
    const buttonLB = gamepad.buttons[4]?.pressed;
    const buttonRB = gamepad.buttons[5]?.pressed;
    const buttonLT = gamepad.buttons[6]?.pressed;
    const buttonRT = gamepad.buttons[7]?.pressed;

    // X button to reset camera
    if (buttonX) {
      this.resetCamera();
      return;
    }

    const direction = new THREE.Vector3();
    const right = new THREE.Vector3();

    // Get camera directions
    this.camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();
    right.crossVectors(this.camera.up, direction).normalize();

    // Left stick for movement (forward/backward/strafe)
    if (leftStickY !== 0) {
      this.camera.position.addScaledVector(direction, -leftStickY * this.moveSpeed);
      this.controls.target.addScaledVector(direction, -leftStickY * this.moveSpeed);
    }
    if (leftStickX !== 0) {
      this.camera.position.addScaledVector(right, -leftStickX * this.moveSpeed);
      this.controls.target.addScaledVector(right, -leftStickX * this.moveSpeed);
    }

    // A/B buttons for up/down
    if (buttonA) {
      this.camera.position.y += this.moveSpeed;
      this.controls.target.y += this.moveSpeed;
    }
    if (buttonB) {
      this.camera.position.y -= this.moveSpeed;
      this.controls.target.y -= this.moveSpeed;
    }

    // RT/LT for zoom in (move camera closer to target)
    if (buttonRT || buttonLT) {
      const offset = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
      const distance = offset.length();
      const zoomSpeed = this.moveSpeed * 0.5;
      
      if (buttonRT && distance > 0.5) {
        // Zoom in
        offset.multiplyScalar((distance - zoomSpeed) / distance);
        this.camera.position.copy(this.controls.target).add(offset);
      }
      if (buttonLT) {
        // Zoom out
        offset.multiplyScalar((distance + zoomSpeed) / distance);
        this.camera.position.copy(this.controls.target).add(offset);
      }
    }

    // RB/LB for camera pull (move camera away from target)
    if (buttonRB || buttonLB) {
      const offset = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
      const distance = offset.length();
      const pullSpeed = this.moveSpeed * 0.5;
      
      if (buttonRB && distance > 0.5) {
        // Pull camera closer
        offset.multiplyScalar((distance - pullSpeed) / distance);
        this.camera.position.copy(this.controls.target).add(offset);
      }
      if (buttonLB) {
        // Push camera further
        offset.multiplyScalar((distance + pullSpeed) / distance);
        this.camera.position.copy(this.controls.target).add(offset);
      }
    }

    // Right stick for camera rotation
    if (rightStickX !== 0 || rightStickY !== 0) {
      // Rotate camera around the target
      const rotationSpeed = 0.05 * (this.moveSpeed / 1.0); // Scale with moveSpeed
      
      // Horizontal rotation (around Y axis)
      const horizontalAngle = -rightStickX * rotationSpeed;
      const offset = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), horizontalAngle);
      this.camera.position.copy(this.controls.target).add(offset);
      
      // Vertical rotation (around right axis)
      const verticalAngle = -rightStickY * rotationSpeed;
      offset.applyAxisAngle(right, verticalAngle);
      this.camera.position.copy(this.controls.target).add(offset);
      
      this.camera.lookAt(this.controls.target);
    }
  }

  private updateCameraMovement(): void {
    const direction = new THREE.Vector3();
    const right = new THREE.Vector3();
    
    // Get camera forward direction (ignore Y component for horizontal movement)
    this.camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();
    
    // Get camera right direction
    right.crossVectors(this.camera.up, direction).normalize();
    
    // WASD movement
    if (this.keyState['w']) {
      this.camera.position.addScaledVector(direction, this.moveSpeed);
      this.controls.target.addScaledVector(direction, this.moveSpeed);
    }
    if (this.keyState['s']) {
      this.camera.position.addScaledVector(direction, -this.moveSpeed);
      this.controls.target.addScaledVector(direction, -this.moveSpeed);
    }
    if (this.keyState['a']) {
      this.camera.position.addScaledVector(right, this.moveSpeed);
      this.controls.target.addScaledVector(right, this.moveSpeed);
    }
    if (this.keyState['d']) {
      this.camera.position.addScaledVector(right, -this.moveSpeed);
      this.controls.target.addScaledVector(right, -this.moveSpeed);
    }
    
    // Space / Shift for up/down movement
    if (this.keyState[' ']) {
      this.camera.position.y += this.moveSpeed;
      this.controls.target.y += this.moveSpeed;
    }
    if (this.keyState['shift']) {
      this.camera.position.y -= this.moveSpeed;
      this.controls.target.y -= this.moveSpeed;
    }
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

        // Save initial camera position
        this.initialCameraPosition.copy(this.camera.position);
        this.initialCameraTarget.copy(this.controls.target);

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
    
    // Update camera movement based on keyboard input
    this.updateCameraMovement();
    
    // Update camera movement based on gamepad input
    this.updateGamepadMovement();
    
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
