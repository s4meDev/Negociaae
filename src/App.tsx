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
  Minus,
  Loader2
} from 'lucide-react';
import { FLOW_DATA } from './flowData';

interface ActiveStep {
  id: string | number;
  selectedOptionIndices: number[];
  buttonRefs: React.RefObject<HTMLButtonElement | null>[];
  lastClickedContinue?: 'top' | 'bottom' | null;
}

// Reference device aspect ratio (Xiaomi Redmi Note 13: 1080x2400)
const REF_RATIO = 1080 / 2400;

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
  
  const [baseMobileScale, setBaseMobileScale] = useState(1);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartRef = useRef<number | null>(null);
  
  const viewportRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const lastTouchDistance = useRef<number | null>(null);

  // Auto-scroll to new steps
  useEffect(() => {
    if (boardRef.current && activePath.length > 1) {
      const performScroll = () => {
        const steps = boardRef.current?.querySelectorAll('.glass-card');
        if (steps && steps.length > 0) {
          const lastStep = steps[steps.length - 1] as HTMLElement;
          
          if (viewMode === 'mobile') {
            lastStep.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
          } else {
            const viewportWidth = viewportRef.current?.clientWidth || window.innerWidth;
            const boardWidth = boardRef.current!.scrollWidth * scale;
            const stepLeftInBoard = lastStep.offsetLeft;
            const stepWidth = lastStep.offsetWidth;
            
            // Calculate target X to center the step
            let targetX = (viewportWidth / 2) - (stepLeftInBoard * scale) - (stepWidth * scale / 2);
            
            // Clamp targetX to valid range [viewportWidth - boardWidth, 0]
            if (boardWidth > viewportWidth) {
              targetX = Math.min(0, Math.max(targetX, viewportWidth - boardWidth));
            } else {
              targetX = (viewportWidth - boardWidth) / 2;
            }
            
            const stepRect = lastStep.getBoundingClientRect();
            if (stepRect.right > viewportWidth - 100 || stepRect.left < 100) {
              setPosition(prev => ({ ...prev, x: targetX }));
            }
          }
        }
      };

      // Use a timer for both to ensure DOM is ready and animations are smooth
      const timer = setTimeout(performScroll, 400);
      return () => clearTimeout(timer);
    }
  }, [activePath.length, viewMode, scale]);

  // Adaptable mobile zoom calculation based on Redmi Note 13 proportions
  useEffect(() => {
    const updateMobileScale = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const currentRatio = screenWidth / screenHeight;
      
      if (viewMode === 'mobile') {
        let targetScale;
        if (screenWidth >= 1024) {
          targetScale = 1.0;
        } else {
          // Use the original formula adjusted to 60% as requested by the user
          // (screenWidth * 1.9) / 420 is the old "100%"
          // We apply 0.6 to reach the "perfect" proportion shown in the reference image
          const baseScale = (screenWidth * 1.9) / 420;
          const adjustedScale = baseScale * 0.6;
          
          // Adjust for aspect ratio: 
          // If the device is wider/shorter than the Redmi (REF_RATIO = 0.45),
          // we scale down proportionally to maintain the same visual "fit" vertically.
          if (currentRatio > REF_RATIO) {
            targetScale = adjustedScale * (REF_RATIO / currentRatio);
          } else {
            targetScale = adjustedScale;
          }
        }
        
        const finalScale = Math.max(0.4, Math.min(3, targetScale));
        setBaseMobileScale(finalScale);
        setScale(finalScale);
        setPosition({ x: 0, y: 0 });
      } else {
        setScale(0.84);
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
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setScale((prev: number) => Math.min(Math.max(prev + delta, 0.6), 1.2));
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
    
    let newX = e.clientX - dragStart.x;
    let newY = scale > 1.05 ? e.clientY - dragStart.y : position.y;

    // Apply constraints to keep content within viewport scope
    if (boardRef.current && viewportRef.current) {
      const boardWidth = boardRef.current.offsetWidth * scale;
      const boardHeight = boardRef.current.offsetHeight * scale;
      const viewportWidth = viewportRef.current.clientWidth;
      const viewportHeight = viewportRef.current.clientHeight;

      if (boardWidth > viewportWidth) {
        newX = Math.min(0, Math.max(newX, viewportWidth - boardWidth));
      } else {
        newX = Math.max(0, Math.min(newX, viewportWidth - boardWidth));
      }

      if (scale > 1.05) {
        if (boardHeight > viewportHeight) {
          newY = Math.min(0, Math.max(newY, viewportHeight - boardHeight));
        } else {
          newY = Math.max(0, Math.min(newY, viewportHeight - boardHeight));
        }
      }
    }

    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Handle dragging (Touch)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (viewMode === 'mobile') {
      if (e.touches.length === 1 && viewportRef.current?.scrollTop === 0) {
        pullStartRef.current = e.touches[0].clientY;
      }
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
      if (e.touches.length === 1 && pullStartRef.current !== null && !isRefreshing) {
        const currentY = e.touches[0].clientY;
        const diff = currentY - pullStartRef.current;
        if (diff > 0) {
          const distance = Math.min(diff * 0.4, 100);
          setPullDistance(distance);
        }
      }
      if (e.touches.length === 2 && lastTouchDistance.current !== null) {
        const distance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const delta = (distance - lastTouchDistance.current) * 0.005;
        setScale((prev: number) => Math.min(Math.max(prev + delta, 0.6), 1.2));
        lastTouchDistance.current = distance;
      }
      return;
    }

    if (e.touches.length === 1 && isDragging) {
      let newX = e.touches[0].clientX - dragStart.x;
      let newY = scale > 1.05 ? e.touches[0].clientY - dragStart.y : position.y;

      // Apply constraints
      if (boardRef.current && viewportRef.current) {
        const boardWidth = boardRef.current.offsetWidth * scale;
        const boardHeight = boardRef.current.offsetHeight * scale;
        const viewportWidth = viewportRef.current.clientWidth;
        const viewportHeight = viewportRef.current.clientHeight;

        if (boardWidth > viewportWidth) {
          newX = Math.min(0, Math.max(newX, viewportWidth - boardWidth));
        } else {
          newX = Math.max(0, Math.min(newX, viewportWidth - boardWidth));
        }

        if (scale > 1.05) {
          if (boardHeight > viewportHeight) {
            newY = Math.min(0, Math.max(newY, viewportHeight - boardHeight));
          } else {
            newY = Math.max(0, Math.min(newY, viewportHeight - boardHeight));
          }
        }
      }

      setPosition({ x: newX, y: newY });
    } else if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = (distance - lastTouchDistance.current) * 0.005;
      setScale((prev: number) => Math.min(Math.max(prev + delta, 0.6), 1.2));
      lastTouchDistance.current = distance;
    }
  };

  const handleTouchEnd = () => {
    if (viewMode === 'mobile' && pullDistance > 60 && !isRefreshing) {
      setIsRefreshing(true);
      setTimeout(() => {
        reset();
        setIsRefreshing(false);
      }, 1000);
    }
    setPullDistance(0);
    pullStartRef.current = null;
    setIsDragging(false);
    lastTouchDistance.current = null;
  };

  // Constrain position when scale or content changes
  const applyConstraints = useCallback(() => {
    if (viewMode === 'mobile' || !boardRef.current || !viewportRef.current) return;

    const boardWidth = boardRef.current.scrollWidth * scale;
    const boardHeight = boardRef.current.scrollHeight * scale;
    const viewportWidth = viewportRef.current.clientWidth;
    const viewportHeight = viewportRef.current.clientHeight;

    setPosition(prev => {
      let newX = prev.x;
      let newY = prev.y;

      if (boardWidth > viewportWidth) {
        newX = Math.min(0, Math.max(newX, viewportWidth - boardWidth));
      } else {
        newX = (viewportWidth - boardWidth) / 2;
      }

      if (boardHeight > viewportHeight) {
        newY = Math.min(0, Math.max(newY, viewportHeight - boardHeight));
      } else {
        newY = Math.max(0, Math.min(newY, viewportHeight - boardHeight));
      }

      if (Math.abs(newX - prev.x) > 0.1 || Math.abs(newY - prev.y) > 0.1) {
        return { x: newX, y: newY };
      }
      return prev;
    });
  }, [scale, viewMode]);

  useEffect(() => {
    applyConstraints();
  }, [scale, viewMode, applyConstraints]);

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
      applyConstraints();
    });

    if (boardRef.current) {
      observer.observe(boardRef.current);
    }

    updateLines();
    applyConstraints();
    window.addEventListener('resize', updateLines);
    
    // Multiple checks to ensure layout is stable
    const timer1 = setTimeout(() => { updateLines(); applyConstraints(); }, 50);
    const timer2 = setTimeout(() => { updateLines(); applyConstraints(); }, 300);
    const timer3 = setTimeout(() => { updateLines(); applyConstraints(); }, 600);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateLines);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [activePath, scale, updateLines, applyConstraints]);

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
      setScale(0.84);
      setPosition({ x: 50, y: 50 });
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-screen bg-slate-50 font-sans select-none overflow-hidden">
      {/* Header */}
      <header className={`flex items-center justify-between bg-white border-b border-slate-200 z-50 shadow-sm relative flex-shrink-0 transition-all ${
        viewMode === 'mobile' ? 'py-2 px-2 min-h-14' : 'py-4 md:py-3 px-4 md:px-8 min-h-28 md:min-h-16'
      }`}>
        <div className={`flex items-center gap-2 md:gap-3 transition-all ${viewMode === 'mobile' ? 'scale-90 origin-left' : ''}`}>
          <img 
            src="/ae-logo.jpeg" 
            alt="Negociaae Flow Logo" 
            className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl object-cover shadow-sm"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-base md:text-2xl font-bold text-[#0054A6]">Negociaae Flow</h1>
        </div>
        
        {/* Banner centralizado removido conforme solicitado */}
        
        {/* Banner simplificado para mobile - opcional, mas vamos tentar manter o header limpo */}
        
        <div className={`flex items-center gap-1 md:gap-4 transition-all`}>
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 md:p-1 border border-slate-200">
            <button 
              onClick={() => setViewMode('desktop')}
              className={`p-1 md:p-1.5 rounded-md transition-all flex items-center gap-1 px-1 md:px-2 ${viewMode === 'desktop' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              title="Versão Desktop"
            >
              <Monitor size={16} className="md:w-4 md:h-4" />
              <span className="text-[10px] font-bold uppercase hidden md:inline">Desktop</span>
            </button>
            <button 
              onClick={() => setViewMode('mobile')}
              className={`p-1 md:p-1.5 rounded-md transition-all flex items-center gap-1 px-1 md:px-2 ${viewMode === 'mobile' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              title="Versão Mobile"
            >
              <Smartphone size={16} className="md:w-4 md:h-4" />
              <span className="text-[10px] font-bold uppercase hidden md:inline">Mobile</span>
            </button>
          </div>

          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 md:p-1 border border-slate-200">
            <button 
              onClick={() => setScale((s: number) => Math.max(s - 0.05, 0.6))}
              className="p-1 md:p-1.5 hover:bg-white rounded-md text-slate-600 transition-colors"
            >
              {viewMode === 'mobile' ? <Minus size={18} /> : <ZoomOut size={18} />}
            </button>
            <span className="px-1 md:px-3 text-[10px] md:text-xs font-mono font-medium text-slate-500 min-w-8 md:min-w-15 text-center">
              {viewMode === 'mobile' ? Math.round((scale / baseMobileScale) * 100) : Math.round((scale / 0.84) * 100)}%
            </span>
            <button 
              onClick={() => setScale((s: number) => Math.min(s + 0.05, 1.2))}
              className="p-1 md:p-1.5 hover:bg-white rounded-md text-slate-600 transition-colors"
            >
              {viewMode === 'mobile' ? <Plus size={18} /> : <ZoomIn size={18} />}
            </button>
          </div>
          
          <button 
            onClick={reset}
            className="flex items-center gap-1 px-2 md:px-4 py-1.5 md:py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RotateCcw size={18} className="md:w-4 md:h-4" />
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
        {/* Pull to Refresh Indicator */}
        {viewMode === 'mobile' && (
          <motion.div 
            style={{ height: pullDistance }}
            animate={{ height: pullDistance }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            className="flex items-center justify-center overflow-hidden bg-slate-100/50 w-full sticky top-0 z-40"
          >
            <Loader2 
              className={`text-blue-600 transition-all ${pullDistance > 60 ? 'animate-spin scale-110' : 'scale-90 opacity-50'}`} 
              size={24} 
            />
          </motion.div>
        )}

        {/* Refreshing Overlay */}
        {isRefreshing && (
          <div className="absolute inset-0 z-[100] bg-white/60 backdrop-blur-sm flex items-center justify-center">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-3"
            >
              <Loader2 className="text-blue-600 animate-spin" size={40} />
              <span className="text-slate-600 font-bold tracking-tight">RECARREGANDO...</span>
            </motion.div>
          </div>
        )}

        {/* Desktop Fixed Banner */}
        {viewMode === 'desktop' && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
            <img 
              src="/ae-banner.png" 
              alt="AE Banner" 
              className="w-[80vw] max-w-[300px] object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        <div 
          ref={boardRef}
          className={`flex ${
            viewMode === 'mobile' 
              ? 'relative flex-col gap-12 md:gap-32 px-2 py-6 md:p-8 items-center w-fit mx-auto origin-top' 
              : 'absolute top-0 left-0 flex-row gap-24 pt-60 px-20 pb-20 origin-top-left min-w-max'
          }`}
          style={{ 
            transform: viewMode === 'mobile' ? `scale(${scale})` : `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
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
                  initial={{ 
                    opacity: 0, 
                    x: viewMode === 'mobile' ? 0 : 50, 
                    y: viewMode === 'mobile' ? 20 : 0,
                    scale: 0.95 
                  }}
                  animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                  exit={{ 
                    opacity: 0, 
                    x: viewMode === 'mobile' ? 0 : -50, 
                    y: viewMode === 'mobile' ? -20 : 0,
                    scale: 0.95 
                  }}
                  transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                  className={`glass-card flex flex-col h-fit transition-all flex-shrink-0 ${
                    viewMode === 'mobile' 
                      ? 'p-4 w-[96vw] max-w-[420px] gap-3' 
                      : 'p-6 w-fit min-w-[320px] gap-4'
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
                                viewMode === 'mobile' ? 'py-2 px-3 text-[10px]' : 'py-2.5 px-4 text-xs whitespace-nowrap'
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
                          viewMode === 'mobile' 
                            ? (step.options && step.options.length > 4 ? 'grid-cols-2' : 'grid-cols-1')
                            : (step.options && step.options.length > 8 ? 'grid-cols-2' : 'grid-cols-1')
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
                                  <span className={viewMode === 'mobile' ? 'line-clamp-2' : 'whitespace-nowrap'}>{opt.txt}</span>
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
          © 2026 NEGOCIAAE FLOW
        </div>
      </footer>
    </div>
  );
}
