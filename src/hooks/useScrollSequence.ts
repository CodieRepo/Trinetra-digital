import { useState, useEffect, useRef, useCallback } from 'react';
import { CanvasRenderer, CanvasRenderOptions } from '../utils/CanvasRenderer';

export interface UseScrollSequenceOptions {
  totalFrames?: number;
  framePrefix?: string;
  frameExtension?: string;
  lazyLoad?: boolean;
  fitMode?: 'contain' | 'cover';
}

export interface UseScrollSequenceReturn {
  images: HTMLImageElement[];
  loadedCount: number;
  progress: number;
  isLoaded: boolean;
  drawFrame: (frameIndex: number, renderOptions?: CanvasRenderOptions) => void;
  currentFrame: number;
}

/**
 * Custom hook for preloading an image sequence into memory and scheduling crisp, 60 FPS
 * HTML5 Canvas draw calls using requestAnimationFrame and CanvasRenderer.
 */
export const useScrollSequence = (
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  containerRef: React.RefObject<HTMLElement | null>,
  options: UseScrollSequenceOptions = {}
): UseScrollSequenceReturn => {
  const {
    totalFrames = 301,
    framePrefix = '/hero-sequence/frame_',
    frameExtension = '.png',
    lazyLoad = true,
    fitMode = 'contain',
  } = options;

  const [loadedCount, setLoadedCount] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  const imagesRef = useRef<HTMLImageElement[]>([]);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const currentFrameRef = useRef<number>(1);
  const animationFrameIdRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const hasStartedLoadingRef = useRef<boolean>(false);

  // Preload frame images
  const startPreloading = useCallback(() => {
    if (hasStartedLoadingRef.current) return;
    hasStartedLoadingRef.current = true;

    const images: HTMLImageElement[] = new Array(totalFrames);
    let loaded = 0;

    for (let i = 1; i <= totalFrames; i++) {
      const paddedIndex = String(i).padStart(3, '0');
      const src = `${framePrefix}${paddedIndex}${frameExtension}`;

      const img = new Image();
      img.crossOrigin = 'anonymous';

      const handleLoadOrError = (frameIndex: number) => {
        if (!isMountedRef.current) return;
        loaded++;
        setLoadedCount(loaded);
        const percent = Math.min(100, Math.floor((loaded / totalFrames) * 100));
        setProgress(percent);

        // Instantly unlock UI as soon as Frame 1 loads!
        if (frameIndex === 1 || loaded >= 1) {
          setIsLoaded(true);
        }
      };

      img.onload = () => handleLoadOrError(i);
      img.onerror = () => {
        console.warn(`[useScrollSequence] Failed frame load at index ${i}: ${src}`);
        handleLoadOrError(i);
      };

      img.src = src;
      images[i - 1] = img;
    }

    imagesRef.current = images;
  }, [totalFrames, framePrefix, frameExtension]);

  // Viewport Lazy loading via IntersectionObserver
  useEffect(() => {
    isMountedRef.current = true;

    if (!lazyLoad || !containerRef.current) {
      startPreloading();
      return;
    }

    const containerEl = containerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          startPreloading();
          observer.disconnect();
        }
      },
      { rootMargin: '300px 0px 300px 0px', threshold: 0.01 }
    );

    observer.observe(containerEl);

    return () => {
      observer.disconnect();
    };
  }, [containerRef, lazyLoad, startPreloading]);

  // Canvas drawing handler
  const drawFrameOnCanvas = useCallback(
    (frameIndex: number, renderOptions: CanvasRenderOptions = {}) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (!rendererRef.current) {
        rendererRef.current = new CanvasRenderer(canvas);
      }

      const clampedIndex = Math.max(1, Math.min(totalFrames, Math.round(frameIndex)));
      const img = imagesRef.current[clampedIndex - 1];

      if (!img || !img.complete || img.naturalWidth === 0) return;

      rendererRef.current.drawImageFrame(img, {
        fitMode,
        ...renderOptions,
      });
    },
    [canvasRef, totalFrames, fitMode]
  );

  // Schedule draw using requestAnimationFrame
  const drawFrame = useCallback(
    (frameIndex: number, renderOptions?: CanvasRenderOptions) => {
      currentFrameRef.current = frameIndex;

      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }

      animationFrameIdRef.current = requestAnimationFrame(() => {
        drawFrameOnCanvas(currentFrameRef.current, renderOptions);
        animationFrameIdRef.current = null;
      });
    },
    [drawFrameOnCanvas]
  );

  // Redraw on window resize or initial load
  useEffect(() => {
    if (isLoaded) {
      drawFrame(currentFrameRef.current);
    }

    const handleResize = () => {
      if (rendererRef.current) {
        rendererRef.current.updateResolution();
      }
      drawFrame(currentFrameRef.current);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('resize', handleResize);
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [isLoaded, drawFrame]);

  return {
    images: imagesRef.current,
    loadedCount,
    progress,
    isLoaded,
    drawFrame,
    currentFrame: currentFrameRef.current,
  };
};
