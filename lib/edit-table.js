'use strict';

const { padRight } = require('./utils');
const { TableContext } = require('./table-context');
const readline = require('readline');
const semver = require('semver');

Object.assign(module.exports, { editTable });

function editTable(inputTable) {
  return new Promise((resolve, reject) => _editTable(inputTable, (err, res) => (err ? reject(err) : resolve(res))));
}

function _editTable(inputTable, done) {
  const ctx = new TableContext(inputTable);
  ctx.printTable();

  process.stdin.on('data', onUserInput);
  process.on('SIGINT', onSigInt);

  readline.moveCursor(process.stdout, 0, -1 * ctx.table.length);
  process.stdout.write('->');
  readline.moveCursor(process.stdout, ctx.lineLength - 2, 0);

  function onUserInput(buffer) {
    const line = buffer.toString(undefined, 0, buffer.length - 1);

    const { action, count, value, retry } = decodeInput(line);
    if (retry) {
      const msg = `Input '${line}' is not valid, please enter Y{repeat},N{repeat} or a valid version.`;
      writeMessageAt(msg, ctx.remainingRows);

      readline.moveCursor(process.stdout, ctx.lineLength, -1);
      ctx.hasMessage = true;
      return readline.clearLine(process.stdout, 1);
    }

    if (ctx.hasMessage) {
      writeMessageAt(null, ctx.remainingRows);
      ctx.hasMessage = false;
    }

    readline.moveCursor(process.stdout, line.length * -1, -1);
    process.stdout.write('  ');
    readline.moveCursor(process.stdout, -2, 0);

    const formatter = action === 'keep' ? TableContext.greenText : TableContext.hideText;
    const nbLineToEdit = count === -1 ? ctx.remainingRows : count;
    for (let i = 0; i < nbLineToEdit; ++i) {
      ctx.setValue(value);

      if (action === 'remove') {
        ctx.skipRow();
      }

      process.stdout.write(ctx.getCurrentLine(formatter));
      readline.moveCursor(process.stdout, 0, 1);
      readline.cursorTo(process.stdout, 0);

      ctx.next();
    }

    if (ctx.isEndReached()) {
      process.stdin.removeListener('data', onUserInput);
      process.stdin.pause();
      const res = ctx.getResult();
      return done(null, res);
    }

    // Renumber rows
    readline.moveCursor(process.stdout, 3, 0);
    for (let i = 0; i < ctx.remainingRows; ++i) {
      process.stdout.write(padRight('' + (i + 1), ctx.idxRowWidth));
      readline.moveCursor(process.stdout, -1 * ctx.idxRowWidth, 1);
    }

    readline.moveCursor(process.stdout, 0, -1 * ctx.remainingRows);
    readline.cursorTo(process.stdout, 0);

    process.stdout.write('->');
    readline.moveCursor(process.stdout, ctx.lineLength - 2, 0);
  }

  function onSigInt() {
    readline.moveCursor(process.stdout, 0, ctx.remainingRows + (ctx.hasMessage ? 1 : 0));
    readline.cursorTo(process.stdout, 0);
    console.log('\nAborted, bye!');
    process.exit(0);
  }
}

function writeMessageAt(msg, offset) {
  readline.moveCursor(process.stdout, 0, offset);
  readline.cursorTo(process.stdout, 0);
  readline.clearLine(process.stdout, 1);
  if (msg) {
    process.stdout.write(msg);
  }
  readline.cursorTo(process.stdout, 0);
  readline.moveCursor(process.stdout, 0, -1 * offset);
}

function decodeInput(input) {
  const result = { action: 'keep', count: 1, value: null };
  if (!input) {
    return result;
  }

  const lcRes = input.toLowerCase();
  const first = lcRes[0];
  if (first === 'n' || first === 'y') {
    const count = getRepeatedCount(lcRes.slice(1));
    const action = first === 'n' ? 'remove' : 'keep';
    return { action, count, value: null };
  }

  if (!semver) {
    result.value = input;
    return result;
  }

  const cleaned = semver.valid(semver.clean(input));
  if (!cleaned) {
    return { retry: true };
  }

  result.value = cleaned;
  return result;
}

function getRepeatedCount(input) {
  if (input[0] === 'a') {
    return -1;
  }

  return parseInt(input, 10) || 1;
}
