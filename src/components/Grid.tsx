import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { useGridState } from '../hooks/useGridState';
import { Octagon } from './Octagon';
import { ResultSquare } from './ResultSquare';
import type { OctagonCell, ResultCell, Operator } from '../types';

// Grid layout constants
const OCTAGON_SIZE = 70;
const RESULT_SIZE = 32;
const GAP = 6;
const CELL_TOTAL = OCTAGON_SIZE + RESULT_SIZE + GAP * 2;

export function Grid() {
  const {
    octagons,
    results,
    maxRow,
    maxCol,
    updateOctagonValue,
    updateOctagonOperator,
    updateOctagonFlowDirection,
    updateResultValue,
    updateResultAccumOperator,
    insertRow,
    insertColumn,
    deleteRow,
    deleteColumn,
    focusTarget,
    setFocusTarget,
    clearFocus,
    resetState,
  } = useGridState();

  // Navigate to next/previous cell
  const navigateOctagon = useCallback((
    currentRow: number,
    currentCol: number,
    direction: 'right' | 'left' | 'down' | 'up',
    hasValue?: boolean
  ) => {
    let targetRow = currentRow;
    let targetCol = currentCol;

    const currentHasValue = hasValue ?? (octagons.find(o => o.row === currentRow && o.col === currentCol)?.value !== null);

    const octagonsInRow = octagons.filter(o => o.row === currentRow);
    const octagonsInCol = octagons.filter(o => o.col === currentCol);
    
    const minColInRow = octagonsInRow.length > 0 ? Math.min(...octagonsInRow.map(o => o.col)) : currentCol;
    const maxColInRow = octagonsInRow.length > 0 ? Math.max(...octagonsInRow.map(o => o.col)) : currentCol;
    const minRowInCol = octagonsInCol.length > 0 ? Math.min(...octagonsInCol.map(o => o.row)) : currentRow;
    const maxRowInCol = octagonsInCol.length > 0 ? Math.max(...octagonsInCol.map(o => o.row)) : currentRow;

    switch (direction) {
      case 'right':
        if (currentHasValue) {
          targetCol = currentCol + 1;
        } else if (currentCol >= maxColInRow) {
          const nextRow = currentRow + 1;
          const nextRowOctagons = octagons.filter(o => o.row === nextRow);
          if (nextRowOctagons.length > 0) {
            targetRow = nextRow;
            targetCol = Math.min(...nextRowOctagons.map(o => o.col));
          }
        } else {
          targetCol = currentCol + 1;
        }
        break;
      case 'left':
        if (currentCol <= minColInRow) {
          const prevRow = currentRow - 1;
          const prevRowOctagons = octagons.filter(o => o.row === prevRow);
          if (prevRowOctagons.length > 0) {
            targetRow = prevRow;
            targetCol = Math.max(...prevRowOctagons.map(o => o.col));
          }
        } else {
          targetCol = currentCol - 1;
        }
        break;
      case 'down':
        if (currentHasValue) {
          targetRow = currentRow + 1;
        } else if (currentRow >= maxRowInCol) {
          const nextCol = currentCol + 1;
          const nextColOctagons = octagons.filter(o => o.col === nextCol);
          if (nextColOctagons.length > 0) {
            targetCol = nextCol;
            targetRow = Math.min(...nextColOctagons.map(o => o.row));
          }
        } else {
          targetRow = currentRow + 1;
        }
        break;
      case 'up':
        if (currentRow <= minRowInCol) {
          const prevCol = currentCol - 1;
          const prevColOctagons = octagons.filter(o => o.col === prevCol);
          if (prevColOctagons.length > 0) {
            targetCol = prevCol;
            targetRow = Math.max(...prevColOctagons.map(o => o.row));
          }
        } else {
          targetRow = currentRow - 1;
        }
        break;
    }

    setTimeout(() => {
      setFocusTarget({ type: 'octagon', row: targetRow, col: targetCol });
    }, 50);
  }, [setFocusTarget, octagons]);

  // Navigate between result squares
  const navigateResult = useCallback((
    currentRow: number,
    currentCol: number,
    currentDirection: 'right' | 'bottom',
    moveDirection: 'right' | 'left' | 'down' | 'up'
  ) => {
    let targetRow = currentRow;
    let targetCol = currentCol;

    const resultsInCurrentRow = results.filter(r => r.row === currentRow && r.direction === currentDirection);
    const maxColInRow = resultsInCurrentRow.length > 0 
      ? Math.max(...resultsInCurrentRow.map(r => r.col)) 
      : 0;
    const minColInRow = resultsInCurrentRow.length > 0 
      ? Math.min(...resultsInCurrentRow.map(r => r.col)) 
      : 0;

    switch (moveDirection) {
      case 'right':
        if (currentCol >= maxColInRow) {
          targetRow = currentRow + 1;
          const resultsInNextRow = results.filter(r => r.row === targetRow && r.direction === currentDirection);
          targetCol = resultsInNextRow.length > 0 
            ? Math.min(...resultsInNextRow.map(r => r.col)) 
            : 0;
        } else {
          targetCol = currentCol + 1;
        }
        break;
      case 'left':
        if (currentCol <= minColInRow && currentRow > 0) {
          targetRow = currentRow - 1;
          const resultsInPrevRow = results.filter(r => r.row === targetRow && r.direction === currentDirection);
          targetCol = resultsInPrevRow.length > 0 
            ? Math.max(...resultsInPrevRow.map(r => r.col)) 
            : 0;
        } else {
          targetCol = Math.max(0, currentCol - 1);
        }
        break;
      case 'down':
        targetRow = currentRow + 1;
        break;
      case 'up':
        targetRow = Math.max(0, currentRow - 1);
        break;
    }

    setTimeout(() => {
      setFocusTarget({ type: 'result', row: targetRow, col: targetCol, direction: currentDirection });
    }, 50);
  }, [setFocusTarget, results]);

  const getOctagonPosition = (row: number, col: number) => ({
    left: col * CELL_TOTAL,
    top: row * CELL_TOTAL,
  });

  const getResultPosition = (result: ResultCell) => {
    const baseLeft = result.col * CELL_TOTAL;
    const baseTop = result.row * CELL_TOTAL;

    if (result.direction === 'right') {
      return {
        left: baseLeft + OCTAGON_SIZE + GAP,
        top: baseTop + (OCTAGON_SIZE - RESULT_SIZE) / 2,
      };
    } else {
      return {
        left: baseLeft + (OCTAGON_SIZE - RESULT_SIZE) / 2,
        top: baseTop + OCTAGON_SIZE + GAP,
      };
    }
  };

  const isStartCell = (octagon: OctagonCell) => {
    return octagon.row === 0 && octagon.col === 0;
  };

  // Check if an operator supports reverse calculation
  const canReverseCalculate = (operator: Operator): boolean => {
    // % (modulo) and ~ (round) cannot be reverse calculated
    return operator !== '%' && operator !== '~';
  };

  // Get the octagon that produces a result
  const getOctagonForResult = (result: ResultCell): OctagonCell | undefined => {
    return octagons.find(o => o.row === result.row && o.col === result.col);
  };

  // Check if a result's flow is blocked by the next octagon's flow direction
  const isResultBlocked = (result: ResultCell): boolean => {
    if (result.direction === 'right') {
      // For 'right' results, check if the octagon to the right ignores left input
      // The result at (row, col) flows to octagon at (row, col+1)
      const rightOctagon = octagons.find(o => o.row === result.row && o.col === result.col + 1);
      if (rightOctagon) {
        const flow = rightOctagon.flowDirection || 'cross';
        // These modes ignore left input
        return flow === 'topToRightDown' || flow === 'topDownRightNew' || flow === 'topToRight' || flow === 'splitRightDown';
      }
    } else if (result.direction === 'bottom') {
      // For 'bottom' results, check if the octagon below ignores top input
      // The result at (row, col) flows to octagon at (row+1, col)
      const belowOctagon = octagons.find(o => o.row === result.row + 1 && o.col === result.col);
      if (belowOctagon) {
        const flow = belowOctagon.flowDirection || 'cross';
        // These modes ignore top input
        return flow === 'leftToRightDown' || flow === 'leftRightDownNew' || flow === 'leftToDown' || flow === 'splitRightDown';
      }
    }
    return false;
  };

  // Insert button margin
  const INSERT_MARGIN = 24;
  
  const gridWidth = (maxCol + 1) * CELL_TOTAL + OCTAGON_SIZE;
  const gridHeight = (maxRow + 1) * CELL_TOTAL + OCTAGON_SIZE;

  const handleReset = () => {
    if (window.confirm('Reset?')) {
      resetState();
    }
  };

  // Calculate insert button positions
  // Row insert buttons: positioned at the left edge, between rows (at result square center)
  const getRowInsertPosition = (beforeRow: number) => ({
    left: -INSERT_MARGIN,
    top: beforeRow === 0 
      ? -INSERT_MARGIN / 2  // Before first row
      : (beforeRow - 1) * CELL_TOTAL + OCTAGON_SIZE + GAP + RESULT_SIZE / 2,
  });

  // Column insert buttons: positioned at the top edge, between columns (at result square center)
  const getColInsertPosition = (beforeCol: number) => ({
    left: beforeCol === 0 
      ? -INSERT_MARGIN / 2  // Before first column
      : (beforeCol - 1) * CELL_TOTAL + OCTAGON_SIZE + GAP + RESULT_SIZE / 2,
    top: -INSERT_MARGIN,
  });

  // Calculate delete button positions (at octagon center)
  const getRowDeletePosition = (row: number) => ({
    left: -INSERT_MARGIN,
    top: row * CELL_TOTAL + OCTAGON_SIZE / 2,
  });

  const getColDeletePosition = (col: number) => ({
    left: col * CELL_TOTAL + OCTAGON_SIZE / 2,
    top: -INSERT_MARGIN,
  });

  return (
    <div className="grid-container">
      {/* AC (All Clear) button */}
      <button className="ac-button" onClick={handleReset}>
        AC
      </button>
      <div
        className="grid-wrapper"
        style={{
          paddingLeft: INSERT_MARGIN,
          paddingTop: INSERT_MARGIN,
        }}
      >
        <div
          className="grid"
          style={{
            width: gridWidth,
            height: gridHeight,
            position: 'relative',
          }}
        >
        {/* Render octagons */}
        {octagons.map((octagon) => {
          const pos = getOctagonPosition(octagon.row, octagon.col);
          const isFocused = focusTarget?.type === 'octagon' && 
                           focusTarget.row === octagon.row && 
                           focusTarget.col === octagon.col;
          
          return (
            <motion.div
              key={octagon.id}
              initial={false}
              animate={{
                left: pos.left,
                top: pos.top,
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              style={{
                position: 'absolute',
                width: OCTAGON_SIZE,
                height: OCTAGON_SIZE,
              }}
            >
              <Octagon
                cell={octagon}
                isStartCell={isStartCell(octagon)}
                onValueChange={updateOctagonValue}
                onOperatorChange={updateOctagonOperator}
                onFlowDirectionChange={updateOctagonFlowDirection}
                isFocused={isFocused}
                onNavigate={navigateOctagon}
                onFocusComplete={clearFocus}
              />
            </motion.div>
          );
        })}

        {/* Render results */}
        {results.map((result) => {
          const pos = getResultPosition(result);
          const isFocused = focusTarget?.type === 'result' && 
                           focusTarget.row === result.row && 
                           focusTarget.col === result.col &&
                           focusTarget.direction === result.direction;
          
          // Check if this result can be edited (reverse calculated)
          const sourceOctagon = getOctagonForResult(result);
          const isEditable = sourceOctagon && canReverseCalculate(sourceOctagon.operator);
          
          return (
            <motion.div
              key={result.id}
              initial={false}
              animate={{
                left: pos.left,
                top: pos.top,
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              style={{
                position: 'absolute',
                width: RESULT_SIZE,
                height: RESULT_SIZE,
              }}
            >
              <ResultSquare 
                cell={result} 
                onValueChange={isEditable ? updateResultValue : undefined}
                onAccumOperatorChange={updateResultAccumOperator}
                isFocused={isFocused}
                onNavigate={navigateResult}
                onFocusComplete={clearFocus}
                isBlocked={isResultBlocked(result)}
              />
            </motion.div>
          );
        })}

          {/* Row insert buttons (left side) */}
          {Array.from({ length: maxRow + 2 }, (_, i) => {
            const pos = getRowInsertPosition(i);
            return (
              <button
                key={`insert-row-${i}`}
                className="insert-button insert-row-button"
                style={{
                  position: 'absolute',
                  left: pos.left,
                  top: pos.top,
                }}
                onClick={() => insertRow(i)}
                title={`Insert row at ${i}`}
              >
                +
              </button>
            );
          })}

          {/* Column insert buttons (top side) */}
          {Array.from({ length: maxCol + 2 }, (_, i) => {
            const pos = getColInsertPosition(i);
            return (
              <button
                key={`insert-col-${i}`}
                className="insert-button insert-col-button"
                style={{
                  position: 'absolute',
                  left: pos.left,
                  top: pos.top,
                }}
                onClick={() => insertColumn(i)}
                title={`Insert column at ${i}`}
              >
                +
              </button>
            );
          })}

          {/* Row delete buttons (left side, at octagon center) */}
          {Array.from({ length: maxRow + 1 }, (_, i) => {
            const pos = getRowDeletePosition(i);
            return (
              <button
                key={`delete-row-${i}`}
                className="delete-button delete-row-button"
                style={{
                  position: 'absolute',
                  left: pos.left,
                  top: pos.top,
                }}
                onClick={() => deleteRow(i)}
                title={`Delete row ${i}`}
              >
                −
              </button>
            );
          })}

          {/* Column delete buttons (top side, at octagon center) */}
          {Array.from({ length: maxCol + 1 }, (_, i) => {
            const pos = getColDeletePosition(i);
            return (
              <button
                key={`delete-col-${i}`}
                className="delete-button delete-col-button"
                style={{
                  position: 'absolute',
                  left: pos.left,
                  top: pos.top,
                }}
                onClick={() => deleteColumn(i)}
                title={`Delete column ${i}`}
              >
                −
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
