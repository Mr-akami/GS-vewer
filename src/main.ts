import { type ISplatViewer, type ViewerType } from './types';
import { SparksViewer } from './viewers/SparksViewer';

class GaussianSplattingApp {
  private currentViewer: ISplatViewer | null = null;
  private container: HTMLElement;
  private viewerType: ViewerType = 'sparks';
  private animationFrameId: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.initUI();
  }

  private initUI(): void {
    const viewerSelect = document.getElementById('viewer-select') as HTMLSelectElement;
    const loadBtn = document.getElementById('load-btn') as HTMLButtonElement;
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    const loadSampleBtn = document.getElementById('load-sample') as HTMLButtonElement;
    const moveSpeedSlider = document.getElementById('move-speed') as HTMLInputElement;
    const moveSpeedValue = document.getElementById('move-speed-value') as HTMLSpanElement;

    // Viewer type selector
    viewerSelect.addEventListener('change', async (e) => {
      const newViewerType = (e.target as HTMLSelectElement).value as ViewerType;
      await this.switchViewer(newViewerType);
    });

    // Load file button
    loadBtn.addEventListener('click', () => {
      fileInput.click();
    });

    // File input handler
    fileInput.addEventListener('change', async (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        await this.loadFile(files[0]);
      }
    });

    // Load sample button
    loadSampleBtn.addEventListener('click', async () => {
      const sampleURL = 'https://huggingface.co/datasets/dylanebert/3dgs/resolve/main/bonsai/point_cloud/iteration_7000/point_cloud.ply';
      await this.loadURL(sampleURL);
    });

    // Move speed slider
    moveSpeedSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      moveSpeedValue.textContent = value.toFixed(1);
      if (this.currentViewer && 'moveSpeed' in this.currentViewer) {
        (this.currentViewer as any).moveSpeed = value;
      }
    });
  }

  private async switchViewer(newViewerType: ViewerType): Promise<void> {
    if (this.viewerType === newViewerType && this.currentViewer) {
      return; // Already using this viewer
    }

    // Stop animation loop if using Sparks
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Dispose current viewer BEFORE clearing container
    if (this.currentViewer) {
      try {
        this.currentViewer.dispose();
      } catch (error) {
        console.warn('[App] Error disposing viewer:', error);
      }
      this.currentViewer = null;
    }

    // Clear container AFTER dispose
    this.container.innerHTML = '';

    // Create new viewer
    this.viewerType = newViewerType;
    await this.initViewer();

    console.log(`Switched to ${newViewerType} viewer`);
  }

  private async initViewer(): Promise<void> {
    console.log('[App] Initializing viewer:', this.viewerType);
    console.log('[App] Container:', this.container);

    if (this.viewerType === 'sparks') {
      this.currentViewer = new SparksViewer(this.container);
      this.startAnimationLoop();
    }

    if (this.currentViewer) {
      console.log('[App] Calling viewer.init()...');
      await this.currentViewer.init();
      console.log('[App] Viewer initialized');
    }
  }

  private startAnimationLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      if (this.currentViewer) {
        this.currentViewer.update();
      }
    };
    animate();
  }

  private async loadFile(file: File): Promise<void> {
    if (!this.currentViewer) {
      await this.initViewer();
    }

    try {
      await this.currentViewer!.loadFromFile(file);
    } catch (error) {
      alert(`Error loading file. Please ensure it is a valid .ply or .splat file. ${error}`);
    }
  }

  private async loadURL(url: string): Promise<void> {
    console.log('[App] loadURL called:', url);
    if (!this.currentViewer) {
      console.log('[App] No viewer exists, initializing...');
      await this.initViewer();
    }

    try {
      console.log('[App] Calling viewer.loadFromURL...');
      await this.currentViewer!.loadFromURL(url);
      console.log('[App] Load complete');
    } catch (error) {
      console.error('[App] Load error:', error);
      alert(`Error loading sample file. ${error}`);
    }
  }

  public async start(): Promise<void> {
    await this.initViewer();
  }
}

// Initialize the application
const container = document.getElementById('canvas-container') as HTMLElement;
const app = new GaussianSplattingApp(container);
app.start();
