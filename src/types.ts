export interface ISplatViewer {
  init(): Promise<void>;
  loadFromFile(file: File): Promise<void>;
  loadFromURL(url: string): Promise<void>;
  dispose(): void;
  update(): void;
}

export type ViewerType = 'sparks';
