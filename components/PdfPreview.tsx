import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { SignatureSettings, PageDimensions } from '../types';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.5.136/build/pdf.worker.mjs`;

interface PdfPreviewProps {
  pdfFile: File;
  signatureImage: string | null;
  settings: SignatureSettings;
  onPageInfoChange: (dimensions: PageDimensions, totalPages: number) => void;
  onSettingsChange: (newSettings: SignatureSettings) => void;
}

type InteractionType = 'drag' | 'resize';
type ResizeHandle = 'tl' | 'tr' | 'bl' | 'br';

const LocalSpinner = () => (
    <svg className="animate-spin h-8 w-8 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const PdfPreview: React.FC<PdfPreviewProps> = ({ pdfFile, signatureImage, settings, onPageInfoChange, onSettingsChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const interactiveBoxRef = useRef<HTMLDivElement>(null);
  
  const renderTask = useRef<pdfjsLib.RenderTask | null>(null);
  const signatureImgObject = useRef<HTMLImageElement | null>(null);
  
  const interactionRef = useRef<{
    type: InteractionType;
    handle?: ResizeHandle;
    startX: number;
    startY: number;
    initialSettings: SignatureSettings;
    tempSettings: SignatureSettings;
  } | null>(null);

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [previewTotalPages, setPreviewTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isPdfRendering, setIsPdfRendering] = useState(false);
  const pdfPageInfoRef = useRef<{ page: pdfjsLib.PDFPageProxy; scale: number; } | null>(null);

  const draw = useCallback(() => {
    const mainCanvas = canvasRef.current;
    const bgCanvas = bgCanvasRef.current;
    const ctx = mainCanvas?.getContext('2d');
    const pdfPageInfo = pdfPageInfoRef.current;
    if (!mainCanvas || !bgCanvas || !ctx || !pdfPageInfo) return;

    ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    ctx.drawImage(bgCanvas, 0, 0);

    const settingsToUse = interactionRef.current ? interactionRef.current.tempSettings : settings;
    const { x, y, width, height } = settingsToUse;
    const scale = pdfPageInfo.scale;
    
    const sigX_canvas = x * scale;
    const sigY_canvas = mainCanvas.height - (y * scale) - (height * scale);
    const sigWidth_canvas = width * scale;
    const sigHeight_canvas = height * scale;

    if (signatureImgObject.current) {
        ctx.drawImage(signatureImgObject.current, sigX_canvas, sigY_canvas, sigWidth_canvas, sigHeight_canvas);
    }
    
    const iBox = interactiveBoxRef.current;
    if(iBox){
        iBox.style.left = `${sigX_canvas}px`;
        iBox.style.top = `${sigY_canvas}px`;
        iBox.style.width = `${sigWidth_canvas}px`;
        iBox.style.height = `${sigHeight_canvas}px`;
    }
  }, [settings]);
  
  const renderPdfPage = useCallback(async () => {
    if (!pdfDoc || !bgCanvasRef.current || !containerRef.current) return;
    
    if (renderTask.current) {
      renderTask.current.cancel();
    }
    
    setIsPdfRendering(true);
    
    try {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale: 1 });

        if (currentPage === 1 && totalPages > 0) {
            onPageInfoChange({ width: viewport.width, height: viewport.height }, totalPages);
        }
        
        const { clientWidth } = containerRef.current;
        const fitWidthScale = clientWidth > 0 ? (clientWidth / viewport.width) * 0.95 : 1; 
        const finalScale = fitWidthScale * zoom;
        
        pdfPageInfoRef.current = { page, scale: finalScale };

        const scaledViewport = page.getViewport({ scale: finalScale });

        const bgCanvas = bgCanvasRef.current;
        const mainCanvas = canvasRef.current;
        if (!mainCanvas || !bgCanvas.getContext) return;

        const ctx = bgCanvas.getContext('2d');
        if (!ctx) return;

        bgCanvas.width = scaledViewport.width;
        bgCanvas.height = scaledViewport.height;
        mainCanvas.width = scaledViewport.width;
        mainCanvas.height = scaledViewport.height;

        const renderContext = { canvasContext: ctx, viewport: scaledViewport };
        const task = page.render(renderContext);
        renderTask.current = task;

        await task.promise;
    } catch (e: any) {
        if (e.name !== 'RenderingCancelledException') {
            console.error("Failed to render PDF page", e);
        }
    } finally {
        renderTask.current = null;
        setIsPdfRendering(false);
        draw();
    }
  }, [pdfDoc, currentPage, zoom, totalPages, onPageInfoChange, draw]);

  useEffect(() => {
    const loadPdf = () => {
      setPdfDoc(null);
      setTotalPages(0);
      setCurrentPage(1);
      setZoom(1);
      setIsPreparing(true);

      setTimeout(async () => {
        try {
          const pdfBytes = await pdfFile.arrayBuffer();
          const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
          const doc = await loadingTask.promise;
          
          const realTotalPages = doc.numPages;
          setPdfDoc(doc);
          setTotalPages(realTotalPages);
          setPreviewTotalPages(Math.min(realTotalPages, 5));
        } catch (e) {
          console.error("Failed to load PDF with pdf.js", e);
        } finally {
          setIsPreparing(false);
        }
      }, 50);
    };
    loadPdf();
  }, [pdfFile]);

  useEffect(() => {
    let isMounted = true;
    if (signatureImage) {
      const img = new Image();
      img.src = signatureImage;
      img.onload = () => { if(isMounted) { signatureImgObject.current = img; draw(); }};
      img.onerror = () => { if(isMounted) signatureImgObject.current = null; };
    } else {
      signatureImgObject.current = null;
    }
    return () => { isMounted = false; };
  }, [signatureImage, draw]);

  useEffect(() => {
    if (pdfDoc) {
        renderPdfPage();
    }
  }, [pdfDoc, currentPage, zoom, renderPdfPage]);

  useEffect(() => {
    const handleResize = () => { if(pdfDoc) renderPdfPage(); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pdfDoc, renderPdfPage]);

  useEffect(() => {
      draw();
  }, [settings, draw]);

  const handleInteractionMove = useCallback((e: MouseEvent) => {
    requestAnimationFrame(() => {
      const interaction = interactionRef.current;
      const pdfPageInfo = pdfPageInfoRef.current;
      if (!interaction || !pdfPageInfo) return;
      
      const { type, handle, startX, startY, initialSettings } = interaction;
      const scale = pdfPageInfo.scale;
      const { clientX: currentX, clientY: currentY } = e;

      const dx_canvas = currentX - startX;
      const dy_canvas = currentY - startY;

      let newSettings = { ...initialSettings };
      
      if (type === 'drag') {
          newSettings.x = initialSettings.x + dx_canvas / scale;
          newSettings.y = initialSettings.y - dy_canvas / scale;
      } else if (type === 'resize' && handle && initialSettings.signatureAspectRatio) {
          const aspectRatio = initialSettings.signatureAspectRatio;
          const dx_unscaled = dx_canvas / scale;
          
          let newWidth = initialSettings.width;

          if (handle.includes('r')) {
              newWidth = initialSettings.width + dx_unscaled;
          } else { // 'l'
              newWidth = initialSettings.width - dx_unscaled;
          }
          
          if (newWidth < 10) newWidth = 10;
          
          const newHeight = newWidth / aspectRatio;
          let newX = initialSettings.x;
          let newY = initialSettings.y;

          if (handle.includes('l')) {
              newX = initialSettings.x + initialSettings.width - newWidth;
          }
          
          if (handle.includes('t')) {
               newY = initialSettings.y + initialSettings.height - newHeight;
          }

          newSettings = {
              ...initialSettings,
              width: newWidth,
              height: newHeight,
              x: newX,
              y: newY,
          }
      }
      interaction.tempSettings = newSettings;
      draw();
    });
  }, [draw]);

  const handleInteractionEnd = useCallback(() => {
    if (interactionRef.current) {
        onSettingsChange(interactionRef.current.tempSettings);
    }
    interactionRef.current = null;
    document.body.style.cursor = 'default';
    if(interactiveBoxRef.current) interactiveBoxRef.current.style.borderColor = '';
    window.removeEventListener('mousemove', handleInteractionMove);
    window.removeEventListener('mouseup', handleInteractionEnd);
  }, [onSettingsChange, handleInteractionMove]);

  const handleInteractionStart = useCallback((e: React.MouseEvent<HTMLDivElement>, type: InteractionType, handle?: ResizeHandle) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!containerRef.current || !interactiveBoxRef.current) return;
    
    interactionRef.current = { 
      type, handle, 
      startX: e.clientX, 
      startY: e.clientY, 
      initialSettings: { ...settings },
      tempSettings: { ...settings },
    };
    
    document.body.style.cursor = getComputedStyle(e.currentTarget).cursor;
    interactiveBoxRef.current.style.borderColor = '#60a5fa';
    
    window.addEventListener('mousemove', handleInteractionMove);
    window.addEventListener('mouseup', handleInteractionEnd);
  }, [settings, handleInteractionMove, handleInteractionEnd]);

  const handleWheelResize = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
      if (!settings.signatureAspectRatio) return;
      e.preventDefault();
      e.stopPropagation();

      const scaleFactor = e.deltaY > 0 ? 0.95 : 1.05;
      const newWidth = settings.width * scaleFactor;
      
      if (newWidth < 10) return;

      const newHeight = newWidth / settings.signatureAspectRatio;

      const centerX = settings.x + settings.width / 2;
      const centerY = settings.y + settings.height / 2;

      const newX = centerX - newWidth / 2;
      const newY = centerY - newHeight / 2;

      onSettingsChange({
          ...settings,
          width: newWidth,
          height: newHeight,
          x: newX,
          y: newY,
      });
  }, [settings, onSettingsChange]);

  const goToPrevPage = () => setCurrentPage(p => Math.max(1, p - 1));
  const goToNextPage = () => setCurrentPage(p => Math.min(previewTotalPages, p + 1));
  
  if (isPreparing) {
    return (
      <div className="flex flex-col items-center justify-center text-gray-300 gap-4">
        <LocalSpinner />
        <p className="font-semibold">正在準備文件預覽...</p>
        <p className="text-sm text-gray-400">大型文件可能需要一些時間，請稍候。</p>
      </div>
    );
  }
  
  if (!pdfDoc) return <div className="text-gray-400">正在等待 PDF 檔案...</div>;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-4 touch-none">
      <div ref={containerRef} className="relative w-full h-[calc(100%-4rem)] flex items-center justify-center overflow-auto bg-black/20 rounded-md">
        <div className="relative" style={{ width: canvasRef.current?.width, height: canvasRef.current?.height }}>
            <canvas ref={bgCanvasRef} className="hidden" />
            <canvas ref={canvasRef} className="block absolute top-0 left-0" />
            
            {signatureImage && (
              <div ref={interactiveBoxRef} className="absolute pointer-events-auto border-2 border-dashed border-blue-500/70 hover:border-blue-400" style={{ touchAction: 'none', cursor: 'move' }} onMouseDown={(e) => handleInteractionStart(e, 'drag')} onWheel={handleWheelResize}>
                {(['tl', 'tr', 'bl', 'br'] as ResizeHandle[]).map(handle => (
                  <div key={handle} className={`resize-handle ${handle}`} onMouseDown={(e) => handleInteractionStart(e, 'resize', handle)} />
                ))}
              </div>
            )}
            {isPdfRendering && <div className="absolute inset-0 z-40 flex items-center justify-center text-white bg-gray-900/50">正在渲染預覽頁面...</div>}
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
         {totalPages > 5 && (
            <div className="text-xs text-gray-400 bg-gray-900/60 backdrop-blur-sm px-3 py-1 rounded-full">為提升效能，預覽僅顯示前 5 頁</div>
          )}
        <div className="flex items-center gap-4 bg-gray-900/50 backdrop-blur-sm px-4 py-2 rounded-full">
          <button onClick={() => setZoom(z => z / 1.2)} title="縮小" className="p-1 disabled:opacity-50" disabled={isPdfRendering}><ZoomOut size={20} /></button>
          <button onClick={() => setZoom(1)} title="重設縮放" className="p-1 disabled:opacity-50" disabled={isPdfRendering}><RefreshCw size={18} /></button>
          <button onClick={() => setZoom(z => z * 1.2)} title="放大" className="p-1 disabled:opacity-50" disabled={isPdfRendering}><ZoomIn size={20} /></button>
          <div className="w-px h-5 bg-gray-600 mx-2"></div>
          {previewTotalPages > 1 && (
            <>
              <button onClick={goToPrevPage} disabled={currentPage === 1 || isPdfRendering} className="disabled:opacity-50 disabled:cursor-not-allowed"><ChevronLeft /></button>
              <span className="font-mono">{currentPage} / {previewTotalPages}</span>
              <button onClick={goToNextPage} disabled={currentPage === previewTotalPages || isPdfRendering} className="disabled:opacity-50 disabled:cursor-not-allowed"><ChevronRight /></button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};