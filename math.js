(function (root) {
  'use strict';
  const abs = n => n < 0n ? -n : n;
  function gcd(a, b) { a = abs(a); b = abs(b); while (b) [a, b] = [b, a % b]; return a; }
  class Fraction {
    constructor(n, d = 1n) {
      n = BigInt(n); d = BigInt(d);
      if (!d) throw new Error('分母不能为 0');
      if (d < 0n) { n = -n; d = -d; }
      const g = gcd(n, d); this.n = n / g; this.d = d / g;
    }
    static parse(value) {
      const s = String(value).trim().replace(/−/g, '-');
      if (!s) throw new Error('请填写数值');
      if (s.length > 60) throw new Error('单个数值请勿超过 60 个字符');
      if (s.includes('/')) {
        const p = s.split('/');
        if (p.length !== 2) throw new Error('分数格式应为 a/b');
        return Fraction.parse(p[0]).div(Fraction.parse(p[1]));
      }
      if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)) throw new Error('请输入整数、小数或分数（如 -2、0.5、1/3）');
      const sign = s.startsWith('-') ? -1n : 1n;
      const parts = s.replace(/^[+-]/, '').split('.');
      return new Fraction(sign * BigInt((parts[0] || '0') + (parts[1] || '')), 10n ** BigInt((parts[1] || '').length));
    }
    add(b) { return new Fraction(this.n * b.d + b.n * this.d, this.d * b.d); }
    sub(b) { return this.add(b.neg()); }
    mul(b) { return new Fraction(this.n * b.n, this.d * b.d); }
    div(b) { if (b.zero) throw new Error('分母不能为 0'); return new Fraction(this.n * b.d, this.d * b.n); }
    neg() { return new Fraction(-this.n, this.d); }
    get zero() { return this.n === 0n; }
    get one() { return this.n === this.d; }
    toString() { return this.d === 1n ? String(this.n) : `${this.n}/${this.d}`; }
  }
  const transpose = a => a[0].map((_, j) => a.map(r => r[j]));
  const clone = a => a.map(r => r.slice());
  function reduce(input, mode = 'row') {
    if (!['row', 'column'].includes(mode)) throw new Error('未知的简化方式');
    if (!Array.isArray(input) || !input.length || !input[0].length || input.some(r => r.length !== input[0].length)) throw new Error('矩阵必须为非空矩形');
    const parsed = input.map(r => r.map(x => x instanceof Fraction ? x : Fraction.parse(x)));
    const a = mode === 'column' ? transpose(parsed) : clone(parsed);
    const steps = [], pivots = [], letter = mode === 'column' ? 'c' : 'r';
    const entity = mode === 'column' ? '列' : '行';
    const snapshot = () => clone(mode === 'column' ? transpose(a) : a);
    const save = (type, operation, explanation, affected, pivot) => steps.push({type, operation, explanation, affected, pivot, matrix: snapshot()});
    save('initial', '原始矩阵 A', `使用初等${entity}变换，将每个主元化为 1，并把主元所在${mode === 'column' ? '行' : '列'}的其他元素消为 0。`, [], null);
    let row = 0;
    for (let col = 0; col < a[0].length && row < a.length; col++) {
      let found = row;
      while (found < a.length && a[found][col].zero) found++;
      if (found === a.length) continue;
      const pivot = mode === 'column' ? [col, row] : [row, col];
      if (found !== row) {
        [a[found], a[row]] = [a[row], a[found]];
        save('swap', `${letter}${row + 1}↔${letter}${found + 1}`, `交换第 ${row + 1} ${entity}与第 ${found + 1} ${entity}，把非零元素移到当前主元位置。`, [row, found], pivot);
      }
      const p = a[row][col];
      if (!p.one) {
        const factor = new Fraction(1n).div(p);
        a[row] = a[row].map(x => x.mul(factor));
        save('scale', `${factor}${letter}${row + 1}`, `第 ${row + 1} ${entity}乘以 ${factor}，将主元 ${p} 化为 1。`, [row], pivot);
      }
      for (let k = 0; k < a.length; k++) {
        if (k === row || a[k][col].zero) continue;
        const factor = a[k][col];
        a[k] = a[k].map((x, j) => x.sub(factor.mul(a[row][j])));
        const negative = factor.n < 0n, magnitude = negative ? factor.neg() : factor;
        save('add', `${letter}${k + 1}${negative ? '+' : '−'}${magnitude}×${letter}${row + 1}`, `用第 ${row + 1} ${entity}消去第 ${k + 1} ${entity}在当前主元${mode === 'column' ? '行' : '列'}上的元素 ${factor}。`, [k], pivot);
      }
      pivots.push(pivot); row++;
    }
    return {result: snapshot(), rank: row, steps, pivots, mode};
  }
  const api = {Fraction, reduce, transpose};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MatrixMath = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
