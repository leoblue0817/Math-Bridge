export type KenKenOp = '' | '+' | '-' | '*' | '/';

export interface KenKenCage {
  op: KenKenOp;
  target: number;
  cells: [number, number][];
}

export interface KenKenPuzzle {
  id: string;
  title: string;
  subtitle: string;
  points: number;
  size: number;
  cages: KenKenCage[];
  solution: number[][];
  hints?: string[];
}

export const KENKEN_PUZZLES: KenKenPuzzle[] = [
  {
    id: 'kk-demo',
    title: '教學範例 · 4×4',
    subtitle: '講義入門引導題',
    points: 10,
    size: 4,
    cages: [
      { op: '-', target: 1, cells: [[0, 0], [1, 0]] },
      { op: '-', target: 3, cells: [[0, 1], [0, 2]] },
      { op: '/', target: 2, cells: [[0, 3], [1, 3]] },
      { op: '*', target: 9, cells: [[1, 1], [1, 2], [2, 2]] },
      { op: '/', target: 2, cells: [[2, 0], [2, 1]] },
      { op: '+', target: 6, cells: [[2, 3], [3, 2], [3, 3]] },
      { op: '+', target: 5, cells: [[3, 0], [3, 1]] },
    ],
    solution: [
      [3, 1, 4, 2],
      [2, 3, 1, 4],
      [4, 2, 3, 1],
      [1, 4, 2, 3],
    ],
    hints: [
      '「9×」表示 3 個數相乘為 9，唯一組合為 1×3×3；因為同行同列不能重複，兩個「3」必在斜對角，剩下一格填 1。',
      '「6＋」由 3 格組成，在 1～4 中只能填「1、2、3」，搭配同行排除即可逐步推出其餘空格！',
    ],
  },
  {
    id: 'kk-1',
    title: '第一關 · 5×5',
    subtitle: '基礎挑戰（20 分）',
    points: 20,
    size: 5,
    cages: [
      { op: '+', target: 3, cells: [[0, 0], [1, 0]] },
      { op: '*', target: 20, cells: [[0, 1], [0, 2]] },
      { op: '-', target: 2, cells: [[0, 3], [1, 3]] },
      { op: '/', target: 2, cells: [[0, 4], [1, 4]] },
      { op: '*', target: 15, cells: [[1, 1], [1, 2]] },
      { op: '+', target: 8, cells: [[2, 0], [2, 1], [2, 2]] },
      { op: '+', target: 7, cells: [[2, 3], [2, 4]] },
      { op: '*', target: 36, cells: [[3, 0], [3, 1], [4, 0], [4, 1]] },
      { op: '/', target: 2, cells: [[3, 2], [4, 2]] },
      { op: '-', target: 3, cells: [[3, 3], [3, 4]] },
      { op: '-', target: 4, cells: [[4, 3], [4, 4]] },
    ],
    solution: [
      [1, 4, 5, 3, 2],
      [2, 5, 3, 1, 4],
      [5, 2, 1, 4, 3],
      [3, 1, 4, 2, 5],
      [4, 3, 2, 5, 1],
    ],
    hints: [
      '先看「4－」只能填 {1, 5}，「20×」只能填 {4, 5}，「15×」只能填 {3, 5}！',
      '「3＋」只能填 {1, 2}，可迅速鎖定第一欄。',
    ],
  },
  {
    id: 'kk-2',
    title: '第二關 · 6×6',
    subtitle: '進階挑戰（30 分）',
    points: 30,
    size: 6,
    cages: [
      { op: '', target: 6, cells: [[0, 0]] },
      { op: '+', target: 11, cells: [[0, 1], [1, 1]] },
      { op: '/', target: 3, cells: [[0, 2], [1, 2]] },
      { op: '+', target: 3, cells: [[0, 3], [1, 3]] },
      { op: '+', target: 13, cells: [[0, 4], [0, 5], [1, 5], [2, 5]] },
      { op: '+', target: 3, cells: [[1, 0], [2, 0]] },
      { op: '-', target: 2, cells: [[1, 4], [2, 4]] },
      { op: '*', target: 160, cells: [[2, 1], [2, 2], [3, 2], [4, 2]] },
      { op: '*', target: 108, cells: [[2, 3], [3, 3], [3, 4]] },
      { op: '-', target: 3, cells: [[3, 0], [3, 1]] },
      { op: '-', target: 5, cells: [[3, 5], [4, 5]] },
      { op: '-', target: 1, cells: [[4, 0], [5, 0]] },
      { op: '/', target: 3, cells: [[4, 1], [5, 1]] },
      { op: '*', target: 20, cells: [[4, 3], [4, 4], [5, 3]] },
      { op: '', target: 6, cells: [[5, 2]] },
      { op: '-', target: 3, cells: [[5, 4], [5, 5]] },
    ],
    solution: [
      [6, 5, 1, 2, 4, 3],
      [2, 6, 3, 1, 5, 4],
      [1, 4, 5, 6, 3, 2],
      [5, 2, 4, 3, 6, 1],
      [4, 3, 2, 5, 1, 6],
      [3, 1, 6, 4, 2, 5],
    ],
    hints: [
      '「6」單格先填入，「11＋」必為 {5, 6}，因為左邊已有 6，所以第一列第二格必為 5！',
      '「5－」在 1～6 中只能填 {1, 6}。',
    ],
  },
  {
    id: 'kk-3',
    title: '第三關 · 6×6',
    subtitle: '高手挑戰（50 分）',
    points: 50,
    size: 6,
    cages: [
      { op: '-', target: 4, cells: [[0, 0], [1, 0]] },
      { op: '/', target: 2, cells: [[0, 1], [0, 2]] },
      { op: '*', target: 36, cells: [[0, 3], [1, 3], [1, 4]] },
      { op: '*', target: 30, cells: [[0, 4], [0, 5]] },
      { op: '+', target: 7, cells: [[1, 1], [1, 2]] },
      { op: '*', target: 12, cells: [[1, 5], [2, 5], [3, 5]] },
      { op: '/', target: 3, cells: [[2, 0], [3, 0]] },
      { op: '-', target: 5, cells: [[2, 1], [3, 1]] },
      { op: '*', target: 6, cells: [[2, 2], [2, 3]] },
      { op: '*', target: 20, cells: [[2, 4], [3, 4]] },
      { op: '+', target: 7, cells: [[3, 2], [3, 3], [4, 2]] },
      { op: '+', target: 9, cells: [[4, 0], [4, 1], [5, 0]] },
      { op: '-', target: 1, cells: [[4, 3], [5, 3]] },
      { op: '-', target: 2, cells: [[4, 4], [5, 4]] },
      { op: '/', target: 3, cells: [[4, 5], [5, 5]] },
      { op: '-', target: 1, cells: [[5, 1], [5, 2]] },
    ],
    solution: [
      [1, 4, 2, 3, 6, 5],
      [5, 3, 4, 6, 2, 1],
      [6, 1, 3, 2, 5, 4],
      [2, 6, 5, 1, 4, 3],
      [4, 2, 1, 5, 3, 6],
      [3, 5, 6, 4, 1, 2],
    ],
    hints: [
      '「30×」在 1～6 只能填 {5, 6}，「5－」只能填 {1, 6}，「20×」只能填 {4, 5}！',
      '「4－」只能填 {1, 5} 或 {2, 6}。',
    ],
  },
];

export interface ShikakuClue {
  r: number;
  c: number;
  val: number;
}

export interface ShikakuPuzzle {
  id: string;
  title: string;
  subtitle: string;
  points: number;
  rows: number;
  cols: number;
  clues: ShikakuClue[];
  hint: string;
}

export const SHIKAKU_PUZZLES: ShikakuPuzzle[] = [
  {
    id: 'sh-demo',
    title: '遊戲範例 · 5×5',
    subtitle: '講義步驟拆解示範',
    points: 10,
    rows: 5,
    cols: 5,
    clues: [
      { r: 0, c: 0, val: 3 },
      { r: 0, c: 4, val: 2 },
      { r: 1, c: 1, val: 4 },
      { r: 1, c: 4, val: 2 },
      { r: 2, c: 0, val: 4 },
      { r: 2, c: 2, val: 2 },
      { r: 3, c: 3, val: 3 },
      { r: 4, c: 2, val: 3 },
      { r: 4, c: 3, val: 2 },
    ],
    hint: '先看上下兩排的「3」與「2」，因下方或上方有其他數字阻擋，都只能切成橫向長方形！',
  },
  {
    id: 'sh-1',
    title: '第一關 · 5×5',
    subtitle: '基礎挑戰（30 分）',
    points: 30,
    rows: 5,
    cols: 5,
    clues: [
      { r: 0, c: 4, val: 2 },
      { r: 1, c: 1, val: 3 },
      { r: 1, c: 3, val: 2 },
      { r: 1, c: 4, val: 2 },
      { r: 2, c: 0, val: 3 },
      { r: 2, c: 2, val: 3 },
      { r: 3, c: 1, val: 4 },
      { r: 4, c: 2, val: 2 },
      { r: 4, c: 3, val: 4 },
    ],
    hint: '從最右欄的「2」和左下角的「3」開始框選，利用角落格子被哪個數字管轄來突破！',
  },
  {
    id: 'sh-2',
    title: '第二關 · 7×7',
    subtitle: '進階挑戰（10 分）',
    points: 10,
    rows: 7,
    cols: 7,
    clues: [
      { r: 0, c: 0, val: 6 },
      { r: 0, c: 1, val: 2 },
      { r: 0, c: 3, val: 5 },
      { r: 0, c: 4, val: 6 },
      { r: 0, c: 5, val: 2 },
      { r: 1, c: 5, val: 2 },
      { r: 2, c: 1, val: 2 },
      { r: 2, c: 5, val: 4 },
      { r: 3, c: 2, val: 4 },
      { r: 3, c: 6, val: 3 },
      { r: 5, c: 1, val: 3 },
      { r: 5, c: 3, val: 2 },
      { r: 5, c: 6, val: 2 },
      { r: 6, c: 0, val: 6 },
    ],
    hint: '左上角「6」被右方的「2」擋住，只能往下延伸成 1×6 或 2×3? 先看「5」只能是 1×5！',
  },
  {
    id: 'sh-3',
    title: '第三關 · 7×7',
    subtitle: '總決戰（40 分）',
    points: 40,
    rows: 7,
    cols: 7,
    clues: [
      { r: 0, c: 1, val: 2 },
      { r: 0, c: 2, val: 3 },
      { r: 0, c: 5, val: 4 },
      { r: 1, c: 1, val: 6 },
      { r: 1, c: 3, val: 8 },
      { r: 2, c: 5, val: 4 },
      { r: 3, c: 4, val: 3 },
      { r: 3, c: 6, val: 4 },
      { r: 4, c: 0, val: 3 },
      { r: 4, c: 1, val: 3 },
      { r: 4, c: 4, val: 3 },
      { r: 5, c: 2, val: 2 },
      { r: 5, c: 3, val: 2 },
      { r: 6, c: 5, val: 2 },
    ],
    hint: '注意第二列的「8」（可為 2×4 或 4×2）和「6」，以及頂排「3」往右延伸的空間！',
  },
];

export interface SlitherlinkPuzzle {
  id: string;
  title: string;
  subtitle: string;
  points: number;
  size: number;
  clues: (number | null)[][];
  solutionMask: number;
  hint: string;
}

export const SLITHERLINK_PUZZLES: SlitherlinkPuzzle[] = [
  {
    id: 'sl-1',
    title: '講義範例 · 5×5',
    subtitle: '課堂引導範例（10 分）',
    points: 10,
    size: 5,
    clues: [
      [null, null, 2, null, null],
      [3, null, null, 2, 0],
      [null, 2, null, 1, null],
      [2, 1, 1, 1, null],
      [3, 3, null, 2, null],
    ],
    solutionMask: 14649580,
    hint: '先標出「0」周圍 4 條邊都畫 ×，再從左下角的相鄰「3、3」突破！兩個相鄰的 3 必有共用中線與外圍平行線。',
  },
  {
    id: 'sl-2',
    title: '第一關 · 5×5',
    subtitle: '星際航道巡迴（30 分）',
    points: 30,
    size: 5,
    clues: [
      [null, 3, 1, 2, 2],
      [null, null, null, null, null],
      [3, 1, null, 1, null],
      [null, null, 1, 0, 2],
      [3, null, null, null, null],
    ],
    solutionMask: 29310862,
    hint: '先把右下方的「0」四週標 ×，並觀察角落的「3」（角落 3 的兩條外框邊必定要畫上！）。',
  },
  {
    id: 'sl-3',
    title: '第二關 · 5×5',
    subtitle: '終極單迴圈（40 分）',
    points: 40,
    size: 5,
    clues: [
      [null, null, 2, null, null],
      [null, 1, 1, null, 1],
      [0, 2, null, 1, null],
      [null, null, 1, null, 3],
      [1, null, null, null, 2],
    ],
    solutionMask: 11481484,
    hint: '從第 3 列最左邊的「0」開始排除，並注意右下角「2」與上方「3」在邊界的轉彎限制。',
  },
];

