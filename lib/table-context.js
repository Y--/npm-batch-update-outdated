'use strict';

const { padRight } = require('./utils');

class TableContext {
  constructor(table) {
    this.headers = table[0];
    this.table = TableContext._initTable(table);
    this.maxes = this._computeMaxCellsLength();
    this.current = 0;
    this.idxRowWidth = ('' + this.table.length).length + 1;
    this.filter = new Array(this.table.length).fill(true);
    this.hasMessage = false;
  }

  getResult() {
    const res = {};
    for (const [i, valid] of this.filter.entries()) {
      if (!valid) {
        continue;
      }

      const [id, from, to] = this.table[i];
      res[id] = { from, to };
    }

    return res;
  }

  getLine(formatter, row, idx) {
    let currentLine = TableContext.prefix;

    if (!formatter && idx !== undefined) {
      currentLine += padRight('' + idx, this.idxRowWidth);
    } else {
      currentLine += padRight('', this.idxRowWidth);
    }

    for (const [i, cell] of row.entries()) {
      currentLine += padRight(cell, this.maxes[i]);
    }
    return formatter ? formatter(currentLine) : currentLine;
  }

  getCurrentLine(formatter) {
    return this.getLine(formatter, this.table[this.current], this.current);
  }

  isEndReached() {
    return this.current === this.table.length;
  }

  get lineLength() {
    return TableContext.prefix.length + this.idxRowWidth + this.maxes.reduce((x, y) => x + y, 0) + 1;
  }

  get remainingRows() {
    return this.table.length - this.current;
  }

  next() {
    this.current++;
  }

  printTable() {
    let idx = 0;
    for (const row of this._tableWithHeaders()) {
      // eslint-disable-next-line no-console
      console.log(this.getLine(null, row, idx === 0 ? '' : idx));
      idx++;
    }
  }

  setValue(v) {
    if (!v) {
      return;
    }

    this.table[this.current][2] = v;
    this.maxes[2] = Math.max(this.maxes[2], v.length);
  }

  skipRow() {
    this.filter[this.current] = false;
  }

  *_tableWithHeaders() {
    yield this.headers;
    for (const row of this.table) {
      yield row;
    }
  }

  _computeMaxCellsLength() {
    const maxes = new Array(this.headers.length).fill(0);
    for (const row of this._tableWithHeaders()) {
      for (const [i, c] of row.entries()) {
        maxes[i] = Math.max(maxes[i], ('' + c).length);
      }
    }

    for (const [i] of maxes.entries()) {
      maxes[i]++;
    }
    return maxes;
  }

  static _initTable(table) {
    return table.map((row) => row.map((cell) => '' + cell)).slice(1);
  }

  static hideText(s) {
    return `\u001b[2m${s}\u001b[22m`;
  }

  static greenText(s) {
    return `\u001b[32m${s}\u001b[39m`;
  }
}

TableContext.prefix = '   ';
module.exports.TableContext = TableContext;
