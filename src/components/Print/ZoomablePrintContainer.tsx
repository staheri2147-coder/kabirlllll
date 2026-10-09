import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Sliders } from 'lucide-react';

export interface ZoomablePrintContainerProps {
  elementId?: string;
  className?: string;
  defaultFit?: boolean;
  children: React.ReactNode;
}

export const ZoomablePrintContainer: React.FC<ZoomablePrintContainerProps> = ({
  elementId = 'printable-document',
  className = '',
  defaultFit = true,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastWidthRef = useRef<number>(0);

  // Standard A4 reference in pixels (approx. 210mm at 96 DPI)
  const A4_WIDTH = 800;

  const [zoom, setZoom] = useState<number>(1);
  const [fitScale, setFitScale] = useState<number>(1);
  const [isAutoFit, setIsAutoFit] = useState<boolean>(defaultFit);
  const [naturalHeight, setNaturalHeight] = useState<number>(1130);
  const [showMobileSlider, setShowMobileSlider] = useState<boolean>(false);

  // Calculate the scale required to fit the full A4 width within the current container
  const computeFitScale = useCallback(() => {
    if (!containerRef.current) return 1;
    const containerWidth = containerRef.current.clientWidth;
    // Leave breathing room (12px on mobile, 32px on desktop)
    const padding = containerWidth < 640 ? 12 : 32;
    const availableWidth = Math.max(160, containerWidth - padding);
    const scale = availableWidth / A4_WIDTH;
    // Downscale to fit screen, capped at 1.0
    return Math.min(1.0, Math.max(0.2, Math.round(scale * 100) / 100));
  }, []);

  // Measure content natural height
  const updateNaturalHeight = useCallback(() => {
    if (contentRef.current) {
      const h = contentRef.current.scrollHeight || contentRef.current.offsetHeight;
      if (h > 200) {
        setNaturalHeight(h);
      }
    }
  }, []);

  // Initialize and handle screen resize (only when viewport width actually changes)
  useEffect(() => {
    const handleInitialAndResize = () => {
      if (!containerRef.current) return;
      const currentWidth = containerRef.current.clientWidth;
      const widthChanged = Math.abs(currentWidth - lastWidthRef.current) > 10;
      lastWidthRef.current = currentWidth;

      const newFit = computeFitScale();
      setFitScale(newFit);
      updateNaturalHeight();

      // Only auto-adjust zoom if user is in auto-fit mode AND the container width changed (e.g., orientation change or initial load)
      if (isAutoFit || lastWidthRef.current === 0) {
        setZoom(newFit);
      }
    };

    handleInitialAndResize();

    const handleWindowResize = () => {
      handleInitialAndResize();
    };

    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('orientationchange', handleWindowResize);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('orientationchange', handleWindowResize);
    };
  }, [computeFitScale, isAutoFit, updateNaturalHeight]);

  // Handle Zoom In
  const handleZoomIn = () => {
    setIsAutoFit(false);
    setZoom((prev) => Math.min(3.0, Math.round((prev + 0.15) * 100) / 100));
  };

  // Handle Zoom Out
  const handleZoomOut = () => {
    setIsAutoFit(false);
    setZoom((prev) => Math.max(Math.max(0.2, fitScale * 0.7), Math.round((prev - 0.15) * 100) / 100));
  };

  // Handle Fit to Screen
  const handleFitScreen = () => {
    const newFit = computeFitScale();
    setFitScale(newFit);
    setZoom(newFit);
    setIsAutoFit(true);
    // Center container scroll
    if (containerRef.current) {
      containerRef.current.scrollLeft = 0;
      containerRef.current.scrollTop = 0;
    }
  };

  // Handle 100% Actual Size
  const handleActualSize = () => {
    setIsAutoFit(false);
    setZoom(1.0);
  };

  // Touch Pinch-to-Zoom Support (Gallery Style)
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartZoomRef = useRef<number>(zoom);
  const lastTapTimeRef = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // 2 fingers: Pinch-to-zoom
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      touchStartZoomRef.current = zoom;
    } else if (e.touches.length === 1) {
      // 1 finger: Check for double tap
      const now = Date.now();
      if (now - lastTapTimeRef.current < 300) {
        // Double Tap Detected: Toggle between Fit and 1.5x Zoom
        if (isAutoFit || zoom <= fitScale * 1.1) {
          const targetZoom = Math.min(2.5, Math.max(1.3, fitScale * 2.2));
          setZoom(targetZoom);
          setIsAutoFit(false);
        } else {
          handleFitScreen();
        }
        lastTapTimeRef.current = 0;
      } else {
        lastTapTimeRef.current = now;
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current) {
      e.preventDefault(); // Prevent browser-level pinch zoom of entire HTML page
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / touchStartDistRef.current;
      const newZoom = Math.min(3.0, Math.max(fitScale * 0.7, Math.round(touchStartZoomRef.current * ratio * 100) / 100));
      setZoom(newZoom);
      setIsAutoFit(false);
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = null;
  };

  const displayPercent = Math.round(zoom * 100);

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden relative print:overflow-visible">
      {/* Zoom Control Toolbar (Sticky at top of document preview area) */}
      <div className="no-print shrink-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-2 sm:px-4 py-2 flex items-center justify-between gap-2 z-10 select-none">
        {/* Left / Start: Zoom In / Out Buttons & Percentage */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= fitScale * 0.75}
            className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-40 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 transition active:scale-95 shadow-2xs cursor-pointer"
            title="کوچک‌نمایی (-)"
            aria-label="کوچک‌نمایی"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={isAutoFit ? handleActualSize : handleFitScreen}
            className="px-2.5 h-8 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 flex items-center justify-center font-mono font-bold text-xs text-slate-800 dark:text-slate-200 transition active:scale-95 shadow-2xs cursor-pointer"
            title="تغییر بین نمای کامل و اندازه ۱۰۰٪ (دوبار ضربه روی سند)"
          >
            <span dir="ltr">{displayPercent}%</span>
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 3.0}
            className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-40 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 transition active:scale-95 shadow-2xs cursor-pointer"
            title="بزرگ‌نمایی (+)"
            aria-label="بزرگ‌نمایی"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Mobile slider toggle */}
          <button
            type="button"
            onClick={() => setShowMobileSlider(!showMobileSlider)}
            className={`sm:hidden w-8 h-8 rounded-lg border flex items-center justify-center transition active:scale-95 shadow-2xs cursor-pointer ${
              showMobileSlider
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600'
            }`}
            title="نوار لغزنده زوم"
            aria-label="تنظیم زوم با اسلایدر"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center: Desktop Zoom Slider & Gesture Hint */}
        <div className="hidden md:flex items-center gap-2">
          <span className="text-[11px] text-slate-500 font-mono">{Math.round(fitScale * 100)}%</span>
          <input
            type="range"
            min={Math.round(fitScale * 80)}
            max={250}
            step={5}
            value={displayPercent}
            onChange={(e) => {
              const val = Number(e.target.value) / 100;
              setZoom(val);
              setIsAutoFit(false);
            }}
            className="w-24 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
            title="تنظیم درصد زوم"
          />
          <span className="text-[11px] text-slate-500 font-mono">250%</span>
        </div>

        {/* Right / End: Quick Mode Presets (Fit vs 100%) */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleFitScreen}
            className={`px-2.5 h-8 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer ${
              isAutoFit
                ? 'bg-blue-600 text-white shadow-blue-500/20'
                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
            }`}
            title="تنظیم خودکار جهت نمایش کل صفحه در نمایشگر"
          >
            <Maximize2 className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xs:inline">نمای کامل</span>
            <span className="xs:hidden">کامل</span>
          </button>

          <button
            type="button"
            onClick={handleActualSize}
            className={`px-2.5 h-8 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer ${
              !isAutoFit && Math.abs(zoom - 1.0) < 0.05
                ? 'bg-blue-600 text-white shadow-blue-500/20'
                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
            }`}
            title="نمایش سند در اندازه واقعی استاندارد ۱۰۰٪"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            <span>۱۰۰٪</span>
          </button>
        </div>
      </div>

      {/* Mobile Expandable Zoom Slider */}
      {showMobileSlider && (
        <div className="no-print sm:hidden bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 px-4 py-2 flex items-center justify-between gap-3 animate-fade-in z-10">
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 shrink-0">میزان زوم:</span>
          <input
            type="range"
            min={Math.round(fitScale * 80)}
            max={250}
            step={5}
            value={displayPercent}
            onChange={(e) => {
              const val = Number(e.target.value) / 100;
              setZoom(val);
              setIsAutoFit(false);
            }}
            className="w-full h-2 bg-slate-300 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 shrink-0 min-w-[40px] text-left">
            {displayPercent}%
          </span>
        </div>
      )}

      {/* Mobile Floating Gesture Helper Notice */}
      <div className="no-print sm:hidden absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/80 text-white text-[10px] font-medium px-3 py-1 rounded-full shadow-lg pointer-events-none z-20 backdrop-blur-xs flex items-center gap-1.5 opacity-80 transition-opacity">
        <span>💡 دو بار ضربه یا باز کردن دو انگشت برای بزرگ‌نمایی</span>
      </div>

      {/* Viewport Scroll Canvas */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`zoomable-print-viewport flex-1 overflow-auto p-2 sm:p-6 bg-slate-200/80 dark:bg-slate-900/90 block print:p-0 print:bg-white print:overflow-visible ${className}`}
        style={{
          touchAction: zoom > fitScale * 1.05 ? 'pan-x pan-y' : 'pan-y',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Scaling Sizer Wrapper: defines the geometric box matching scaled size */}
        <div
          className="zoomable-print-sizer relative block print:w-full print:min-w-0 print:h-auto print:static print:m-0"
          style={{
            width: `${Math.round(A4_WIDTH * zoom)}px`,
            minWidth: `${Math.round(A4_WIDTH * zoom)}px`,
            maxWidth: `${Math.round(A4_WIDTH * zoom)}px`,
            height: naturalHeight ? `${Math.round(naturalHeight * zoom) + 40}px` : 'auto',
            transition: touchStartDistRef.current ? 'none' : 'width 0.12s ease-out, height 0.12s ease-out',
            margin: '0 auto',
          }}
        >
          {/* Printable Document Container */}
          <div
            id={elementId}
            ref={contentRef}
            className="zoomable-print-content bg-white text-slate-900 text-xs font-sans p-6 md:p-8 rounded-lg shadow-sm border border-slate-200 print:shadow-none print:border-none print:p-0 print:pt-2 print:pb-12 print:w-full print:min-w-0 print:max-w-none print:transform-none print:static print:m-0"
            style={{
              width: `${A4_WIDTH}px`,
              minWidth: `${A4_WIDTH}px`,
              maxWidth: `${A4_WIDTH}px`,
              position: 'absolute',
              top: 0,
              left: 0,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              transition: touchStartDistRef.current ? 'none' : 'transform 0.12s ease-out',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
