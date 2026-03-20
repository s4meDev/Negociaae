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
  Maximize2
} from 'lucide-react';
import { FLOW_DATA } from './flowData';

interface ActiveStep {
  id: string | number;
  selectedOptionIndices: number[];
  buttonRefs: React.RefObject<HTMLButtonElement | null>[];
}

export default function App() {
  const [activePath, setActivePath] = useState<ActiveStep[]>([
    { id: 11, selectedOptionIndices: [], buttonRefs: [] }
  ]);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lines, setLines] = useState<{ d: string; id: string }[]>([]);
  
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
    if (!svgRef.current || activePath.length < 2) {
      setLines([]);
      return;
    }

    const newLines: { d: string; id: string }[] = [];
    const svgRect = svgRef.current.getBoundingClientRect();

    for (let i = 0; i < activePath.length - 1; i++) {
      const currentStep = activePath[i];
      
      // Find which button was clicked in current step to lead to next step
      // In this logic, we assume the last selected button in current step leads to the next step
      const lastIdx = currentStep.selectedOptionIndices[currentStep.selectedOptionIndices.length - 1];
      const startBtn = currentStep.buttonRefs[lastIdx]?.current;
      
      // For the next step, we connect to the column header or the first button area
      // Actually, connecting to the next column's container is better
      const nextCol = boardRef.current?.children[i + 1] as HTMLElement;

      if (startBtn && nextCol) {
        const r1 = startBtn.getBoundingClientRect();
        const r2 = nextCol.getBoundingClientRect();

        const x1 = (r1.right - svgRect.left) / scale;
        const y1 = (r1.top + r1.height / 2 - svgRect.top) / scale;

        const x2 = (r2.left - svgRect.left) / scale;
        const y2 = (r2.top + 40 - svgRect.top) / scale; // Offset to align with header area

        // Bezier curve points
        const cp1x = x1 + (x2 - x1) * 0.5;
        const cp1y = y1;
        const cp2x = x1 + (x2 - x1) * 0.5;
        const cp2y = y2;

        const d = `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
        newLines.push({ d, id: `line-${i}` });
      }
    }
    setLines(newLines);
  }, [activePath, scale]);

  useEffect(() => {
    updateLines();
    window.addEventListener('resize', updateLines);
    // Re-run after a short delay to ensure DOM is updated
    const timer = setTimeout(updateLines, 100);
    return () => {
      window.removeEventListener('resize', updateLines);
      clearTimeout(timer);
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
    setActivePath([{ id: 11, selectedOptionIndices: [], buttonRefs: [] }]);
    setScale(1);
    setPosition({ x: 50, y: 50 });
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 font-sans select-none">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-200">
            <Maximize2 className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">NEGOCIAAE</h1>
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
                    <span className="text-[10px] font-bold tracking-widest text-cyan-600 uppercase bg-cyan-50 px-2 py-1 rounded">
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
                                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-200'
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
          className="absolute inset-0 pointer-events-none z-0"
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.2" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          {lines.map((line: { id: string; d: string }) => (
            <motion.path
              key={line.id}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              d={line.d}
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              filter="url(#glow)"
            />
          ))}
        </svg>
      </div>

      {/* Footer / Status */}
      <footer className="px-8 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-[11px] font-medium text-slate-400 uppercase tracking-widest z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
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
