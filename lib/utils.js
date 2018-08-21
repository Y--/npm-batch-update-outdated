'use strict';
const path = require('path');
const os = require('os');
const readline = require('readline');

Object.assign(module.exports, { padRight, promptYNQuestion, normalizeDir, readProcessArguments });

function padRight(s, n) {
  return s + new Array(n + 1 - s.length).join(' ');
}

function promptYNQuestion(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();

      const result = answer && answer.toLowerCase()[0] === 'y';
      return resolve(!!result);
    });
  });
}

function readProcessArguments(args) {
  const params = {};
  for (const arg of args) {
    const candidates = arg.split(':');
    const value = findMatchingArguments(candidates);
    if (value === undefined) {
      continue;
    }

    params[candidates[0]] = value || true;
  }

  return params;
}

function findMatchingArguments(candidates) {
  for (const processArg of process.argv) {
    if (!processArg.startsWith('--')) {
      continue;
    }

    for (const candidate of candidates) {
      if (processArg === `--${candidate}` || processArg.startsWith(`--${candidate}=`)) {
        return processArg.slice(candidate.length + 3);
      }
    }
  }
}

function normalizeDir(d) {
  if (!d.startsWith('/')) {
    d = path.join(process.cwd(), d);
  }
  return path.normalize(d.replace(/^~/, os.homedir()));
}
