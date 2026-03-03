import React, { useState, useEffect } from 'react';
import { Delete, CornerDownLeft, ArrowLeft, ArrowRight, Volume2 } from 'lucide-react';

interface Props {
    onKeyPress: (key: string) => void;
    onBackspace: () => void;
    onEnter: () => void;
    onLeftArrow?: () => void;
    onRightArrow?: () => void;
}

export default function VirtualKeyboard({ onKeyPress, onBackspace, onEnter, onLeftArrow, onRightArrow }: Props) {
    const [showFunctions, setShowFunctions] = useState(false);
    const [height, setHeight] = useState(192); // default h-48 ~ 192px
    const [isResizing, setIsResizing] = useState(false);

    useEffect(() => {
        if (!isResizing) return;
        const handleMouseMove = (e: MouseEvent) => {
            // New height is the window bottom minus the mouse vertical coordinate
            const newHeight = Math.max(120, Math.min(window.innerHeight - 100, window.innerHeight - e.clientY));
            setHeight(newHeight);
        };
        const handleMouseUp = () => setIsResizing(false);

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault(); // keep focus on the input
    };

    const KeyBtn = ({ children, onClick, className = '' }: any) => (
        <button
            onMouseDown={handleMouseDown}
            onClick={onClick}
            className={`bg-[#f5f5f5] text-[#333] border-b-2 border-[#ccc] font-medium rounded-sm active:translate-y-[2px] active:border-b-0 mb-[2px] active:mb-0 transition-all flex items-center justify-center ${className}`}
        >
            {children}
        </button>
    );

    return (
        <div
            className="bg-[#e0e0e0] p-2 pt-4 flex gap-4 select-none relative border-t border-border w-full flex-shrink-0"
            style={{ height: `${height}px` }}
        >
            {/* Drag handle */}
            <div
                className="absolute top-0 left-0 w-full h-3 cursor-row-resize hover:bg-[#d4d4d4] flex items-center justify-center transition-colors z-20"
                onMouseDown={() => setIsResizing(true)}
            >
                <div className="w-12 h-1 bg-[#aaa] rounded-full" />
            </div>

            {/* Function Popup */}
            {showFunctions && (
                <div className="absolute bottom-[calc(100%-10px)] right-4 mb-2 bg-white border border-border shadow-2xl rounded-sm p-4 w-80 z-50">
                    <div className="text-[10px] font-bold text-muted-foreground mb-3 uppercase tracking-wider">Trig Functions</div>
                    <div className="grid grid-cols-3 gap-2 mb-5">
                        {['sin', 'cos', 'tan', 'csc', 'sec', 'cot'].map(f => (
                            <KeyBtn key={f} onClick={() => { onKeyPress(f + '('); setShowFunctions(false); }} className="py-2.5 bg-gray-50 text-sm">
                                {f}
                            </KeyBtn>
                        ))}
                    </div>
                    <div className="text-[10px] font-bold text-muted-foreground mb-3 uppercase tracking-wider">Inverse Trig Functions</div>
                    <div className="grid grid-cols-3 gap-2">
                        {['sin^{-1}', 'cos^{-1}', 'tan^{-1}', 'csc^{-1}', 'sec^{-1}', 'cot^{-1}'].map(f => (
                            <KeyBtn key={f} onClick={() => { onKeyPress(f.replace('^{-1}', '^{-1}') + '('); setShowFunctions(false); }} className="py-2.5 bg-gray-50 text-sm">
                                <span dangerouslySetInnerHTML={{ __html: f.replace('^{-1}', '<sup>-1</sup>') }} />
                            </KeyBtn>
                        ))}
                    </div>
                    {/* Decorative tail for popup */}
                    <div className="absolute -bottom-2 right-12 w-4 h-4 bg-white border-b border-r border-border transform rotate-45"></div>
                </div>
            )}

            {/* Left Block - Variables & Symbols */}
            <div className="w-[45%] grid grid-cols-4 gap-1.5 h-full">
                <KeyBtn onClick={() => onKeyPress('x')} className="italic text-lg font-serif">x</KeyBtn>
                <KeyBtn onClick={() => onKeyPress('y')} className="italic text-lg font-serif">y</KeyBtn>
                <KeyBtn onClick={() => onKeyPress('^2')} className="text-lg italic font-serif">a<sup>2</sup></KeyBtn>
                <KeyBtn onClick={() => onKeyPress('^')} className="text-lg italic font-serif">a<sup>b</sup></KeyBtn>

                <KeyBtn onClick={() => onKeyPress('(')} className="text-lg">(</KeyBtn>
                <KeyBtn onClick={() => onKeyPress(')')} className="text-lg">)</KeyBtn>
                <KeyBtn onClick={() => onKeyPress('<')} className="text-lg">&lt;</KeyBtn>
                <KeyBtn onClick={() => onKeyPress('>')} className="text-lg">&gt;</KeyBtn>

                <KeyBtn onClick={() => onKeyPress('|')} className="text-lg">|a|</KeyBtn>
                <KeyBtn onClick={() => onKeyPress(',')} className="text-lg">,</KeyBtn>
                <KeyBtn onClick={() => onKeyPress('<=')} className="text-lg">&le;</KeyBtn>
                <KeyBtn onClick={() => onKeyPress('>=')} className="text-lg">&ge;</KeyBtn>

                <KeyBtn onClick={() => { }} className="text-sm font-bold bg-[#d1d5db]">A B C</KeyBtn>
                <KeyBtn onClick={() => { }} className="text-muted-foreground bg-[#d1d5db]"><Volume2 size={16} /></KeyBtn>
                <KeyBtn onClick={() => onKeyPress('sqrt(')} className="text-lg">&radic;</KeyBtn>
                <KeyBtn onClick={() => onKeyPress('pi')} className="text-lg font-serif">&pi;</KeyBtn>
            </div>

            {/* Middle Block (Numpad) */}
            <div className="w-[30%] grid grid-cols-4 gap-1.5 h-full">
                <KeyBtn onClick={() => onKeyPress('7')} className="bg-[#d1d5db] text-xl">7</KeyBtn>
                <KeyBtn onClick={() => onKeyPress('8')} className="bg-[#d1d5db] text-xl">8</KeyBtn>
                <KeyBtn onClick={() => onKeyPress('9')} className="bg-[#d1d5db] text-xl">9</KeyBtn>
                <KeyBtn onClick={() => onKeyPress('/')} className="text-2xl font-light">&divide;</KeyBtn>

                <KeyBtn onClick={() => onKeyPress('4')} className="bg-[#d1d5db] text-xl">4</KeyBtn>
                <KeyBtn onClick={() => onKeyPress('5')} className="bg-[#d1d5db] text-xl">5</KeyBtn>
                <KeyBtn onClick={() => onKeyPress('6')} className="bg-[#d1d5db] text-xl">6</KeyBtn>
                <KeyBtn onClick={() => onKeyPress('*')} className="text-2xl font-light">&times;</KeyBtn>

                <KeyBtn onClick={() => onKeyPress('1')} className="bg-[#d1d5db] text-xl">1</KeyBtn>
                <KeyBtn onClick={() => onKeyPress('2')} className="bg-[#d1d5db] text-xl">2</KeyBtn>
                <KeyBtn onClick={() => onKeyPress('3')} className="bg-[#d1d5db] text-xl">3</KeyBtn>
                <KeyBtn onClick={() => onKeyPress('-')} className="text-2xl font-light">-</KeyBtn>

                <KeyBtn onClick={() => onKeyPress('0')} className="bg-[#d1d5db] text-xl">0</KeyBtn>
                <KeyBtn onClick={() => onKeyPress('.')} className="bg-[#d1d5db] text-2xl font-bold pb-2">.</KeyBtn>
                <KeyBtn onClick={() => onKeyPress('=')} className="text-2xl font-light">=</KeyBtn>
                <KeyBtn onClick={() => onKeyPress('+')} className="text-2xl font-light">+</KeyBtn>
            </div>

            {/* Right Block */}
            <div className="w-[20%] grid grid-cols-2 gap-1.5 grid-rows-4 h-full">
                <KeyBtn onClick={() => setShowFunctions(!showFunctions)} className="col-span-2 text-sm bg-[#d1d5db] font-semibold">functions</KeyBtn>
                <KeyBtn onClick={onLeftArrow} className="bg-[#d1d5db]"><ArrowLeft size={18} /></KeyBtn>
                <KeyBtn onClick={onRightArrow} className="bg-[#d1d5db]"><ArrowRight size={18} /></KeyBtn>
                <KeyBtn onClick={onBackspace} className="col-span-2 bg-[#d1d5db]"><Delete size={20} className="fill-current" /></KeyBtn>
                <KeyBtn onClick={onEnter} className="col-span-2 !bg-[#2563eb] !text-white !border-blue-700 hover:!bg-blue-600"><CornerDownLeft size={20} /></KeyBtn>
            </div>
        </div>
    );
}
