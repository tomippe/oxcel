import { useState, useCallback, useEffect } from 'react';
import type { GridState, OctagonCell, Operator, ResultCell, FocusTarget, FlowDirection, AccumOperator } from '../types';
import {
  createInitialOctagon,
  generateId,
  recalculateAllResults,
  findOctagonAt,
  findResultAt,
  reverseCalculate,
} from '../utils/calculator';

const STORAGE_KEY = 'oxcel-grid-state';

// Load state from localStorage
function loadState(): GridState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validate the structure
      if (parsed.octagons && Array.isArray(parsed.octagons)) {
        // Recalculate results, preserving accum operators from saved results
        const savedResults = parsed.results || [];
        const results = recalculateAllResults(parsed.octagons, savedResults);
        return { octagons: parsed.octagons, results };
      }
    }
  } catch (e) {
    console.error('Failed to load state from localStorage:', e);
  }
  return null;
}

// Save state to localStorage
function saveState(state: GridState): void {
  try {
    // Save octagons and results (results include accum operators)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
      octagons: state.octagons,
      results: state.results.map(r => ({
        row: r.row,
        col: r.col,
        direction: r.direction,
        verticalAccumOperator: r.verticalAccumOperator,
        horizontalAccumOperator: r.horizontalAccumOperator,
      }))
    }));
  } catch (e) {
    console.error('Failed to save state to localStorage:', e);
  }
}

// Check if an octagon should be kept (based on actual result squares)
function shouldKeepOctagon(octagon: OctagonCell, results: ResultCell[]): boolean {
  // Always keep if it has a value
  if (octagon.value !== null) return true;
  
  // Always keep the starting cell (0,0)
  if (octagon.row === 0 && octagon.col === 0) return true;
  
  // Check if there's a result square directly above (bottom result from row-1)
  const hasResultAbove = results.some(
    r => r.row === octagon.row - 1 && r.col === octagon.col && r.direction === 'bottom'
  );
  if (hasResultAbove) return true;
  
  // Check if there's a result square directly to the left (right result from col-1)
  const hasResultLeft = results.some(
    r => r.row === octagon.row && r.col === octagon.col - 1 && r.direction === 'right'
  );
  if (hasResultLeft) return true;
  
  return false;
}

// Clean up unnecessary octagons based on actual results
function cleanupOctagons(octagons: OctagonCell[], results: ResultCell[]): OctagonCell[] {
  return octagons.filter(octagon => shouldKeepOctagon(octagon, results));
}

// Expand octagons based on results: add octagons next to result squares
function expandOctagonsFromResults(octagons: OctagonCell[], results: ResultCell[]): OctagonCell[] {
  let newOctagons = [...octagons];
  
  for (const result of results) {
    if (result.direction === 'bottom') {
      // A 'bottom' result at (row, col) means there should be an octagon at (row+1, col)
      const targetRow = result.row + 1;
      const targetCol = result.col;
      if (!findOctagonAt(newOctagons, targetRow, targetCol)) {
        newOctagons.push({
          id: generateId(),
          row: targetRow,
          col: targetCol,
          operator: '+',
          value: null,
        });
      }
    } else if (result.direction === 'right') {
      // A 'right' result at (row, col) means there should be an octagon at (row, col+1)
      const targetRow = result.row;
      const targetCol = result.col + 1;
      if (!findOctagonAt(newOctagons, targetRow, targetCol)) {
        newOctagons.push({
          id: generateId(),
          row: targetRow,
          col: targetCol,
          operator: '+',
          value: null,
        });
      }
    }
  }
  
  return newOctagons;
}

export function useGridState() {
  const [state, setState] = useState<GridState>(() => {
    const saved = loadState();
    if (saved) {
      return saved;
    }
    return {
      octagons: [createInitialOctagon()],
      results: [],
    };
  });
  
  const [focusTarget, setFocusTarget] = useState<FocusTarget>(null);
  
  // Save to localStorage whenever state changes
  useEffect(() => {
    saveState(state);
  }, [state]);
  
  const clearFocus = useCallback(() => {
    setFocusTarget(null);
  }, []);

  // Reset to initial state
  const resetState = useCallback(() => {
    setState({
      octagons: [createInitialOctagon()],
      results: [],
    });
  }, []);

  const updateOctagonValue = useCallback(
    (id: string, value: number | null, operator?: Operator) => {
      setState((prev) => {
        const octagonIndex = prev.octagons.findIndex((o) => o.id === id);
        if (octagonIndex === -1) return prev;

        const octagon = prev.octagons[octagonIndex];
        const updatedOctagon: OctagonCell = {
          ...octagon,
          value,
          operator: operator ?? octagon.operator,
        };

        let newOctagons = [...prev.octagons];
        newOctagons[octagonIndex] = updatedOctagon;

        // Auto-expand: add new octagons if value is set
        if (value !== null) {
          const newOctagonsToAdd: OctagonCell[] = [];

          // Right octagon
          if (!findOctagonAt(newOctagons, octagon.row, octagon.col + 1)) {
            newOctagonsToAdd.push({
              id: generateId(),
              row: octagon.row,
              col: octagon.col + 1,
              operator: '+',
              value: null,
            });
          }

          // Bottom octagon
          if (!findOctagonAt(newOctagons, octagon.row + 1, octagon.col)) {
            newOctagonsToAdd.push({
              id: generateId(),
              row: octagon.row + 1,
              col: octagon.col,
              operator: '+',
              value: null,
            });
          }

          newOctagons = [...newOctagons, ...newOctagonsToAdd];
        }

        // Calculate results first (preserve accum operators from previous results)
        let newResults = recalculateAllResults(newOctagons, prev.results);

        // Expand octagons based on results (add octagons next to result squares)
        newOctagons = expandOctagonsFromResults(newOctagons, newResults);

        // Recalculate results after expansion
        newResults = recalculateAllResults(newOctagons, newResults);

        // Cleanup based on actual results (keep octagon if there's a result square above or to the left)
        newOctagons = cleanupOctagons(newOctagons, newResults);

        // Recalculate results after cleanup
        newResults = recalculateAllResults(newOctagons, newResults);

        return {
          octagons: newOctagons,
          results: newResults,
        };
      });
    },
    []
  );

  const updateOctagonOperator = useCallback((id: string, operator: Operator) => {
    setState((prev) => {
      const octagonIndex = prev.octagons.findIndex((o) => o.id === id);
      if (octagonIndex === -1) return prev;

      const octagon = prev.octagons[octagonIndex];
      const updatedOctagon: OctagonCell = {
        ...octagon,
        operator,
      };

      let newOctagons = [...prev.octagons];
      newOctagons[octagonIndex] = updatedOctagon;

      // Calculate results first
      let newResults = recalculateAllResults(newOctagons, prev.results);

      // Expand octagons based on results (add octagons next to result squares)
      newOctagons = expandOctagonsFromResults(newOctagons, newResults);

      // Recalculate results after expansion
      newResults = recalculateAllResults(newOctagons, newResults);

      // Cleanup based on actual results
      newOctagons = cleanupOctagons(newOctagons, newResults);

      // Recalculate results after cleanup
      newResults = recalculateAllResults(newOctagons, newResults);

      return {
        octagons: newOctagons,
        results: newResults,
      };
    });
  }, []);

  const updateOctagonFlowDirection = useCallback((id: string, flowDirection: FlowDirection) => {
    setState((prev) => {
      const octagonIndex = prev.octagons.findIndex((o) => o.id === id);
      if (octagonIndex === -1) return prev;

      const octagon = prev.octagons[octagonIndex];
      const updatedOctagon: OctagonCell = {
        ...octagon,
        flowDirection,
      };

      let newOctagons = [...prev.octagons];
      newOctagons[octagonIndex] = updatedOctagon;

      // Calculate results first
      let newResults = recalculateAllResults(newOctagons, prev.results);

      // Expand octagons based on results (add octagons next to result squares)
      newOctagons = expandOctagonsFromResults(newOctagons, newResults);

      // Recalculate results after expansion
      newResults = recalculateAllResults(newOctagons, newResults);

      // Cleanup based on actual results
      newOctagons = cleanupOctagons(newOctagons, newResults);

      // Recalculate results after cleanup
      newResults = recalculateAllResults(newOctagons, newResults);

      return {
        octagons: newOctagons,
        results: newResults,
      };
    });
  }, []);

  // Reverse calculate: update octagon value based on edited result
  const updateResultValue = useCallback((resultCell: ResultCell, newValue: number | null) => {
    setState((prev) => {
      // Find the octagon that produces this result
      const octagon = findOctagonAt(prev.octagons, resultCell.row, resultCell.col);
      if (!octagon || octagon.value === null) return prev;

      // If newValue is null, just ignore (no separator feature)
      if (newValue === null) return prev;

      const flowDirection = octagon.flowDirection || 'cross';

      // Find the previous result based on direction AND flow direction
      let prevValue: number | null = null;
      
      // Determine the source direction based on flow direction
      // For most flow directions, the source follows the result direction
      // But some flow directions redirect the source
      let sourceDirection: 'left' | 'top' = resultCell.direction === 'right' ? 'left' : 'top';
      
      // Override source direction based on flow direction
      if (resultCell.direction === 'right') {
        // Right result: normally comes from left
        // But topToRightDown and topToRight use top as source for right
        if (flowDirection === 'topToRightDown' || flowDirection === 'topToRight') {
          sourceDirection = 'top';
        }
      } else if (resultCell.direction === 'bottom') {
        // Bottom result: normally comes from top
        // But leftToRightDown and leftToDown use left as source for bottom
        if (flowDirection === 'leftToRightDown' || flowDirection === 'leftToDown') {
          sourceDirection = 'left';
        }
      }
      
      // Get previous value based on determined source direction
      if (sourceDirection === 'left') {
        if (resultCell.col === 0) {
          prevValue = 0;
        } else {
          const prevResult = findResultAt(prev.results, resultCell.row, resultCell.col - 1, 'right');
          prevValue = prevResult?.value ?? null;
        }
      } else if (sourceDirection === 'top') {
        if (resultCell.row === 0) {
          prevValue = 0;
        } else {
          const prevResult = findResultAt(prev.results, resultCell.row - 1, resultCell.col, 'bottom');
          prevValue = prevResult?.value ?? null;
        }
      }
      
      // For splitRightDown, topDownRightNew (right), leftRightDownNew (bottom): source is 0 (new chain)
      if (flowDirection === 'splitRightDown') {
        prevValue = 0;
      } else if (flowDirection === 'topDownRightNew' && resultCell.direction === 'right') {
        prevValue = 0;
      } else if (flowDirection === 'leftRightDownNew' && resultCell.direction === 'bottom') {
        prevValue = 0;
      }

      if (prevValue === null) return prev;

      // Reverse calculate to get new octagon value
      let newOctagonValue = reverseCalculate(prevValue, octagon.operator, newValue);
      if (newOctagonValue === null) return prev;

      // If the value is negative, flip the operator and make value positive
      let newOperator = octagon.operator;
      if (newOctagonValue < 0 && (octagon.operator === '+' || octagon.operator === '-')) {
        newOctagonValue = Math.abs(newOctagonValue);
        newOperator = octagon.operator === '+' ? '-' : '+';
      }

      // Update the octagon
      const octagonIndex = prev.octagons.findIndex((o) => o.id === octagon.id);
      const updatedOctagon: OctagonCell = {
        ...octagon,
        value: newOctagonValue,
        operator: newOperator,
      };

      const newOctagons = [...prev.octagons];
      newOctagons[octagonIndex] = updatedOctagon;

      // Recalculate ALL results
      const newResults = recalculateAllResults(newOctagons, prev.results);

      return {
        octagons: newOctagons,
        results: newResults,
      };
    });
  }, []);

  // Update accumulation operator for a result cell
  const updateResultAccumOperator = useCallback((
    row: number, 
    col: number, 
    direction: 'right' | 'bottom',
    accumDirection: 'vertical' | 'horizontal',
    operator: AccumOperator
  ) => {
    setState((prev) => {
      const resultIndex = prev.results.findIndex(
        r => r.row === row && r.col === col && r.direction === direction
      );
      if (resultIndex === -1) return prev;

      const updatedResults = [...prev.results];
      const result = { ...updatedResults[resultIndex] };
      
      if (accumDirection === 'vertical') {
        result.verticalAccumOperator = operator;
      } else {
        result.horizontalAccumOperator = operator;
      }
      
      updatedResults[resultIndex] = result;

      // Recalculate to update accum values
      const newResults = recalculateAllResults(prev.octagons, updatedResults);

      return {
        octagons: prev.octagons,
        results: newResults,
      };
    });
  }, []);

  // Insert a new row at the specified position
  const insertRow = useCallback((atRow: number) => {
    setState((prev) => {
      // Shift all octagons at or below atRow down by 1
      const shiftedOctagons = prev.octagons.map(o => ({
        ...o,
        row: o.row >= atRow ? o.row + 1 : o.row,
      }));

      // Create new octagon at the first column of the new row
      const newOctagon: OctagonCell = {
        id: generateId(),
        row: atRow,
        col: 0,
        operator: '+',
        value: 0,
      };

      const newOctagons = [...shiftedOctagons, newOctagon];
      
      // Shift result positions too
      const shiftedResults = prev.results.map(r => ({
        ...r,
        row: r.row >= atRow ? r.row + 1 : r.row,
      }));
      
      const newResults = recalculateAllResults(newOctagons, shiftedResults);

      return {
        octagons: newOctagons,
        results: newResults,
      };
    });

    // Focus on the new cell
    setTimeout(() => {
      setFocusTarget({ type: 'octagon', row: atRow, col: 0 });
    }, 50);
  }, [setFocusTarget]);

  // Insert a new column at the specified position
  const insertColumn = useCallback((atCol: number) => {
    setState((prev) => {
      // Shift all octagons at or to the right of atCol right by 1
      const shiftedOctagons = prev.octagons.map(o => ({
        ...o,
        col: o.col >= atCol ? o.col + 1 : o.col,
      }));

      // Create new octagon at the first row of the new column
      const newOctagon: OctagonCell = {
        id: generateId(),
        row: 0,
        col: atCol,
        operator: '+',
        value: 0,
      };

      const newOctagons = [...shiftedOctagons, newOctagon];
      
      // Shift result positions too
      const shiftedResults = prev.results.map(r => ({
        ...r,
        col: r.col >= atCol ? r.col + 1 : r.col,
      }));
      
      const newResults = recalculateAllResults(newOctagons, shiftedResults);

      return {
        octagons: newOctagons,
        results: newResults,
      };
    });

    // Focus on the new cell
    setTimeout(() => {
      setFocusTarget({ type: 'octagon', row: 0, col: atCol });
    }, 50);
  }, [setFocusTarget]);

  // Delete a row at the specified position
  const deleteRow = useCallback((atRow: number) => {
    setState((prev) => {
      // Remove octagons at the specified row
      let newOctagons = prev.octagons.filter(o => o.row !== atRow);
      
      // Shift all octagons below atRow up by 1
      newOctagons = newOctagons.map(o => ({
        ...o,
        row: o.row > atRow ? o.row - 1 : o.row,
      }));

      // Ensure at least one octagon exists at (0,0)
      if (newOctagons.length === 0 || !findOctagonAt(newOctagons, 0, 0)) {
        newOctagons.push({
          id: generateId(),
          row: 0,
          col: 0,
          operator: '+',
          value: null,
        });
      }

      // Shift result positions too
      const shiftedResults = prev.results
        .filter(r => r.row !== atRow)
        .map(r => ({
          ...r,
          row: r.row > atRow ? r.row - 1 : r.row,
        }));

      const newResults = recalculateAllResults(newOctagons, shiftedResults);

      return {
        octagons: newOctagons,
        results: newResults,
      };
    });
  }, []);

  // Delete a column at the specified position
  const deleteColumn = useCallback((atCol: number) => {
    setState((prev) => {
      // Remove octagons at the specified column
      let newOctagons = prev.octagons.filter(o => o.col !== atCol);
      
      // Shift all octagons to the right of atCol left by 1
      newOctagons = newOctagons.map(o => ({
        ...o,
        col: o.col > atCol ? o.col - 1 : o.col,
      }));

      // Ensure at least one octagon exists at (0,0)
      if (newOctagons.length === 0 || !findOctagonAt(newOctagons, 0, 0)) {
        newOctagons.push({
          id: generateId(),
          row: 0,
          col: 0,
          operator: '+',
          value: null,
        });
      }

      // Shift result positions too
      const shiftedResults = prev.results
        .filter(r => r.col !== atCol)
        .map(r => ({
          ...r,
          col: r.col > atCol ? r.col - 1 : r.col,
        }));

      const newResults = recalculateAllResults(newOctagons, shiftedResults);

      return {
        octagons: newOctagons,
        results: newResults,
      };
    });
  }, []);

  // Calculate grid dimensions
  const maxRow = Math.max(...state.octagons.map((o) => o.row), 0);
  const maxCol = Math.max(...state.octagons.map((o) => o.col), 0);

  return {
    octagons: state.octagons,
    results: state.results,
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
  };
}
