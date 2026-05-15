// --- 状態管理 ---
let SIZE = 9;
let cellsData = [];
let hConstraints = [];
let vConstraints = [];
let selectedCellIndex = null;

// --- サービスワーカーの登録 (PWA) ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(console.error);
}

// --- 初期化処理 ---
function initBoard(newSize) {
  SIZE = newSize;
  cellsData = Array(SIZE * SIZE).fill(0);
  hConstraints = Array(SIZE * (SIZE - 1)).fill(0);
  vConstraints = Array((SIZE - 1) * SIZE).fill(0);
  selectedCellIndex = null;

  // 8x8マスの時は、3x3ブロック判定の設定項目を非表示にする
  const blockRuleContainer = document.getElementById('block-rule-container');
  if (SIZE === 8) {
    blockRuleContainer.classList.add('hidden');
  } else {
    blockRuleContainer.classList.remove('hidden');
  }

  const board = document.getElementById('board');
  board.innerHTML = '';
  board.className = `board size-${SIZE}`;

  const gridSize = SIZE * 2 - 1;

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const isCellRow = r % 2 === 0;
      const isCellCol = c % 2 === 0;

      if (isCellRow && isCellCol) {
        const cellIdx = (r / 2) * SIZE + (c / 2);
        const el = document.createElement('div');
        el.className = 'cell';
        el.id = `cell-${cellIdx}`;
        el.addEventListener('click', () => selectCell(cellIdx));
        board.appendChild(el);
      } else if (isCellRow && !isCellCol) {
        const hIdx = (r / 2) * (SIZE - 1) + Math.floor(c / 2);
        const el = document.createElement('div');
        el.className = 'constraint';
        el.id = `h-${hIdx}`;
        el.addEventListener('click', () => toggleHConstraint(hIdx));
        board.appendChild(el);
      } else if (!isCellRow && isCellCol) {
        const vIdx = Math.floor(r / 2) * SIZE + (c / 2);
        const el = document.createElement('div');
        el.className = 'constraint';
        el.id = `v-${vIdx}`;
        el.addEventListener('click', () => toggleVConstraint(vIdx));
        board.appendChild(el);
      } else {
        board.appendChild(document.createElement('div'));
      }
    }
  }

  const keypad = document.getElementById('keypad');
  keypad.innerHTML = '';
  for (let i = 1; i <= SIZE; i++) {
    const btn = document.createElement('button');
    btn.className = 'key';
    btn.dataset.val = i;
    btn.textContent = i;
    keypad.appendChild(btn);
  }
  const clearBtn = document.createElement('button');
  clearBtn.className = 'key key-clear';
  clearBtn.dataset.val = 0;
  clearBtn.textContent = '消去';
  keypad.appendChild(clearBtn);
}

// --- UI操作イベント ---
function selectCell(idx) {
  if (selectedCellIndex !== null) {
    const prevEl = document.getElementById(`cell-${selectedCellIndex}`);
    if (prevEl) prevEl.classList.remove('selected');
  }
  selectedCellIndex = idx;
  document.getElementById(`cell-${idx}`).classList.add('selected');
}

function toggleHConstraint(idx) {
  hConstraints[idx] = (hConstraints[idx] + 1) % 3;
  const signs = ['', 'keyboard_arrow_left', 'keyboard_arrow_right'];
  document.getElementById(`h-${idx}`).textContent = signs[hConstraints[idx]];
}

function toggleVConstraint(idx) {
  vConstraints[idx] = (vConstraints[idx] + 1) % 3;
  const signs = ['', 'keyboard_arrow_up', 'keyboard_arrow_down'];
  document.getElementById(`v-${idx}`).textContent = signs[vConstraints[idx]];
}

document.getElementById('keypad').addEventListener('click', (e) => {
  if (!e.target.classList.contains('key') || selectedCellIndex === null) return;
  const val = parseInt(e.target.dataset.val, 10);
  cellsData[selectedCellIndex] = val;
  const el = document.getElementById(`cell-${selectedCellIndex}`);
  el.textContent = val === 0 ? '' : val;
  el.classList.remove('solved');
});

document.getElementById('size-8').addEventListener('change', () => initBoard(8));
document.getElementById('size-9').addEventListener('change', () => initBoard(9));

// --- バックトラッキング・ソルバー ---
function isValid(board, r, c, val) {
  // 1. 行・列の重複チェック
  for (let i = 0; i < SIZE; i++) {
    if (board[r * SIZE + i] === val && i !== c) return false;
    if (board[i * SIZE + c] === val && i !== r) return false;
  }

  // 2. 3x3ブロックの重複チェック（9x9かつチェックボックスONの時のみ動作）
  const useBlockRule = document.getElementById('use-block-rule').checked;
  if (SIZE === 9 && useBlockRule) {
    const boxRowStart = Math.floor(r / 3) * 3;
    const boxColStart = Math.floor(c / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const curR = boxRowStart + i;
        const curC = boxColStart + j;
        if (board[curR * SIZE + curC] === val && (curR !== r || curC !== c)) {
          return false;
        }
      }
    }
  }

  // 3. 横方向の不等号チェック
  if (c < SIZE - 1) {
    const hIdx = r * (SIZE - 1) + c;
    const nextVal = board[r * SIZE + (c + 1)];
    if (nextVal !== 0) {
      if (hConstraints[hIdx] === 1 && val >= nextVal) return false;
      if (hConstraints[hIdx] === 2 && val <= nextVal) return false;
    }
  }
  if (c > 0) {
    const hIdx = r * (SIZE - 1) + (c - 1);
    const prevVal = board[r * SIZE + (c - 1)];
    if (prevVal !== 0) {
      if (hConstraints[hIdx] === 1 && prevVal >= val) return false;
      if (hConstraints[hIdx] === 2 && prevVal <= val) return false;
    }
  }

  // 4. 縦方向の不等号チェック
  if (r < SIZE - 1) {
    const vIdx = r * SIZE + c;
    const nextVal = board[(r + 1) * SIZE + c];
    if (nextVal !== 0) {
      if (vConstraints[vIdx] === 1 && val >= nextVal) return false;
      if (vConstraints[vIdx] === 2 && val <= nextVal) return false;
    }
  }
  if (r > 0) {
    const vIdx = (r - 1) * SIZE + c;
    const prevVal = board[(r - 1) * SIZE + c];
    if (prevVal !== 0) {
      if (vConstraints[vIdx] === 1 && prevVal >= val) return false;
      if (vConstraints[vIdx] === 2 && prevVal <= val) return false;
    }
  }

  return true;
}

function solve() {
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (cellsData[i] === 0) {
      const r = Math.floor(i / SIZE);
      const c = i % SIZE;
      for (let val = 1; val <= SIZE; val++) {
        if (isValid(cellsData, r, c, val)) {
          cellsData[i] = val;
          if (solve()) return true;
          cellsData[i] = 0;
        }
      }
      return false;
    }
  }
  return true;
}

// --- ボタンイベント ---
document.getElementById('solve-btn').addEventListener('click', () => {
  const backup = [...cellsData];
  if (solve()) {
    for (let i = 0; i < SIZE * SIZE; i++) {
      const el = document.getElementById(`cell-${i}`);
      el.textContent = cellsData[i];
      if (backup[i] === 0) el.classList.add('solved');
    }
  } else {
    alert('解が見つかりませんでした。条件を見直してください。');
    cellsData = backup;
  }
});

document.getElementById('clear-btn').addEventListener('click', () => {
  initBoard(SIZE);
});

initBoard(9);
