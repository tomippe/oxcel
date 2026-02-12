import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { ResultCell, AccumOperator } from '../types';
import { ALL_ACCUM_OPERATORS, ACCUM_OPERATOR_COLORS } from '../types';
import { clampValue, isOverflow } from '../utils/calculator';

type ResultSquareProps = {
  cell: ResultCell;
  onValueChange?: (cell: ResultCell, newValue: number | null) => void;
  onAccumOperatorChange?: (
    row: number,
    col: number,
    direction: 'right' | 'bottom',
    accumDirection: 'vertical' | 'horizontal',
    operator: AccumOperator
  ) => void;
  isFocused?: boolean;
  onNavigate?: (row: number, col: number, direction: 'right' | 'bottom', move: 'right' | 'left' | 'down' | 'up') => void;
  onFocusComplete?: () => void;
  isBlocked?: boolean; // 流れがせき止められているか
};

export function ResultSquare({ cell, onValueChange, onAccumOperatorChange, isFocused, onNavigate, onFocusComplete, isBlocked }: ResultSquareProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle external focus trigger
  useEffect(() => {
    if (isFocused && !isEditing && onValueChange) {
      setIsEditing(true);
      setInputValue(String(cell.value));
      onFocusComplete?.();
    }
  }, [isFocused, isEditing, cell.value, onValueChange, onFocusComplete]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Format number for editing (plain string)
  const formatValueForEdit = (value: number): string => {
    if (Number.isInteger(value)) {
      return String(value);
    }
    return value.toFixed(2).replace(/\.?0+$/, '');
  };

  // Format number for display: integer up to 8 digits, decimal rounded to 2 places
  const formatValueDisplay = (value: number) => {
    // Check for overflow
    if (isOverflow(value)) {
      return <span className="overflow-error">E</span>;
    }
    
    // Round to 2 decimal places
    const rounded = Math.round(value * 100) / 100;
    const isInteger = Number.isInteger(rounded);
    // Check if rounding occurred (has more than 2 decimal places)
    const isRounded = value !== rounded;
    
    let formatted: string;
    if (isInteger) {
      formatted = rounded.toLocaleString();
    } else {
      const [intPart, decPart] = rounded.toFixed(2).replace(/\.?0+$/, '').split('.');
      const formattedInt = parseInt(intPart).toLocaleString();
      formatted = formattedInt + (decPart ? '.' + decPart : '');
    }
    
    // Calculate scale based on character length (threshold: 4 chars for result square)
    const charCount = formatted.replace(/,/g, '').length;
    const scaleX = charCount > 4 ? Math.max(0.4, 3.6 / charCount) : 1;
    const skew = isRounded ? 'skewX(-15deg)' : '';
    const transform = `scaleX(${scaleX}) ${skew}`.trim();
    
    if (isInteger) {
      return <span style={{ transform, display: 'inline-block' }}>{rounded.toLocaleString()}</span>;
    }
    
    const [intPart, decPart] = rounded.toFixed(2).replace(/\.?0+$/, '').split('.');
    const formattedInt = parseInt(intPart).toLocaleString();
    return (
      <span style={{ transform, display: 'inline-block' }}>
        {formattedInt}
        {decPart && <span className="decimal-part">.{decPart}</span>}
      </span>
    );
  };

  // Format for accum: integer up to 8 digits, decimal rounded to 2 places
  const formatAccum = (value: number) => {
    // Check for overflow
    if (isOverflow(value)) {
      return <span>E</span>;
    }
    
    // Round to 2 decimal places
    const rounded = Math.round(value * 100) / 100;
    // Check if rounding occurred (has more than 2 decimal places)
    const isRounded = value !== rounded;
    const skew = isRounded ? 'skewX(-15deg)' : '';
    const transform = skew || undefined;
    
    const formatted = Number.isInteger(rounded)
      ? rounded.toLocaleString()
      : rounded.toLocaleString(undefined, { maximumFractionDigits: 2 });
    
    return <span style={{ transform, display: transform ? 'inline-block' : undefined }}>{formatted}</span>;
  };

  const handleClick = () => {
    if (!isEditing && onValueChange) {
      setIsEditing(true);
      setInputValue(formatValueForEdit(cell.value));
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (!onValueChange) return;
    
    const trimmed = inputValue.trim();
    if (trimmed === '') {
      // Empty value creates a separator
      onValueChange(cell, null);
    } else {
      const num = parseFloat(trimmed);
      if (!isNaN(num)) {
        onValueChange(cell, clampValue(num));
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      setIsEditing(false);
      if (onValueChange) {
        const trimmed = inputValue.trim();
        if (trimmed === '') {
          onValueChange(cell, null);
        } else {
          const num = parseFloat(trimmed);
          if (!isNaN(num)) {
            onValueChange(cell, clampValue(num));
          }
        }
      }
      onNavigate?.(cell.row, cell.col, cell.direction, e.shiftKey ? 'left' : 'right');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setIsEditing(false);
      if (onValueChange) {
        const trimmed = inputValue.trim();
        if (trimmed === '') {
          onValueChange(cell, null);
        } else {
          const num = parseFloat(trimmed);
          if (!isNaN(num)) {
            onValueChange(cell, clampValue(num));
          }
        }
      }
      onNavigate?.(cell.row, cell.col, cell.direction, e.shiftKey ? 'up' : 'down');
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setInputValue(formatValueForEdit(cell.value));
    }
  };

  // ブロックの方向を決定（結果の流れる方向と同じ）
  // rightの結果が流れる先がブロック → 右にボーダー
  // bottomの結果が流れる先がブロック → 下にボーダー
  const blockDirection = cell.direction;

  // 累積演算子の切り替え
  const cycleAccumOperator = (accumDirection: 'vertical' | 'horizontal', e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onAccumOperatorChange) return;
    
    const currentOp = accumDirection === 'vertical' 
      ? (cell.verticalAccumOperator || '+')
      : (cell.horizontalAccumOperator || '+');
    const currentIndex = ALL_ACCUM_OPERATORS.indexOf(currentOp);
    const nextIndex = (currentIndex + 1) % ALL_ACCUM_OPERATORS.length;
    onAccumOperatorChange(cell.row, cell.col, cell.direction, accumDirection, ALL_ACCUM_OPERATORS[nextIndex]);
  };

  const vAccumOp = cell.verticalAccumOperator || '+';
  const hAccumOp = cell.horizontalAccumOperator || '+';

  return (
    <div className={`result-wrapper ${isBlocked ? `result-blocked result-blocked-${blockDirection}` : ''}`}>
      {/* Vertical accumulation operator badge (top of square) - for right results */}
      {cell.direction === 'right' && cell.verticalAccum !== undefined && (
        <div 
          className="result-accum-op result-accum-op-top"
          onClick={(e) => cycleAccumOperator('vertical', e)}
          style={{ 
            background: `linear-gradient(to top right, ${ACCUM_OPERATOR_COLORS[vAccumOp]}, color-mix(in srgb, ${ACCUM_OPERATOR_COLORS[vAccumOp]} 60%, white))`
          }}
        >
          {vAccumOp}
        </div>
      )}
      {/* Horizontal accumulation operator badge (left of square) - for bottom results */}
      {cell.direction === 'bottom' && cell.horizontalAccum !== undefined && (
        <div 
          className="result-accum-op result-accum-op-left"
          onClick={(e) => cycleAccumOperator('horizontal', e)}
          style={{ 
            background: `linear-gradient(to top right, ${ACCUM_OPERATOR_COLORS[hAccumOp]}, color-mix(in srgb, ${ACCUM_OPERATOR_COLORS[hAccumOp]} 60%, white))`
          }}
        >
          {hAccumOp}
        </div>
      )}
      <motion.div
        className="result-square"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={handleClick}
        style={{ 
          cursor: onValueChange ? 'pointer' : 'not-allowed',
          borderRadius: cell.direction === 'right' ? '0 0 4px 4px' : '0 4px 4px 0'
        }}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            className="result-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            size={Math.max(1, inputValue.length) || 1}
          />
        ) : (
          <span className="result-value">
            {formatValueDisplay(cell.value)}
          </span>
        )}
      </motion.div>
      {/* For 'right' results: show vertical accumulation below */}
      {cell.direction === 'right' && cell.verticalAccum !== undefined && (
        <span className="result-accum result-accum-bottom">
          {formatAccum(cell.verticalAccum)}
        </span>
      )}
      {/* For 'bottom' results: show horizontal accumulation to the right */}
      {cell.direction === 'bottom' && cell.horizontalAccum !== undefined && (
        <span className="result-accum result-accum-right">
          {formatAccum(cell.horizontalAccum)}
        </span>
      )}
    </div>
  );
}
