export interface SignatureSettings {
  x: number;
  y: number;
  width: number;
  height: number;
  pageInterval: number;
  startPage: number;
  signatureAspectRatio?: number | null;
}

export interface PageDimensions {
  width: number;
  height: number;
}
