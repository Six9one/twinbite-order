import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useVirtualKeyboard, KeyboardLayout } from '@/context/VirtualKeyboardContext';
import {
  Keyboard as KeyboardIcon,
  X,
  Delete,
  CornerDownLeft,
  ArrowUp,
  GripHorizontal,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function VirtualKeyboard() {
  const {
    isOpen,
    autoOpen,
    layout,
    isCaps,
    activeElement,
    activeLabel,
    openKeyboard,
    closeKeyboard,
    toggleKeyboard,
    setAutoOpen,
    setLayout,
    toggleCaps,
    typeChar,
    backspace,
    clearInput,
    submitInput
  } = useVirtualKeyboard();

  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
  });

  const [liveValue, setLiveValue] = useState<string>('');

  useEffect(() => {
    if (!activeElement) {
      setLiveValue('');
      return;
    }
    setLiveValue(activeElement.value || '');

    const updateVal = () => setLiveValue(activeElement.value || '');
    activeElement.addEventListener('input', updateVal);
    activeElement.addEventListener('change', updateVal);
    return () => {
      activeElement.removeEventListener('input', updateVal);
      activeElement.removeEventListener('change', updateVal);
    };
  }, [activeElement]);

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.keyboard-drag-handle')) return;

    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const currentX = position ? position.x : rect.left;
    const currentY = position ? position.y : rect.top;

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: currentX,
      posY: currentY,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    const newX = Math.max(10, Math.min(window.innerWidth - 320, dragStartRef.current.posX + dx));
    const newY = Math.max(10, Math.min(window.innerHeight - 150, dragStartRef.current.posY + dy));

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (position) {
        if (position.x > window.innerWidth - 300 || position.y > window.innerHeight - 100) {
          setPosition(null);
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position]);

  const AZERTY_ROWS = [
    ['a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm'],
    ['w', 'x', 'c', 'v', 'b', 'n', 'é', 'è', 'à', 'ç'],
  ];

  const QWERTY_ROWS = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', 'é', 'è', 'à'],
  ];

  const SYMBOL_ROWS = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['@', '#', '€', '$', '%', '&', '*', '-', '+', '='],
    ['!', '?', '/', ':', ';', '(', ')', '"', "'", '_'],
  ];

  const handleKeyClick = (e: React.MouseEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    typeChar(key);
  };

  const handleAction = (e: React.MouseEvent, actionFn: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    actionFn();
  };

  if (typeof document === 'undefined' || !document.body) return null;

  return ReactDOM.createPortal(
    <>
      {/* Floating Action Button (FAB) - Always visible when keyboard is closed */}
      {!isOpen && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleKeyboard();
          }}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 2147483646,
            backgroundColor: '#10b981',
            color: '#020617',
            padding: '12px 18px',
            borderRadius: '16px',
            border: '2px solid #34d399',
            fontWeight: 900,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 12px 35px rgba(0,0,0,0.75), 0 0 20px rgba(16, 185, 129, 0.5)',
            fontSize: '14px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
          className="virtual-keyboard-fab cursor-pointer active:scale-95 transition-transform"
          title="Ouvrir le clavier virtuel"
        >
          <KeyboardIcon style={{ width: 22, height: 22, color: '#020617' }} />
          <span>Clavier</span>
        </button>
      )}

      {/* Virtual Keyboard Overlay */}
      {isOpen && (
        <div
          tabIndex={-1}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            position: 'fixed',
            zIndex: 2147483647,
            left: position ? `${position.x}px` : '50%',
            top: position ? `${position.y}px` : 'auto',
            bottom: position ? 'auto' : '16px',
            transform: position ? 'none' : 'translateX(-50%)',
            backgroundColor: 'rgba(15, 23, 42, 0.98)',
            backdropFilter: 'blur(20px)',
            border: '2px solid rgba(16, 185, 129, 0.8)',
            borderRadius: '24px',
            boxShadow: '0 25px 70px rgba(0, 0, 0, 0.95), 0 0 30px rgba(16, 185, 129, 0.3)',
            padding: '12px',
            color: '#f8fafc',
            width: '96vw',
            maxWidth: '760px',
            userSelect: 'none',
          }}
          className={cn(
            "virtual-keyboard-container select-none transition-shadow duration-200",
            isDragging && "cursor-grabbing"
          )}
        >
          {/* Header Bar & Control Buttons */}
          <div className="flex items-center justify-between gap-2 pb-2.5 mb-2 border-b border-slate-800">
            {/* Drag Handle & Active Field Badge */}
            <div className="keyboard-drag-handle flex items-center gap-2 cursor-grab active:cursor-grabbing flex-1 min-w-0 pr-2">
              <GripHorizontal className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-400 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shrink-0 animate-pulse" />
                  <span className="truncate">{activeLabel || 'Saisie au clavier'}</span>
                </div>
                {liveValue && (
                  <div className="text-xs text-slate-300 font-mono truncate max-w-[260px]">
                    "{liveValue}"
                  </div>
                )}
              </div>
            </div>

            {/* Layout Switches */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
              <button
                type="button"
                onMouseDown={(e) => handleAction(e, () => setLayout('azerty'))}
                className={cn(
                  "px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer",
                  layout === 'azerty' ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"
                )}
              >
                AZERTY
              </button>
              <button
                type="button"
                onMouseDown={(e) => handleAction(e, () => setLayout('qwerty'))}
                className={cn(
                  "px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer",
                  layout === 'qwerty' ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"
                )}
              >
                QWERTY
              </button>
              <button
                type="button"
                onMouseDown={(e) => handleAction(e, () => setLayout('numpad'))}
                className={cn(
                  "px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer",
                  layout === 'numpad' ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"
                )}
              >
                123
              </button>
              <button
                type="button"
                onMouseDown={(e) => handleAction(e, () => setLayout('symbols'))}
                className={cn(
                  "px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer",
                  layout === 'symbols' ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"
                )}
              >
                @#$
              </button>
            </div>

            {/* Auto-Open Toggle & Close */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onMouseDown={(e) => handleAction(e, () => setAutoOpen(!autoOpen))}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 text-xs font-extrabold rounded-lg border transition-all cursor-pointer",
                  autoOpen
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                )}
                title={autoOpen ? "Ouverture auto activée" : "Ouverture auto désactivée"}
              >
                <Zap className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{autoOpen ? "Auto ON" : "Auto OFF"}</span>
              </button>

              <button
                type="button"
                onMouseDown={(e) => handleAction(e, () => closeKeyboard())}
                className="p-2 text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-xl transition-all cursor-pointer"
                title="Fermer le clavier"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* KEYBOARD BODY */}
          {layout === 'numpad' ? (
            <div className="grid grid-cols-4 gap-2 p-1">
              {[
                { label: '7', key: '7' },
                { label: '8', key: '8' },
                { label: '9', key: '9' },
                { label: '⌫ Effacer', isBack: true },
                { label: '4', key: '4' },
                { label: '5', key: '5' },
                { label: '6', key: '6' },
                { label: 'C Vider', isClear: true },
                { label: '1', key: '1' },
                { label: '2', key: '2' },
                { label: '3', key: '3' },
                { label: '-', key: '-' },
                { label: '0', key: '0' },
                { label: '00', key: '00' },
                { label: '.', key: '.' },
                { label: '↵ Valider', isEnter: true },
              ].map((btn, idx) => (
                <button
                  key={idx}
                  type="button"
                  onMouseDown={(e) => {
                    if (btn.isBack) handleAction(e, backspace);
                    else if (btn.isClear) handleAction(e, clearInput);
                    else if (btn.isEnter) handleAction(e, submitInput);
                    else if (btn.key) handleKeyClick(e, btn.key);
                  }}
                  className={cn(
                    "h-12 sm:h-14 rounded-2xl font-black text-lg sm:text-xl flex items-center justify-center transition-all duration-75 active:scale-95 border shadow-md select-none cursor-pointer",
                    btn.isEnter
                      ? "bg-emerald-500 hover:bg-emerald-400 border-emerald-300 text-slate-950 font-black text-sm sm:text-base shadow-emerald-900/80"
                      : btn.isBack || btn.isClear
                      ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-rose-400 text-xs sm:text-sm"
                      : "bg-slate-800/90 hover:bg-slate-700/90 border-slate-700/80 text-white hover:border-slate-500"
                  )}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 p-1">
              {(layout === 'azerty' ? AZERTY_ROWS : layout === 'qwerty' ? QWERTY_ROWS : SYMBOL_ROWS).map(
                (row, rIdx) => (
                  <div key={rIdx} className="flex gap-1.5 justify-center">
                    {rIdx === 2 && layout !== 'symbols' && (
                      <button
                        type="button"
                        onMouseDown={(e) => handleAction(e, toggleCaps)}
                        className={cn(
                          "h-10 sm:h-12 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1 transition-all duration-75 active:scale-95 border shrink-0 cursor-pointer",
                          isCaps
                            ? "bg-emerald-400 border-emerald-300 text-slate-950 font-black"
                            : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300"
                        )}
                        title="Majuscule / Caps"
                      >
                        <ArrowUp className={cn("w-4 h-4", isCaps && "stroke-[3]")} />
                      </button>
                    )}

                    {row.map((char) => {
                      const displayChar = isCaps && layout !== 'symbols' ? char.toUpperCase() : char;
                      return (
                        <button
                          key={char}
                          type="button"
                          onMouseDown={(e) => handleKeyClick(e, displayChar)}
                          className="flex-1 h-10 sm:h-12 min-w-[28px] sm:min-w-[36px] max-w-[62px] bg-slate-800 hover:bg-slate-700 border border-slate-700/80 hover:border-slate-500 rounded-xl font-bold text-base sm:text-lg text-white flex items-center justify-center transition-all duration-75 active:scale-95 shadow-sm cursor-pointer"
                        >
                          {displayChar}
                        </button>
                      );
                    })}

                    {rIdx === 2 && (
                      <button
                        type="button"
                        onMouseDown={(e) => handleAction(e, backspace)}
                        className="h-10 sm:h-12 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-rose-400 hover:text-rose-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all duration-75 active:scale-95 shrink-0 cursor-pointer"
                        title="Effacer"
                      >
                        <Delete className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )
              )}

              <div className="flex gap-1.5 pt-1 justify-between">
                <button
                  type="button"
                  onMouseDown={(e) => handleAction(e, clearInput)}
                  className="h-10 sm:h-12 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-rose-400 rounded-xl font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
                  title="Tout effacer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Vider</span>
                </button>

                <button
                  type="button"
                  onMouseDown={(e) => handleKeyClick(e, ',')}
                  className="h-10 sm:h-12 w-10 sm:w-12 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-bold text-base text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                >
                  ,
                </button>

                <button
                  type="button"
                  onMouseDown={(e) => handleKeyClick(e, ' ')}
                  className="flex-1 h-10 sm:h-12 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 rounded-xl font-black text-xs text-slate-200 flex items-center justify-center active:scale-95 transition-all shadow-inner tracking-widest uppercase cursor-pointer"
                >
                  Espace
                </button>

                <button
                  type="button"
                  onMouseDown={(e) => handleKeyClick(e, '.')}
                  className="h-10 sm:h-12 w-10 sm:w-12 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-bold text-base text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                >
                  .
                </button>

                <button
                  type="button"
                  onMouseDown={(e) => handleKeyClick(e, '@')}
                  className="h-10 sm:h-12 w-10 sm:w-12 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-bold text-base text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                >
                  @
                </button>

                <button
                  type="button"
                  onMouseDown={(e) => handleAction(e, submitInput)}
                  className="h-10 sm:h-12 px-4 bg-emerald-500 hover:bg-emerald-400 border border-emerald-300 text-slate-950 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-lg shrink-0 cursor-pointer"
                >
                  <CornerDownLeft className="w-4 h-4" />
                  <span>Entrer</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>,
    document.body
  );
}
