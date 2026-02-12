import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { OctagonCell, Operator, FlowDirection } from '../types';
import { OPERATOR_COLORS, ALL_FLOW_DIRECTIONS, FLOW_DIRECTION_COLORS } from '../types';
import { clampValue, isOverflow } from '../utils/calculator';

type OctagonProps = {
  cell: OctagonCell;
  isStartCell: boolean;
  onValueChange: (id: string, value: number | null, operator?: Operator) => void;
  onOperatorChange: (id: string, operator: Operator) => void;
  onFlowDirectionChange?: (id: string, flowDirection: FlowDirection) => void;
  isFocused?: boolean;
  onNavigate?: (row: number, col: number, direction: 'right' | 'left' | 'down' | 'up', hasValue?: boolean) => void;
  onFocusComplete?: () => void;
};

// フロー方向のSVGアイコン
const FlowIcon = ({ direction, color }: { direction: FlowDirection; color: string }) => {
  const sw = 1.5; // strokeWidth
  
  switch (direction) {
    case 'cross': // 十字: 左→右、上→下
      return (
        <svg viewBox="0 0 24 24" className="flow-icon" style={{ fillRule: 'evenodd', strokeLinecap: 'round' }}>
          {/* 横線＋右矢印 */}
          <path d="M4,12 L20,12" fill="none" stroke={color} strokeWidth={sw} />
          <path d="M17,9 L20,12 L17,15" fill="none" stroke={color} strokeWidth={sw} />
          {/* 縦線＋下矢印 */}
          <path d="M12,4 L12,20" fill="none" stroke={color} strokeWidth={sw} />
          <path d="M9,17 L12,20 L15,17" fill="none" stroke={color} strokeWidth={sw} />
        </svg>
      );
    case 'leftToRightDown': // 左の結果を右と下に分岐（カーブ）
      return (
        <svg viewBox="0 0 24 24" className="flow-icon" style={{ fillRule: 'evenodd', strokeLinecap: 'round' }}>
          {/* 横線＋右矢印 */}
          <path d="M4,12 L20,12" fill="none" stroke={color} strokeWidth={sw} />
          <path d="M17,9 L20,12 L17,15" fill="none" stroke={color} strokeWidth={sw} />
          {/* カーブして下矢印 */}
          <path d="M4,12 Q12,12 12,20" fill="none" stroke={color} strokeWidth={sw} />
          <path d="M9,17 L12,20 L15,17" fill="none" stroke={color} strokeWidth={sw} />
        </svg>
      );
    case 'topToRightDown': // 上の結果を右と下に分岐（カーブ）
      return (
        <svg viewBox="0 0 24 24" className="flow-icon" style={{ fillRule: 'evenodd', strokeLinecap: 'round' }}>
          {/* 縦線＋下矢印 */}
          <path d="M12,4 L12,20" fill="none" stroke={color} strokeWidth={sw} />
          <path d="M9,17 L12,20 L15,17" fill="none" stroke={color} strokeWidth={sw} />
          {/* カーブして右矢印 */}
          <path d="M12,4 Q12,12 20,12" fill="none" stroke={color} strokeWidth={sw} />
          <path d="M17,9 L20,12 L17,15" fill="none" stroke={color} strokeWidth={sw} />
        </svg>
      );
    case 'topDownRightNew': // 上→下継続、右は新規開始（縦棒＋右矢印）
      return (
        <svg viewBox="0 0 24 24" className="flow-icon" style={{ fillRule: 'evenodd', strokeLinecap: 'round' }}>
          {/* 縦線＋下矢印 */}
          <path d="M12,4 L12,20" fill="none" stroke={color} strokeWidth={sw} />
          <path d="M9,17 L12,20 L15,17" fill="none" stroke={color} strokeWidth={sw} />
          {/* 短い横線＋右矢印（中央から） */}
          <path d="M12,12 L20,12" fill="none" stroke={color} strokeWidth={sw} />
          <path d="M17,9 L20,12 L17,15" fill="none" stroke={color} strokeWidth={sw} />
        </svg>
      );
    case 'leftRightDownNew': // 左→右継続、下は新規開始（横棒＋下矢印）
      return (
        <svg viewBox="0 0 24 24" className="flow-icon" style={{ fillRule: 'evenodd', strokeLinecap: 'round' }}>
          {/* 横線＋右矢印 */}
          <path d="M4,12 L20,12" fill="none" stroke={color} strokeWidth={sw} />
          <path d="M17,9 L20,12 L17,15" fill="none" stroke={color} strokeWidth={sw} />
          {/* 短い縦線＋下矢印（中央から） */}
          <path d="M12,12 L12,20" fill="none" stroke={color} strokeWidth={sw} />
          <path d="M9,17 L12,20 L15,17" fill="none" stroke={color} strokeWidth={sw} />
        </svg>
      );
    case 'leftToDown': // 左から下へのみ（カーブ、右には流さない）
      return (
        <svg viewBox="0 0 24 24" className="flow-icon" style={{ fillRule: 'evenodd', strokeLinecap: 'round' }}>
          {/* カーブして下矢印のみ */}
          <path d="M4,12 Q12,12 12,20" fill="none" stroke={color} strokeWidth={sw} />
          <path d="M9,17 L12,20 L15,17" fill="none" stroke={color} strokeWidth={sw} />
        </svg>
      );
    case 'topToRight': // 上から右へのみ（カーブ、下には流さない）
      return (
        <svg viewBox="0 0 24 24" className="flow-icon" style={{ fillRule: 'evenodd', strokeLinecap: 'round' }}>
          {/* カーブして右矢印のみ */}
          <path d="M12,4 Q12,12 20,12" fill="none" stroke={color} strokeWidth={sw} />
          <path d="M17,9 L20,12 L17,15" fill="none" stroke={color} strokeWidth={sw} />
        </svg>
      );
    case 'splitRightDown': // 右と下に分岐（角ばった形）
      return (
        <svg viewBox="0 0 24 24" className="flow-icon" style={{ fillRule: 'evenodd', strokeLinecap: 'round' }}>
          {/* 短い横線＋右矢印（中央から） */}
          <path d="M12,12 L20,12" fill="none" stroke={color} strokeWidth={sw} />
          <path d="M17,9 L20,12 L17,15" fill="none" stroke={color} strokeWidth={sw} />
          {/* 短い縦線＋下矢印（中央から） */}
          <path d="M12,12 L12,20" fill="none" stroke={color} strokeWidth={sw} />
          <path d="M9,17 L12,20 L15,17" fill="none" stroke={color} strokeWidth={sw} />
        </svg>
      );
  }
};

export function Octagon({
  cell,
  isStartCell,
  onValueChange,
  onOperatorChange,
  onFlowDirectionChange,
  isFocused,
  onNavigate,
  onFocusComplete,
}: OctagonProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isFlowHovered, setIsFlowHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle external focus trigger
  useEffect(() => {
    if (isFocused && !isEditing) {
      setIsEditing(true);
      setInputValue(cell.value !== null ? String(cell.value) : '');
      onFocusComplete?.();
    }
  }, [isFocused, isEditing, cell.value, onFocusComplete]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Format number: integer up to 8 digits, decimal rounded to 2 places
  const formatValue = (value: number) => {
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
    
    // Calculate scale based on character length (threshold: 4 chars for octagon with 26px font)
    const charCount = formatted.replace(/,/g, '').length;
    const scaleX = charCount > 4 ? Math.max(0.5, 3.6 / charCount) : 1;
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

  const handleOctagonClick = () => {
    if (!isEditing) {
      setIsEditing(true);
      setInputValue(cell.value !== null ? String(cell.value) : '');
    }
  };

  const parseInput = (input: string): { value: number | null; operator?: Operator } => {
    const trimmed = input.trim();
    if (trimmed === '') {
      return { value: null };
    }

    const operatorMap: Record<string, Operator> = {
      '+': '+',
      '-': '-',
      '*': '×',
      'x': '×',
      'X': '×',
      '×': '×',
      '/': '÷',
      '÷': '÷',
      '^': '^',
      '%': '%',
      '~': '~',
    };

    const firstChar = trimmed[0];
    if (operatorMap[firstChar] && trimmed.length > 1) {
      const numPart = trimmed.slice(1).trim();
      const num = parseFloat(numPart);
      if (!isNaN(num)) {
        return { value: clampValue(num), operator: operatorMap[firstChar] };
      }
    }

    const num = parseFloat(trimmed);
    if (!isNaN(num)) {
      return { value: clampValue(num) };
    }

    return { value: null };
  };

  const handleBlur = () => {
    setIsEditing(false);
    const { value, operator } = parseInput(inputValue);
    onValueChange(cell.id, value, operator);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      setIsEditing(false);
      const { value, operator } = parseInput(inputValue);
      onValueChange(cell.id, value, operator);
      const hasValue = value !== null;
      onNavigate?.(cell.row, cell.col, e.shiftKey ? 'left' : 'right', hasValue);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setIsEditing(false);
      const { value, operator } = parseInput(inputValue);
      onValueChange(cell.id, value, operator);
      const hasValue = value !== null;
      onNavigate?.(cell.row, cell.col, e.shiftKey ? 'up' : 'down', hasValue);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setInputValue(cell.value !== null ? String(cell.value) : '');
    }
  };

  const cycleOperator = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const operators: Operator[] = isStartCell ? ['+', '-'] : ['+', '-', '×', '÷', '^', '%', '~'];
    const currentIndex = operators.indexOf(cell.operator);
    const nextIndex = (currentIndex + 1) % operators.length;
    onOperatorChange(cell.id, operators[nextIndex]);
  };

  const cycleFlowDirection = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const currentDirection = cell.flowDirection || 'cross';
    const currentIndex = ALL_FLOW_DIRECTIONS.indexOf(currentDirection);
    const nextIndex = (currentIndex + 1) % ALL_FLOW_DIRECTIONS.length;
    onFlowDirectionChange?.(cell.id, ALL_FLOW_DIRECTIONS[nextIndex]);
  };

  const operatorColor = OPERATOR_COLORS[cell.operator];
  const flowDirection = cell.flowDirection || 'cross';
  const flowColor = FLOW_DIRECTION_COLORS[flowDirection];
  const isCross = flowDirection === 'cross';
  const flowIconColor = isCross ? '#333' : '#fff';

  return (
    <div className="octagon-container">
      <motion.div
        className="octagon-wrapper"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {/* SVG octagon shape - background */}
        <svg viewBox="0 0 100 100" className="octagon-svg">
          <polygon
            className="octagon-shape"
            points="25,0 75,0 100,25 100,75 75,100 25,100 0,75 0,25"
            fill="#e8e8e8"
            onClick={handleOctagonClick}
            style={{ cursor: 'pointer' }}
          />
        </svg>
        
        {/* Operator badge - separate clickable element */}
        <div 
          className="operator-badge"
          onClick={cycleOperator}
          style={{ 
            background: `linear-gradient(to top right, ${operatorColor}, color-mix(in srgb, ${operatorColor} 60%, white))`
          }}
        >
          <span className="operator-symbol">{cell.operator}</span>
        </div>
        
        {/* Flow direction badge - bottom-right corner (diagonal to operator) */}
        <div 
          className={`flow-badge ${isCross ? 'flow-badge-cross' : ''} ${isFlowHovered || !isCross ? 'flow-badge-visible' : ''}`}
          onClick={cycleFlowDirection}
          onMouseEnter={() => setIsFlowHovered(true)}
          onMouseLeave={() => setIsFlowHovered(false)}
          style={{ 
            background: isCross 
              ? 'transparent' 
              : `linear-gradient(to top right, ${flowColor}, color-mix(in srgb, ${flowColor} 60%, white))`
          }}
        >
          <FlowIcon direction={flowDirection} color={flowIconColor} />
        </div>
      </motion.div>
      
      {/* Content area - outside wrapper to allow overflow */}
      <div className="octagon-content" onClick={handleOctagonClick}>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            className="octagon-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            size={Math.max(1, inputValue.length) || 1}
          />
        ) : (
          <span className="octagon-value">
            {cell.value !== null ? formatValue(cell.value) : ''}
          </span>
        )}
      </div>
    </div>
  );
}
