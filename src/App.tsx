/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RotateCcw, 
  ChevronRight, 
  CheckCircle2, 
  Circle, 
  MousePointer2, 
  ZoomIn, 
  ZoomOut,
  Monitor,
  Smartphone,
  Plus,
  Minus
} from 'lucide-react';
import { FLOW_DATA } from './flowData';

interface ActiveStep {
  id: string | number;
  selectedOptionIndices: number[];
  buttonRefs: React.RefObject<HTMLButtonElement | null>[];
  lastClickedContinue?: 'top' | 'bottom' | null;
}

export default function App() {
  const [activePath, setActivePath] = useState<ActiveStep[]>([
    { id: 10, selectedOptionIndices: [], buttonRefs: [] }
  ]);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lines, setLines] = useState<{ d: string; id: string; x1: number; y1: number; x2: number; y2: number }[]>([]);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  
  const [baseMobileScale, setBaseMobileScale] = useState(2);
  
  const viewportRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const lastTouchDistance = useRef<number | null>(null);

  // Auto-scroll to new steps in mobile mode
  useEffect(() => {
    if (viewMode === 'mobile' && boardRef.current && activePath.length > 1) {
      // Use a small timeout to allow the new step to be rendered
      const timer = setTimeout(() => {
        const steps = boardRef.current?.querySelectorAll('.glass-card');
        if (steps && steps.length > 0) {
          const lastStep = steps[steps.length - 1];
          lastStep.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activePath.length, viewMode]);

  // Adaptable mobile zoom calculation
  useEffect(() => {
    const updateMobileScale = () => {
      if (viewMode === 'mobile') {
        const screenWidth = window.innerWidth;
        
        // Calibrated scale that matches the "perfect" look on Redmi Note 13
        // This ensures the card maintains the exact same proportion relative to the screen on any device
        const idealMobileScale = 1.85; 
        
        let targetScale;
        if (screenWidth >= 1024) {
          // On desktop preview, we use 1.0 (half of mobile zoom) as requested
          targetScale = 1.0;
        } else if (screenWidth <= 480) {
          // On all mobile devices, use the constant ideal scale to maintain proportion
          targetScale = idealMobileScale;
        } else {
          // Smooth transition for intermediate tablet sizes
          const t = (screenWidth - 480) / (1024 - 480);
          targetScale = idealMobileScale + t * (1.0 - idealMobileScale);
        }
        
        const finalScale = Math.max(0.5, Math.min(4, targetScale));
        setBaseMobileScale(finalScale);
        setScale(finalScale);
        setPosition({ x: 0, y: 0 });
      } else {
        setScale(1);
        setPosition({ x: 50, y: 50 });
      }
    };

    updateMobileScale();
    window.addEventListener('resize', updateMobileScale);
    return () => window.removeEventListener('resize', updateMobileScale);
  }, [viewMode]);

  // Device detection
  useEffect(() => {
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const isSmallScreen = window.innerWidth < 1024;
    const isMobile = isMobileUA || (isTouch && isSmallScreen);
    
    setViewMode(isMobile ? 'mobile' : 'desktop');
  }, []);

  // Reset view state when mode changes
  useEffect(() => {
    // Logic moved to updateMobileScale useEffect
  }, [viewMode]);

  // Handle zooming
  const handleWheel = (e: React.WheelEvent) => {
    if (viewMode === 'mobile') return; // Disable zoom via wheel in mobile scroll mode if preferred, or keep it
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((prev: number) => Math.min(Math.max(prev + delta, 0.4), 8));
  };

  // Handle dragging (Mouse)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (viewMode === 'mobile') return;
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (viewMode === 'mobile' || !isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Handle dragging (Touch)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (viewMode === 'mobile') {
      if (e.touches.length === 2) {
        const distance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        lastTouchDistance.current = distance;
      }
      return;
    }

    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ 
        x: e.touches[0].clientX - position.x, 
        y: e.touches[0].clientY - position.y 
      });
    } else if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDistance.current = distance;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (viewMode === 'mobile') {
      if (e.touches.length === 2 && lastTouchDistance.current !== null) {
        const distance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const delta = (distance - lastTouchDistance.current) * 0.005;
        setScale((prev: number) => Math.min(Math.max(prev + delta, 0.4), 8));
        lastTouchDistance.current = distance;
      }
      return;
    }

    if (e.touches.length === 1 && isDragging) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    } else if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = (distance - lastTouchDistance.current) * 0.005;
      setScale((prev: number) => Math.min(Math.max(prev + delta, 0.4), 8));
      lastTouchDistance.current = distance;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    lastTouchDistance.current = null;
  };

  // Calculate curved lines
  const updateLines = useCallback(() => {
    if (!svgRef.current || activePath.length < 2 || !boardRef.current) {
      setLines([]);
      return;
    }

    const newLines: { d: string; id: string; x1: number; y1: number; x2: number; y2: number }[] = [];
    const boardRect = boardRef.current.getBoundingClientRect();

    // Iterate through steps to connect them
    for (let i = 0; i < activePath.length - 1; i++) {
      const currentStep = activePath[i];
      const nextStep = activePath[i + 1];
      
      const currentCol = boardRef.current.children[i] as HTMLElement;
      const nextCol = boardRef.current.children[i + 1] as HTMLElement;

      if (currentCol && nextCol) {
        const r1_card = currentCol.getBoundingClientRect();
        const r2_card = nextCol.getBoundingClientRect();

        let x1, y1, x2, y2, d;

        if (viewMode === 'mobile') {
          // Mobile: Bottom of current card to top of next card
          // Coordinates are relative to the SVG which is now inside boardRef
          x1 = (r1_card.left + r1_card.width / 2 - boardRect.left) / scale;
          y1 = (r1_card.bottom - boardRect.top) / scale;
          
          x2 = (r2_card.left + r2_card.width / 2 - boardRect.left) / scale;
          y2 = (r2_card.top - boardRect.top) / scale;

          const cp1y = y1 + (y2 - y1) * 0.5;
          const cp2y = y1 + (y2 - y1) * 0.5;
          d = `M ${x1} ${y1} C ${x1} ${cp1y}, ${x2} ${cp2y}, ${x2} ${y2}`;
        } else {
          // Desktop: Right side of option to left side of next card
          let startBtn;
          if (currentStep.selectedOptionIndices.length > 0) {
            const currentIdx = currentStep.selectedOptionIndices[currentStep.selectedOptionIndices.length - 1];
            startBtn = currentStep.buttonRefs[currentIdx]?.current;
          } else if (currentStep.lastClickedContinue === 'top') {
            startBtn = currentStep.buttonRefs[998]?.current;
          } else {
            startBtn = currentStep.buttonRefs[999]?.current;
          }
          
          const nextIdx = nextStep.selectedOptionIndices[0];
          const endBtn = nextStep.buttonRefs[nextIdx]?.current;

          if (startBtn) {
            const r1 = startBtn.getBoundingClientRect();
            const r2 = endBtn ? endBtn.getBoundingClientRect() : nextCol.getBoundingClientRect();

            x1 = (r1.right - boardRect.left) / scale;
            y1 = (r1.top + r1.height / 2 - boardRect.top) / scale;

            x2 = (r2.left - boardRect.left) / scale;
            y2 = endBtn 
              ? (r2.top + r2.height / 2 - boardRect.top) / scale 
              : (r2.top + 40 - boardRect.top) / scale;

            const cp1x = x1 + (x2 - x1) * 0.4;
            const cp2x = x1 + (x2 - x1) * 0.6;
            d = `M ${x1} ${y1} C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`;
          } else {
            continue;
          }
        }

        newLines.push({ 
          d, 
          id: `line-${i}-${currentStep.id}-${nextStep.id}`,
          x1, y1, x2, y2
        });
      }
    }
    setLines(newLines);
  }, [activePath, scale, viewMode]);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      updateLines();
    });

    if (boardRef.current) {
      observer.observe(boardRef.current);
    }

    updateLines();
    window.addEventListener('resize', updateLines);
    
    // Multiple checks to ensure layout is stable
    const timer1 = setTimeout(updateLines, 50);
    const timer2 = setTimeout(updateLines, 300);
    const timer3 = setTimeout(updateLines, 600);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateLines);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [activePath, scale, updateLines]);

  // Handle option selection
  const handleSelect = (stepIdx: number, optionIdx: number, nextStepId?: string | number) => {
    const step = FLOW_DATA[activePath[stepIdx].id];
    
    let newPath = [...activePath].slice(0, stepIdx + 1);
    const currentActive = { ...newPath[stepIdx] };

    if (step.type === 'multi') {
      if (currentActive.selectedOptionIndices.includes(optionIdx)) {
        currentActive.selectedOptionIndices = currentActive.selectedOptionIndices.filter((i: number) => i !== optionIdx);
      } else {
        currentActive.selectedOptionIndices = [...currentActive.selectedOptionIndices, optionIdx];
      }
      newPath[stepIdx] = currentActive;
      
      // For multi, we only proceed if there's a next step defined and at least one selected
      if (currentActive.selectedOptionIndices.length > 0 && step.next) {
        newPath.push({ id: step.next, selectedOptionIndices: [], buttonRefs: [] });
      } else if (currentActive.lastClickedContinue && step.next) {
        newPath.push({ id: step.next, selectedOptionIndices: [], buttonRefs: [] });
      }
    } else {
      currentActive.selectedOptionIndices = [optionIdx];
      newPath[stepIdx] = currentActive;
      if (nextStepId && nextStepId !== 'final') {
        newPath.push({ id: nextStepId, selectedOptionIndices: [], buttonRefs: [] });
      } else if (nextStepId === 'final') {
        newPath.push({ id: 'final', selectedOptionIndices: [], buttonRefs: [] });
      }
    }
    setActivePath(newPath);
  };

  const handleContinue = (stepIdx: number, position: 'top' | 'bottom') => {
    const step = FLOW_DATA[activePath[stepIdx].id];
    let newPath = [...activePath].slice(0, stepIdx + 1);
    const currentActive = { ...newPath[stepIdx] };
    
    currentActive.lastClickedContinue = position;
    newPath[stepIdx] = currentActive;
    
    if (step.next) {
      newPath.push({ id: step.next, selectedOptionIndices: [], buttonRefs: [] });
      setActivePath(newPath);
    }
  };

  const reset = () => {
    setActivePath([{ id: 10, selectedOptionIndices: [], buttonRefs: [] }]);
    if (viewMode === 'mobile') {
      setScale(baseMobileScale);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(1);
      setPosition({ x: 50, y: 50 });
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-screen bg-slate-50 font-sans select-none overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-8 py-4 md:py-3 bg-white border-b border-slate-200 z-50 shadow-sm relative min-h-28 md:min-h-16 flex-shrink-0">
        <div className="flex items-center gap-4 md:gap-3">
          <img 
            src="/ae-logo.jpeg" 
            alt="NEGOCIAAE Logo" 
            className="w-12 h-12 md:w-10 md:h-10 rounded-lg md:rounded-xl object-cover shadow-sm"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-800">NEGOCIAAE</h1>
        </div>
        
        {/* Banner centralizado - Visível se houver espaço suficiente */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:block">
          <img 
            src="/ae-banner.png" 
            alt="AE Banner" 
            className="h-10 object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        
        {/* Banner simplificado para mobile - opcional, mas vamos tentar manter o header limpo */}
        
        <div className="flex items-center gap-2 md:gap-4">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1 md:p-1 border border-slate-200">
            <button 
              onClick={() => setViewMode('desktop')}
              className={`p-2 md:p-1.5 rounded-md transition-all flex items-center gap-1.5 px-2 md:px-2 ${viewMode === 'desktop' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              title="Versão Desktop"
            >
              <Monitor size={20} className="md:w-4 md:h-4" />
              <span className="text-[12px] md:text-[10px] font-bold uppercase hidden md:inline">Desktop</span>
            </button>
            <button 
              onClick={() => setViewMode('mobile')}
              className={`p-2 md:p-1.5 rounded-md transition-all flex items-center gap-1.5 px-2 md:px-2 ${viewMode === 'mobile' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              title="Versão Mobile"
            >
              <Smartphone size={20} className="md:w-4 md:h-4" />
              <span className="text-[12px] md:text-[10px] font-bold uppercase hidden md:inline">Mobile</span>
            </button>
          </div>

          <div className="flex items-center bg-slate-100 rounded-lg p-1 md:p-1 border border-slate-200">
            <button 
              onClick={() => setScale((s: number) => Math.max(s - 0.1, 0.4))}
              className="p-2 md:p-1.5 hover:bg-white rounded-md text-slate-600 transition-colors"
            >
              {viewMode === 'mobile' ? <Minus size={24} /> : <ZoomOut size={18} />}
            </button>
            <span className="px-2 md:px-3 text-[14px] md:text-xs font-mono font-medium text-slate-500 min-w-12 md:min-w-15 text-center">
              {viewMode === 'mobile' ? Math.round((scale / baseMobileScale) * 100) : Math.round(scale * 100)}%
            </span>
            <button 
              onClick={() => setScale((s: number) => Math.min(s + 0.1, 8))}
              className="p-2 md:p-1.5 hover:bg-white rounded-md text-slate-600 transition-colors"
            >
              {viewMode === 'mobile' ? <Plus size={24} /> : <ZoomIn size={18} />}
            </button>
          </div>
          
          <button 
            onClick={reset}
            className="flex items-center gap-2 px-4 md:px-4 py-2.5 md:py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RotateCcw size={24} className="md:w-4 md:h-4" />
            {viewMode === 'mobile' ? null : <span className="hidden sm:inline">Reiniciar</span>}
          </button>
        </div>
      </header>

      {/* Main Viewport */}
      <div 
        ref={viewportRef}
        className={`flex-1 relative flow-bg w-full max-w-full ${
          viewMode === 'mobile' 
            ? 'overflow-y-auto overflow-x-hidden' 
            : 'overflow-hidden cursor-grab active:cursor-grabbing touch-none'
        }`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          ref={boardRef}
          className={`flex ${
            viewMode === 'mobile' 
              ? 'relative flex-col gap-12 md:gap-32 px-2 py-6 md:p-8 items-center w-fit mx-auto origin-top' 
              : 'absolute top-0 left-0 flex-row gap-24 p-20 origin-top-left'
          }`}
          style={{ 
            transform: viewMode === 'mobile' ? `scale(${scale})` : `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          {viewMode === 'mobile' && (
            <div className="w-full flex justify-center mb-4">
              <img 
                src="/ae-banner.png" 
                alt="AE Banner" 
                className="w-[80vw] max-w-[300px] object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
          <AnimatePresence mode="popLayout">
            {activePath.map((activeStep, stepIdx) => {
              const step = FLOW_DATA[activeStep.id];
              if (!step) return null;

              return (
                <motion.div
                  key={`${activeStep.id}-${stepIdx}`}
                  initial={{ opacity: 0, x: 50, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -50, scale: 0.95 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                  className={`glass-card flex flex-col h-fit transition-all ${
                    viewMode === 'mobile' 
                      ? 'p-4 w-[96vw] max-w-[420px] gap-3' 
                      : 'p-6 min-w-70 gap-4'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-bold tracking-widest text-blue-700 uppercase bg-blue-50 px-2 py-1 rounded ${
                      viewMode === 'mobile' ? 'text-[8px]' : 'text-[10px]'
                    }`}>
                      {step.cat}
                    </span>
                    <div className="w-2 h-2 rounded-full bg-slate-200" />
                  </div>
                  
                  <h3 className={`text-slate-800 font-semibold leading-tight ${
                    viewMode === 'mobile' ? 'text-base' : 'text-lg'
                  }`}>
                    {step.q}
                  </h3>

                  <div className="flex flex-col gap-2 mt-2">
                    {step.type === 'final' ? (
                      <button
                        onClick={reset}
                        className={`w-full py-3 px-4 bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 hover:bg-emerald-600 ${
                          viewMode === 'mobile' ? 'text-sm' : ''
                        }`}
                      >
                        <RotateCcw size={viewMode === 'mobile' ? 16 : 18} />
                        REINICIAR FLUXO
                      </button>
                    ) : (step.type as string) === 'info' ? (
                      <div className="flex flex-col gap-2">
                        <div className={`grid gap-2 ${
                          viewMode === 'mobile' && step.options && step.options.length > 4
                            ? 'grid-cols-2' 
                            : 'grid-cols-1'
                        }`}>
                          {step.options?.map((opt, optIdx) => (
                            <div 
                              key={optIdx}
                              className={`w-full bg-slate-50 text-slate-500 border border-slate-100 rounded-lg font-medium flex items-center ${
                                viewMode === 'mobile' ? 'py-2 px-3 text-[10px]' : 'py-2.5 px-4 text-xs'
                              }`}
                            >
                              {opt.txt}
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end mt-4">
                          <button
                            onClick={() => handleSelect(stepIdx, 0, step.next)}
                            className={`bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-blue-800 transition-all shadow-lg shadow-blue-100 ${
                              viewMode === 'mobile' ? 'px-4 py-2 text-sm' : 'px-6 py-2.5'
                            }`}
                          >
                            Continuar
                            <ChevronRight size={viewMode === 'mobile' ? 16 : 18} />
                          </button>
                        </div>
                      </div>
                    ) : step.type === 'text' ? (
                      (() => {
                        if (!activeStep.buttonRefs[0]) {
                          activeStep.buttonRefs[0] = React.createRef<HTMLButtonElement | null>();
                        }
                        return (
                          <button
                            ref={activeStep.buttonRefs[0]}
                            onClick={() => handleSelect(stepIdx, 0, step.next)}
                            className={`w-full rounded-xl font-medium text-left flex items-center justify-between group transition-all ${
                              viewMode === 'mobile' ? 'py-2.5 px-3.5 text-sm' : 'py-3 px-4'
                            } ${
                              activeStep.selectedOptionIndices.includes(0)
                                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-200'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'
                            }`}
                          >
                            <span>Preencher campo</span>
                            <ChevronRight size={viewMode === 'mobile' ? 16 : 18} className={activeStep.selectedOptionIndices.includes(0) ? 'text-white' : 'text-slate-400'} />
                          </button>
                        );
                      })()
                    ) : (
                      <div className="flex flex-col gap-2">
                        {/* Top Continue Button for step 52 */}
                        {activeStep.id === 52 && (
                          <div className="flex justify-end mb-1">
                            {(() => {
                              if (!activeStep.buttonRefs[998]) {
                                activeStep.buttonRefs[998] = React.createRef<HTMLButtonElement | null>();
                              }
                              return (
                                <button
                                  ref={activeStep.buttonRefs[998]}
                                  onClick={() => handleContinue(stepIdx, 'top')}
                                  className={`bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-blue-800 transition-all shadow-lg shadow-blue-100 ${
                                    viewMode === 'mobile' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm'
                                  }`}
                                >
                                  Continuar
                                  <ChevronRight size={viewMode === 'mobile' ? 14 : 16} />
                                </button>
                              );
                            })()}
                          </div>
                        )}

                        <div className={`grid gap-2 ${
                          viewMode === 'mobile' && step.options && step.options.length > 4
                            ? 'grid-cols-2' 
                            : 'grid-cols-1'
                        }`}>
                          {step.options?.map((opt, optIdx) => {
                            const isSelected = activeStep.selectedOptionIndices.includes(optIdx);
                            
                            // Initialize ref if not exists
                            if (!activeStep.buttonRefs[optIdx]) {
                              activeStep.buttonRefs[optIdx] = React.createRef<HTMLButtonElement | null>();
                            }

                            return (
                              <button
                                key={optIdx}
                                ref={activeStep.buttonRefs[optIdx]}
                                onClick={() => handleSelect(stepIdx, optIdx, opt.next)}
                                className={`w-full rounded-xl font-medium text-left flex items-center justify-between group transition-all ${
                                  viewMode === 'mobile' ? 'py-2 px-3 text-[11px]' : 'py-3 px-4'
                                } ${
                                  isSelected
                                    ? 'bg-blue-700 text-white shadow-md'
                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {step.type === 'multi' ? (
                                    isSelected ? <CheckCircle2 size={viewMode === 'mobile' ? 14 : 18} /> : <Circle size={viewMode === 'mobile' ? 14 : 18} className="text-slate-300" />
                                  ) : null}
                                  <span className="line-clamp-2">{opt.txt}</span>
                                </div>
                                {viewMode !== 'mobile' && (
                                  <ChevronRight 
                                    size={18} 
                                    className={`transition-transform duration-300 ${
                                      isSelected ? 'translate-x-1 text-white' : 'text-slate-300 group-hover:text-slate-400'
                                    }`} 
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Bottom Continue Button for step 52 */}
                        {activeStep.id === 52 && (
                          <div className="flex justify-end mt-4">
                            {(() => {
                              if (!activeStep.buttonRefs[999]) {
                                activeStep.buttonRefs[999] = React.createRef<HTMLButtonElement | null>();
                              }
                              return (
                                <button
                                  ref={activeStep.buttonRefs[999]}
                                  onClick={() => handleContinue(stepIdx, 'bottom')}
                                  className={`bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-blue-800 transition-all shadow-lg shadow-blue-100 ${
                                    viewMode === 'mobile' ? 'px-4 py-2 text-sm' : 'px-6 py-2.5'
                                  }`}
                                >
                                  Continuar
                                  <ChevronRight size={viewMode === 'mobile' ? 16 : 18} />
                                </button>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* SVG Layer for lines - Moved inside boardRef for correct scrolling */}
          <svg 
            ref={svgRef}
            className="absolute inset-0 pointer-events-none z-0 overflow-visible"
          >
            <defs>
              <marker
                id="dot"
                viewBox="0 0 10 10"
                refX="5"
                refY="5"
                markerWidth="4"
                markerHeight="4"
              >
                <circle cx="5" cy="5" r="4" fill="#1d4ed8" />
              </marker>
            </defs>
            
            <AnimatePresence>
              {lines.map((line: { id: string; d: string; x1: number; y1: number; x2: number; y2: number }, i: number) => {
                return (
                  <React.Fragment key={`line-group-${i}`}>
                    {/* Main animated line */}
                    <motion.path
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ 
                        pathLength: 1, 
                        opacity: 1,
                        strokeDashoffset: [0, -40],
                        d: line.d
                      }}
                      exit={{ opacity: 0 }}
                      d={line.d}
                      fill="none"
                      stroke="#1d4ed8"
                      strokeOpacity="0.6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray="10 6"
                      transition={{ 
                        pathLength: { duration: 0.8, ease: "easeOut" },
                        opacity: { duration: 0.4 },
                        d: { duration: 0.4, ease: "easeInOut" },
                        strokeDashoffset: { 
                          repeat: Infinity, 
                          duration: 3, 
                          ease: "linear" 
                        }
                      }}
                    />

                    {/* Start Point Dot */}
                    <motion.g
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                    >
                      <motion.circle
                        animate={{ cx: line.x1, cy: line.y1 }}
                        r="4"
                        fill="#1d4ed8"
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                      />
                    </motion.g>

                    {/* End Point Dot */}
                    <motion.g
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                    >
                      <motion.circle
                        animate={{ cx: line.x2, cy: line.y2 }}
                        r="4"
                        fill="#1d4ed8"
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                      />
                    </motion.g>
                  </React.Fragment>
                );
              })}
            </AnimatePresence>
          </svg>
        </div>
      </div>

      {/* Footer / Status */}
      <footer className="px-8 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-[11px] font-medium text-slate-400 uppercase tracking-widest z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-700" />
            SISTEMA OPERACIONAL
          </div>
          <div className="flex items-center gap-2">
            <MousePointer2 size={12} />
            ARRASTE PARA NAVEGAR
          </div>
        </div>
        <div>
          © 2026 NEGOCIAAE FLOW ENGINE
        </div>
      </footer>
    </div>
  );
}
