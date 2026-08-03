export interface CanvasRenderOptions {
  fitMode?: 'contain' | 'cover';
  scale?: number;
  offsetX?: number;
  offsetY?: number;
}

/**
 * High-performance HTML5 Canvas renderer with support for High-DPI (Retina) scaling,
 * aspect ratio fit modes (contain/cover), image smoothing, and transparent clearing.
 */
export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
  }

  /**
   * Resizes physical canvas resolution to match display size multiplied by Device Pixel Ratio (DPR).
   */
  public updateResolution(): { displayWidth: number; displayHeight: number; dpr: number } {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    const targetWidth = Math.floor(rect.width * dpr);
    const targetHeight = Math.floor(rect.height * dpr);

    if (this.canvas.width !== targetWidth || this.canvas.height !== targetHeight) {
      this.canvas.width = targetWidth;
      this.canvas.height = targetHeight;
    }

    return {
      displayWidth: rect.width,
      displayHeight: rect.height,
      dpr,
    };
  }

  /**
   * Renders a given HTMLImageElement onto the canvas maintaining specified fit mode and scale.
   */
  public drawImageFrame(img: HTMLImageElement, options: CanvasRenderOptions = {}): void {
    if (!this.ctx || !img || !img.complete || img.naturalWidth === 0) return;

    const { fitMode = 'contain', scale = 1, offsetX = 0, offsetY = 0 } = options;
    const { displayWidth, displayHeight, dpr } = this.updateResolution();

    const ctx = this.ctx;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Clear transparent canvas frame
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;

    let drawWidth = displayWidth;
    let drawHeight = displayHeight;

    if (fitMode === 'contain') {
      const aspectScale = Math.min(displayWidth / imgWidth, displayHeight / imgHeight);
      drawWidth = imgWidth * aspectScale;
      drawHeight = imgHeight * aspectScale;
    } else {
      const aspectScale = Math.max(displayWidth / imgWidth, displayHeight / imgHeight);
      drawWidth = imgWidth * aspectScale;
      drawHeight = imgHeight * aspectScale;
    }

    // Apply custom scale multiplier (e.g., subtle zoom)
    drawWidth *= scale;
    drawHeight *= scale;

    const drawX = (displayWidth - drawWidth) / 2 + offsetX;
    const drawY = (displayHeight - drawHeight) / 2 + offsetY;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

    ctx.restore();
  }

  /**
   * Clears the canvas buffer entirely.
   */
  public clear(): void {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
