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
  ZoomOut
} from 'lucide-react';
import { FLOW_DATA } from './flowData';

interface ActiveStep {
  id: string | number;
  selectedOptionIndices: number[];
  buttonRefs: React.RefObject<HTMLButtonElement | null>[];
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
  
  const viewportRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Handle zooming
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((prev: number) => Math.min(Math.max(prev + delta, 0.4), 2));
  };

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Calculate curved lines
  const updateLines = useCallback(() => {
    if (!svgRef.current || activePath.length < 2 || !boardRef.current) {
      setLines([]);
      return;
    }

    const newLines: { d: string; id: string; x1: number; y1: number; x2: number; y2: number }[] = [];
    const svgRect = svgRef.current.getBoundingClientRect();

    // Iterate through steps to connect them
    for (let i = 0; i < activePath.length - 1; i++) {
      const currentStep = activePath[i];
      const nextStep = activePath[i + 1];
      
      // Find which button was clicked in current step to lead to next step
      const currentIdx = currentStep.selectedOptionIndices[currentStep.selectedOptionIndices.length - 1];
      const startBtn = currentStep.buttonRefs[currentIdx]?.current;
      
      // Find the selected button in the next step to connect to
      // If no option is selected yet in the next step, connect to the card header area
      const nextIdx = nextStep.selectedOptionIndices[0];
      const endBtn = nextStep.buttonRefs[nextIdx]?.current;
      
      // The next column container (fallback if no button is selected)
      const nextCol = boardRef.current.children[i + 1] as HTMLElement;

      if (startBtn && nextCol) {
        const r1 = startBtn.getBoundingClientRect();
        const r2 = endBtn ? endBtn.getBoundingClientRect() : nextCol.getBoundingClientRect();

        // Start point: right center of the selected button in current card
        const x1 = (r1.right - svgRect.left) / scale;
        const y1 = (r1.top + r1.height / 2 - svgRect.top) / scale;

        // End point: left center of the selected button in next card (or header area)
        const x2 = (r2.left - svgRect.left) / scale;
        const y2 = endBtn 
          ? (r2.top + r2.height / 2 - svgRect.top) / scale 
          : (r2.top + 40 - svgRect.top) / scale;

        // Bezier curve points: horizontal out, then vertical adjustment, then horizontal in
        const cp1x = x1 + (x2 - x1) * 0.4;
        const cp1y = y1;
        const cp2x = x1 + (x2 - x1) * 0.6;
        const cp2y = y2;

        const d = `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
        newLines.push({ 
          d, 
          id: `line-${i}-${currentStep.id}-${nextStep.id}`,
          x1, y1, x2, y2
        });
      }
    }
    setLines(newLines);
  }, [activePath, scale]);

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

  const reset = () => {
    setActivePath([{ id: 10, selectedOptionIndices: [], buttonRefs: [] }]);
    setScale(1);
    setPosition({ x: 50, y: 50 });
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 font-sans select-none">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200 z-50 shadow-sm relative">
        <div className="flex items-center gap-3">
          <img 
            src="/ae-logo.jpeg" 
            alt="NEGOCIAAE Logo" 
            className="w-10 h-10 rounded-xl object-cover shadow-sm"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">NEGOCIAAE</h1>
        </div>
        
        {/* Banner centralizado */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block">
          <img 
            src="/ae-banner.jpeg" 
            alt="AE Banner" 
            className="h-10 object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
            <button 
              onClick={() => setScale((s: number) => Math.max(s - 0.1, 0.4))}
              className="p-1.5 hover:bg-white rounded-md text-slate-600 transition-colors"
            >
              <ZoomOut size={18} />
            </button>
            <span className="px-3 text-xs font-mono font-medium text-slate-500 min-w-15 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button 
              onClick={() => setScale((s: number) => Math.min(s + 0.1, 2))}
              className="p-1.5 hover:bg-white rounded-md text-slate-600 transition-colors"
            >
              <ZoomIn size={18} />
            </button>
          </div>
          
          <button 
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RotateCcw size={18} />
            Reiniciar
          </button>
        </div>
      </header>

      {/* Main Viewport */}
      <div 
        ref={viewportRef}
        className="flex-1 relative overflow-hidden flow-bg cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
          ref={boardRef}
          className="absolute top-0 left-0 flex gap-24 p-20 origin-top-left"
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
        >
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
                  className="glass-card p-6 min-w-70 flex flex-col gap-4 h-fit"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-widest text-blue-700 uppercase bg-blue-50 px-2 py-1 rounded">
                      {step.cat}
                    </span>
                    <div className="w-2 h-2 rounded-full bg-slate-200" />
                  </div>
                  
                  <h3 className="text-slate-800 font-semibold leading-tight text-lg">
                    {step.q}
                  </h3>

                  <div className="flex flex-col gap-2 mt-2">
                    {step.type === 'final' ? (
                      <button
                        onClick={reset}
                        className="w-full py-3 px-4 bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 hover:bg-emerald-600"
                      >
                        <RotateCcw size={18} />
                        REINICIAR FLUXO
                      </button>
                    ) : (step.type as string) === 'info' ? (
                      <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-1 gap-2">
                          {step.options?.map((opt, optIdx) => (
                            <div 
                              key={optIdx}
                              className="w-full py-2.5 px-4 bg-slate-50 text-slate-500 border border-slate-100 rounded-lg text-xs font-medium"
                            >
                              {opt.txt}
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end mt-4">
                          <button
                            onClick={() => handleSelect(stepIdx, 0, step.next)}
                            className="bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-800 transition-all shadow-lg shadow-blue-100"
                          >
                            Continuar
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      </div>
                    ) : step.type === 'text' ? (
                      <button
                        onClick={() => handleSelect(stepIdx, 0, step.next)}
                        className={`w-full py-3 px-4 rounded-xl font-medium text-left flex items-center justify-between group transition-all ${
                          activeStep.selectedOptionIndices.includes(0)
                            ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-200'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'
                        }`}
                      >
                        <span>Preencher campo</span>
                        <ChevronRight size={18} className={activeStep.selectedOptionIndices.includes(0) ? 'text-white' : 'text-slate-400'} />
                      </button>
                    ) : (
                      step.options?.map((opt, optIdx) => {
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
                            className={`w-full py-3 px-4 rounded-xl font-medium text-left flex items-center justify-between group transition-all ${
                              isSelected
                                ? 'bg-blue-700 text-white shadow-md'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {step.type === 'multi' ? (
                                isSelected ? <CheckCircle2 size={18} /> : <Circle size={18} className="text-slate-300" />
                              ) : null}
                              <span>{opt.txt}</span>
                            </div>
                            <ChevronRight 
                              size={18} 
                              className={`transition-transform duration-300 ${
                                isSelected ? 'translate-x-1 text-white' : 'text-slate-300 group-hover:text-slate-400'
                              }`} 
                            />
                          </button>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* SVG Layer for lines */}
        <svg 
          ref={svgRef}
          className="absolute inset-0 pointer-events-none z-0 overflow-visible"
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
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
