import type { Operator, OctagonCell, ResultCell, FlowDirection, AccumOperator } from '../types';

export const MAX_VALUE = 99999999;
export const MIN_VALUE = -99999999;

// Clamp value to valid range
export function clampValue(value: number): number {
  return Math.max(MIN_VALUE, Math.min(MAX_VALUE, value));
}

export function calculate(left: number, operator: Operator, right: number): number {
  switch (operator) {
    case '+':
      return left + right;
    case '-':
      return left - right;
    case '×':
      return left * right;
    case '÷':
      return right !== 0 ? left / right : 0;
    case '^':
      return Math.pow(left, right);
    case '%':
      return right !== 0 ? left % right : 0;
    case '~':
      // 丸め: 1542~10=1540 (10の位で丸める)
      return right !== 0 ? Math.round(left / right) * right : left;
    default:
      return right;
  }
}

// Check if value is within valid range
export function isOverflow(value: number): boolean {
  return value > MAX_VALUE || value < MIN_VALUE || !isFinite(value);
}

// Reverse calculate: given prev_result [operator] octagon_value = result
// Find octagon_value from prev_result and result
export function reverseCalculate(prevResult: number, operator: Operator, result: number): number | null {
  let value: number | null;
  switch (operator) {
    case '+':
      value = result - prevResult;
      break;
    case '-':
      value = prevResult - result;
      break;
    case '×':
      if (prevResult === 0) return null;
      value = result / prevResult;
      break;
    case '÷':
      if (result === 0) return null;
      value = prevResult / result;
      break;
    case '^':
      // prevResult ^ x = result → x = log(result) / log(prevResult)
      if (prevResult <= 0 || prevResult === 1 || result <= 0) return null;
      value = Math.log(result) / Math.log(prevResult);
      break;
    case '%':
      // 剰余の逆計算は一般に不可能
      return null;
    case '~':
      // 丸めの逆計算は一般に不可能
      return null;
    default:
      return null;
  }
  if (value === null || isOverflow(value)) return null;
  return value;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function createInitialOctagon(): OctagonCell {
  return {
    id: generateId(),
    row: 0,
    col: 0,
    operator: '+',
    value: null,
  };
}

export function findOctagonAt(
  octagons: OctagonCell[],
  row: number,
  col: number
): OctagonCell | undefined {
  return octagons.find((o) => o.row === row && o.col === col);
}

export function findResultAt(
  results: ResultCell[],
  row: number,
  col: number,
  direction: ResultCell['direction']
): ResultCell | undefined {
  return results.find(
    (r) => r.row === row && r.col === col && r.direction === direction
  );
}

// Get the accumulated value up to a certain octagon for horizontal direction
export function getHorizontalAccumulator(
  octagons: OctagonCell[],
  results: ResultCell[],
  row: number,
  col: number
): number | null {
  const octagon = findOctagonAt(octagons, row, col);
  
  if (col === 0) {
    // First column: the value itself with its operator applied to 0
    if (octagon && octagon.value !== null) {
      // ×÷^%~ cannot start accumulation (only + and - can)
      if (octagon.operator !== '+' && octagon.operator !== '-') {
        return null;
      }
      return calculate(0, octagon.operator, octagon.value);
    }
    return null;
  }

  // Look for the result to the left
  const prevResult = findResultAt(results, row, col - 1, 'right');
  if (prevResult) {
    return prevResult.value;
  }
  
  // No previous result - check if this octagon can start accumulation
  if (octagon && octagon.value !== null) {
    // Only + and - can start accumulation
    if (octagon.operator !== '+' && octagon.operator !== '-') {
      return null;
    }
    
    const directLeft = findOctagonAt(octagons, row, col - 1);
    
    // If direct left doesn't exist, start new accumulation
    if (!directLeft) {
      return calculate(0, octagon.operator, octagon.value);
    }
    
    // If direct left has a value
    if (directLeft.value !== null) {
      // If direct left has operator that couldn't produce results, start new chain
      if (directLeft.operator !== '+' && directLeft.operator !== '-') {
        return calculate(0, octagon.operator, octagon.value);
      }
      // Direct left has +/- value but no result - shouldn't happen normally
      return null;
    }
    
    // Direct left is empty - start new chain from this octagon
    // Empty octagons don't produce results, so we should start accumulation here
    return calculate(0, octagon.operator, octagon.value);
  }
  
  return null;
}

// Get the accumulated value up to a certain octagon for vertical direction
export function getVerticalAccumulator(
  octagons: OctagonCell[],
  results: ResultCell[],
  row: number,
  col: number
): number | null {
  const octagon = findOctagonAt(octagons, row, col);
  
  if (row === 0) {
    // First row: the value itself with its operator applied to 0
    if (octagon && octagon.value !== null) {
      // Only + and - can start accumulation
      if (octagon.operator !== '+' && octagon.operator !== '-') {
        return null;
      }
      return calculate(0, octagon.operator, octagon.value);
    }
    return null;
  }

  // Look for the result above
  const prevResult = findResultAt(results, row - 1, col, 'bottom');
  if (prevResult) {
    return prevResult.value;
  }
  
  // No previous result - check if this octagon can start accumulation
  if (octagon && octagon.value !== null) {
    // Only + and - can start accumulation
    if (octagon.operator !== '+' && octagon.operator !== '-') {
      return null;
    }
    
    const directTop = findOctagonAt(octagons, row - 1, col);
    
    // If direct top doesn't exist, start new accumulation
    if (!directTop) {
      return calculate(0, octagon.operator, octagon.value);
    }
    
    // If direct top has a value
    if (directTop.value !== null) {
      // If direct top has operator that couldn't produce results, start new chain
      if (directTop.operator !== '+' && directTop.operator !== '-') {
        return calculate(0, octagon.operator, octagon.value);
      }
      // Direct top has +/- value but no result - shouldn't happen normally
      return null;
    }
    
    // Direct top is empty - start new chain from this octagon
    // Empty octagons don't produce results, so we should start accumulation here
    return calculate(0, octagon.operator, octagon.value);
  }
  
  return null;
}

// Calculate all results for a given octagon
export function calculateResults(
  octagons: OctagonCell[],
  results: ResultCell[],
  octagon: OctagonCell
): ResultCell[] {
  if (octagon.value === null) {
    return [];
  }

  const newResults: ResultCell[] = [];
  const { row, col, operator, value } = octagon;
  const flowDirection: FlowDirection = octagon.flowDirection || 'cross';

  // Check if there's a result directly to the left/above (meaning we continue a chain)
  // If not, this octagon starts a new chain
  const hasResultToLeft = col > 0 && findResultAt(results, row, col - 1, 'right') !== undefined;
  const hasResultAbove = row > 0 && findResultAt(results, row - 1, col, 'bottom') !== undefined;

  // Get accumulators based on flow direction
  const hAccum = getHorizontalAccumulator(octagons, results, row, col);
  const vAccum = getVerticalAccumulator(octagons, results, row, col);

  // Determine what source to use for right and bottom results based on flow direction
  // cross: 左→右、上→下（デフォルト）
  // leftToRightDown: 左の結果を右と下に分岐、上は無視
  // topToRightDown: 上の結果を右と下に分岐、左は無視
  // topDownRightNew: 上→下継続、右は新規開始
  // leftRightDownNew: 左→右継続、下は新規開始

  let rightSource: number | null = null;
  let rightIsChained = false;
  let bottomSource: number | null = null;
  let bottomIsChained = false;

  switch (flowDirection) {
    case 'cross':
      // Default: horizontal uses left, vertical uses top
      rightSource = hAccum;
      rightIsChained = hasResultToLeft;
      bottomSource = vAccum;
      bottomIsChained = hasResultAbove;
      break;
    
    case 'leftToRightDown':
      // Left result goes to both right and bottom, ignore top
      rightSource = hAccum;
      rightIsChained = hasResultToLeft;
      // Bottom also uses horizontal accumulator (left result)
      if (hAccum !== null) {
        bottomSource = hAccum;
        bottomIsChained = hasResultToLeft;
      }
      break;
    
    case 'topToRightDown':
      // Top result goes to both right and bottom, ignore left
      bottomSource = vAccum;
      bottomIsChained = hasResultAbove;
      // Right also uses vertical accumulator (top result)
      if (vAccum !== null) {
        rightSource = vAccum;
        rightIsChained = hasResultAbove;
      }
      break;
    
    case 'topDownRightNew':
      // Top → bottom continues, right starts new
      bottomSource = vAccum;
      bottomIsChained = hasResultAbove;
      // Right starts new chain (always use 0 as base)
      if (operator === '+' || operator === '-') {
        rightSource = calculate(0, operator, value);
        rightIsChained = false;
      }
      break;
    
    case 'leftRightDownNew':
      // Left → right continues, bottom starts new
      rightSource = hAccum;
      rightIsChained = hasResultToLeft;
      // Bottom starts new chain (always use 0 as base)
      if (operator === '+' || operator === '-') {
        bottomSource = calculate(0, operator, value);
        bottomIsChained = false;
      }
      break;
    
    case 'leftToDown':
      // Left result goes to bottom only, no right output
      if (hAccum !== null) {
        bottomSource = hAccum;
        bottomIsChained = hasResultToLeft;
      }
      // rightSource stays null - no right output
      break;
    
    case 'topToRight':
      // Top result goes to right only, no bottom output
      if (vAccum !== null) {
        rightSource = vAccum;
        rightIsChained = hasResultAbove;
      }
      // bottomSource stays null - no bottom output
      break;
    
    case 'splitRightDown':
      // Both right and bottom start new chains from this value
      if (operator === '+' || operator === '-') {
        rightSource = calculate(0, operator, value);
        rightIsChained = false;
        bottomSource = calculate(0, operator, value);
        bottomIsChained = false;
      }
      break;
  }

  // Horizontal result (to the right)
  if (rightSource !== null) {
    const hResult = rightIsChained ? calculate(rightSource, operator, value) : rightSource;
    newResults.push({
      id: generateId(),
      row,
      col,
      direction: 'right',
      value: hResult,
    });
  }

  // Vertical result (to the bottom)
  if (bottomSource !== null) {
    const vResult = bottomIsChained ? calculate(bottomSource, operator, value) : bottomSource;
    newResults.push({
      id: generateId(),
      row,
      col,
      direction: 'bottom',
      value: vResult,
    });
  }

  return newResults;
}

// Apply accumulation operator (using same logic as calculate)
function applyAccumOperator(accum: number, value: number, operator: AccumOperator): number {
  return calculate(accum, operator, value);
}

// Recalculate ALL results from scratch, preserving accum operators from previous results
export function recalculateAllResults(octagons: OctagonCell[], previousResults?: ResultCell[]): ResultCell[] {
  const sortedOctagons = [...octagons].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  let results: ResultCell[] = [];

  for (const octagon of sortedOctagons) {
    if (octagon.value !== null) {
      const newResults = calculateResults(octagons, results, octagon);
      
      // Preserve accum operators from previous results
      for (const newResult of newResults) {
        const prevResult = previousResults?.find(
          r => r.row === newResult.row && r.col === newResult.col && r.direction === newResult.direction
        );
        if (prevResult) {
          newResult.verticalAccumOperator = prevResult.verticalAccumOperator;
          newResult.horizontalAccumOperator = prevResult.horizontalAccumOperator;
        }
      }
      
      results = [...results, ...newResults];
    }
  }

  // Calculate accumulated values for each result using their operators
  // Always: accum = prevAccum op currentValue (if no prev, use 0)
  
  // Calculate vertical accumulation (process by column, then by row)
  const sortedByRow = [...results].sort((a, b) => {
    if (a.col !== b.col) return a.col - b.col;
    if (a.direction !== b.direction) return a.direction === 'right' ? -1 : 1;
    return a.row - b.row;
  });
  
  for (const result of sortedByRow) {
    const vOp = result.verticalAccumOperator || '+';
    
    // Find previous result in same column with same direction
    const prevVResult = results.find(
      res => res.row === result.row - 1 && res.col === result.col && res.direction === result.direction
    );
    
    const prevAccum = prevVResult?.verticalAccum ?? 0;
    result.verticalAccum = applyAccumOperator(prevAccum, result.value, vOp);
  }
  
  // Calculate horizontal accumulation (process by row, then by column)
  const sortedByCol = [...results].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    if (a.direction !== b.direction) return a.direction === 'right' ? -1 : 1;
    return a.col - b.col;
  });
  
  for (const result of sortedByCol) {
    const hOp = result.horizontalAccumOperator || '+';
    
    // Find previous result in same row with same direction
    const prevHResult = results.find(
      res => res.row === result.row && res.col === result.col - 1 && res.direction === result.direction
    );
    
    const prevAccum = prevHResult?.horizontalAccum ?? 0;
    result.horizontalAccum = applyAccumOperator(prevAccum, result.value, hOp);
  }

  return results;
}
