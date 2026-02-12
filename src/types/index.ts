export type Operator = '+' | '-' | '×' | '÷' | '^' | '%' | '~';

// 演算子の色 - HSL(h, 60%, 45%) で統一、アルファ0.9
export const OPERATOR_COLORS: Record<Operator, string> = {
  '+': 'hsla(185, 60%, 45%, 0.9)',  // シアン
  '-': 'hsla(5, 60%, 45%, 0.9)',    // 赤
  '×': 'hsla(265, 60%, 45%, 0.9)',  // 紫
  '÷': 'hsla(295, 60%, 45%, 0.9)',  // マゼンタ
  '^': 'hsla(25, 90%, 55%, 0.9)',   // オレンジ
  '%': 'hsla(125, 60%, 45%, 0.9)',  // 緑
  '~': 'hsla(215, 60%, 45%, 0.9)',  // 青
};

export const ALL_OPERATORS: Operator[] = ['+', '-', '×', '÷', '^', '%', '~'];
export const START_OPERATORS: Operator[] = ['+', '-'];

// フロー方向: 計算の流れを制御する
// cross: 左→右、上→下（既定）
// leftToRightDown: 左の結果を右と下に分岐、上は無視
// topToRightDown: 上の結果を右と下に分岐
// topDownRightNew: 上→下継続、右は新規開始
// leftRightDownNew: 左→右継続、下は新規開始
// leftToDown: 左から下へのみ（右には流さない）
// topToRight: 上から右へのみ（下には流さない）
// splitRightDown: 右と下に分岐（両方に新規開始）
export type FlowDirection = 'cross' | 'leftToRightDown' | 'topToRightDown' | 'topDownRightNew' | 'leftRightDownNew' | 'leftToDown' | 'topToRight' | 'splitRightDown';

export const ALL_FLOW_DIRECTIONS: FlowDirection[] = ['cross', 'leftToRightDown', 'topToRightDown', 'topDownRightNew', 'leftRightDownNew', 'leftToDown', 'topToRight', 'splitRightDown'];

// フロー方向の背景色（cross以外はグレー）
export const FLOW_DIRECTION_COLORS: Record<FlowDirection, string> = {
  'cross': 'transparent',
  'leftToRightDown': '#888888cc',
  'topToRightDown': '#888888cc',
  'topDownRightNew': '#888888cc',
  'leftRightDownNew': '#888888cc',
  'leftToDown': '#888888cc',
  'topToRight': '#888888cc',
  'splitRightDown': '#888888cc',
};

export type OctagonCell = {
  id: string;
  row: number;
  col: number;
  operator: Operator;
  value: number | null;
  flowDirection?: FlowDirection;
};

// 累積演算子（四角同士の演算）- セルと同じ演算子を使用
export type AccumOperator = Operator;

export const ALL_ACCUM_OPERATORS: AccumOperator[] = ALL_OPERATORS;

export const ACCUM_OPERATOR_COLORS: Record<AccumOperator, string> = OPERATOR_COLORS;

export type ResultCell = {
  id: string;
  row: number;
  col: number;
  direction: 'right' | 'bottom';
  value: number;
  // Accumulated values for this result
  verticalAccum?: number;  // Vertical accumulation of this result
  horizontalAccum?: number; // Horizontal accumulation of this result
  // Accumulation operators (for result-to-result operations)
  verticalAccumOperator?: AccumOperator;  // Operator for vertical accumulation
  horizontalAccumOperator?: AccumOperator; // Operator for horizontal accumulation
};

export type GridState = {
  octagons: OctagonCell[];
  results: ResultCell[];
};

export type FocusTarget = {
  type: 'octagon' | 'result';
  row: number;
  col: number;
  direction?: 'right' | 'bottom';
} | null;
