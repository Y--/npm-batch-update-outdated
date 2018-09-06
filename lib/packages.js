'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { padRight } = require('./utils');

Object.assign(module.exports, {
  applyUpgrade,
  displayUpgrades,
  fetchOutdated,
  fetchCurrent,
  normalizeUpgrades,
  filterNormalizedUpgrades
});

function fetchOutdated(projectDir) {
  return new Promise((resolve, reject) => {
    const npm = spawn('npm', ['outdated', '--json'], { cwd: projectDir });

    const chunks = [];
    const errs = [];
    npm.stdout.on('data', (data) => chunks.push(data));

    npm.stderr.on('data', (data) => errs.push(data));

    npm.on('close', () => {
      if (errs.length) {
        return reject(new Error(Buffer.concat(errs).toString()));
      }

      const payload = Buffer.concat(chunks).toString();
      return resolve(JSON.parse(payload));
    });
  });
}

function fetchCurrent(projectDir) {
  const pack = getCurrentPackageContent(projectDir);
  const current = {};
  for (const type of ['dependencies', 'devDependencies', 'peerDependencies']) {
    if (!pack[type]) {
      continue;
    }

    for (const [p, version] of Object.entries(pack[type])) {
      current[p] = { type, version };
    }
  }
  return current;
}

function normalizeUpgrades(currents, outdated) {
  const upgradesPerType = {};
  const allUpgrades = [];
  const maxLength = {
    package: 0,
    fromVersion: 0,
    toVersion: 0
  };

  for (const [p, info] of Object.entries(outdated)) {
    const { type, version } = currents[p] || { type: 'none', version: 'none' };
    if (info.latest === 'git') {
      continue;
    }

    const to = '^' + info.latest;
    allUpgrades.push([p, version, to]);

    upgradesPerType[type] = upgradesPerType[type] || {};
    upgradesPerType[type][p] = { from: version, to };

    maxLength.package = Math.max(maxLength.package, p.length);
    maxLength.fromVersion = Math.max(maxLength.fromVersion, version.length);
    maxLength.toVersion = Math.max(maxLength.toVersion, info.latest.length);
  }

  return { allUpgrades, upgradesPerType, maxLength };
}

function filterNormalizedUpgrades(normalizedUpgrades, filtered) {
  normalizedUpgrades.allUpgrades = null;

  for (const { type, packageName } of iterateUpgrades(normalizedUpgrades.upgradesPerType)) {
    const value = filtered[packageName];
    if (!value) {
      delete normalizedUpgrades.upgradesPerType[type][packageName];
    } else {
      normalizedUpgrades.upgradesPerType[type][packageName].to = value.to;
    }
  }
}

function displayUpgrades({ upgradesPerType, maxLength }) {
  for (const [type, upgrades] of Object.entries(upgradesPerType)) {
    console.log(`--- ${type} ---`);
    for (const [p, upgrade] of Object.entries(upgrades)) {
      const pack = padRight(p, maxLength.package);
      const fromVersion = padRight(upgrade.from, maxLength.fromVersion);
      const toVersion = padRight(upgrade.to, maxLength.toVersion);
      console.log(`  ${pack} : ${fromVersion} => ${toVersion}`);
    }
  }
}

function applyUpgrade(projectDir, { upgradesPerType }) {
  const pack = getCurrentPackageContent(projectDir);
  for (const { type, packageName, to } of iterateUpgrades(upgradesPerType)) {
    pack[type][packageName] = to;
  }

  const packagePath = path.join(projectDir, 'package.json');
  const newContent = JSON.stringify(pack, null, 2) + '\n';
  fs.writeFileSync(packagePath, newContent);
  console.log(`'${packagePath}' updated.`);
}

function getCurrentPackageContent(projectDir) {
  return require(path.join(projectDir, 'package.json'));
}

function* iterateUpgrades(upgradesPerType) {
  for (const [type, upgrades] of Object.entries(upgradesPerType)) {
    for (const [packageName, upgrade] of Object.entries(upgrades)) {
      yield Object.assign({ type, packageName }, upgrade);
    }
  }
}
