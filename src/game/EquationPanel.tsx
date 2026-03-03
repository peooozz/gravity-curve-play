import { useState } from 'react';
import { EquationRow } from './types';
import { Plus, X, Undo2, Redo2 } from 'lucide-react';

interface Props {
  equations: EquationRow[];
  instructions: string;
  onEquationChange: (id: string, text: string) => void;
  onAddRow: () => void;
  onRemoveRow: (id: string) => void;
  validMap: Record<string, boolean>;
  answers?: string[];
  activeInputId?: string | null;
  onInputFocus?: (id: string) => void;
  registerInputRef?: (id: string, el: HTMLInputElement | null) => void;
}

const CURVE_COLORS = [
  '#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0891b2', '#be185d', '#854d0e',
];

export default function EquationPanel({
  equations, instructions, onEquationChange, onAddRow, onRemoveRow, validMap, answers,
  activeInputId, onInputFocus, registerInputRef
}: Props) {
  const [showAnswers, setShowAnswers] = useState(false);

  return (
    <div className="w-[380px] flex flex-col border-r border-border bg-background h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border">
        <button
          onClick={onAddRow}
          className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          title="Add equation"
        >
          <Plus size={18} />
        </button>
        <button className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground" title="Undo">
          <Undo2 size={18} />
        </button>
        <button className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground" title="Redo">
          <Redo2 size={18} />
        </button>
      </div>

      {/* Equation rows */}
      <div className="flex-1 overflow-y-auto">
        {equations.map((eq, idx) => {
          const isValid = eq.text.trim() === '' || validMap[eq.id] !== false;
          const color = CURVE_COLORS[idx % CURVE_COLORS.length];

          return (
            <div
              key={eq.id}
              className={`group flex items-center border-b border-border transition-colors ${activeInputId === eq.id ? 'bg-secondary/40' : 'hover:bg-secondary/30'}`}
            >
              {/* Row number with color indicator or quote mark */}
              <div className="w-10 flex-shrink-0 flex items-center justify-center py-3">
                {eq.isInstruction ? (
                  <span className="text-2xl font-serif text-[#ccc] leading-none mt-1 select-none">“</span>
                ) : (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{
                      backgroundColor: eq.text.trim() ? color : 'transparent',
                      color: eq.text.trim() ? 'white' : '#9ca3af',
                      border: eq.text.trim() ? 'none' : '1.5px solid #d1d5db',
                    }}
                  >
                    {idx + 1}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 py-1.5 pr-1 flex items-center">
                {eq.isInstruction ? (
                  <div className="w-full px-2 py-1.5 text-[15px] font-medium text-[#444] font-sans">
                    {eq.text}
                  </div>
                ) : (
                  <div className="w-full relative">
                    <input
                      type="text"
                      ref={(el) => registerInputRef?.(eq.id, el!)}
                      onFocus={() => onInputFocus?.(eq.id)}
                      value={eq.text}
                      onChange={(e) => onEquationChange(eq.id, e.target.value)}
                      placeholder=""
                      className={`w-full px-2 py-1.5 text-lg font-serif italic bg-transparent outline-none ${!isValid ? 'text-destructive' : 'text-foreground'}`}
                      disabled={eq.locked}
                    />
                    {!isValid && (
                      <p className="text-[10px] text-destructive px-2 mt-0.5">Invalid equation</p>
                    )}
                  </div>
                )}
              </div>

              {/* Remove button */}
              {!eq.locked && equations.length > 1 && (
                <button
                  onClick={() => onRemoveRow(eq.id)}
                  className="p-1 mr-2 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add row button and Answers at bottom */}
      <div className="mt-auto border-t border-border bg-background flex flex-col">
        <button
          onClick={onAddRow}
          className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors w-full border-b border-border"
        >
          <Plus size={14} />
          Add equation
        </button>

        {answers && answers.length > 0 && (
          <div className="flex flex-col">
            <button
              onClick={() => setShowAnswers(!showAnswers)}
              className="px-4 py-2.5 text-sm font-medium text-left text-primary hover:bg-secondary/50 transition-colors flex justify-between items-center"
            >
              <span>{showAnswers ? "Hide Answers" : "Show Answers"}</span>
            </button>
            {showAnswers && (
              <div className="px-4 pb-3 pt-1 bg-secondary/30">
                <p className="text-xs text-muted-foreground mb-1.5 font-semibold">Solution Equations:</p>
                <div className="space-y-1.5">
                  {answers.map((ans, i) => (
                    <div key={i} className="text-sm font-mono text-foreground p-1.5 bg-background border border-border rounded overflow-x-auto whitespace-nowrap">
                      {ans}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
