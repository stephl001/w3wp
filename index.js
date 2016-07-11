'use strict';

let _ = require('lodash');
let perfmon = require('perfmon');
let appPools = require('./lib/appPools');

const DefaultMaxEntries = 20;

module.exports = function (maxEntries) {
  let W3wp = function () { };

  let processInformations = [];
  let currentHash = 0;
  let lastHash = 0;

  let suffixes = [''];
  suffixes = _.concat(suffixes, _.map(_.range(1, maxEntries || DefaultMaxEntries), i => `#${i}`));

  let counterNames = _.map(suffixes, s => `Process(w3wp${s})\\ID Process`);
  perfmon(counterNames, (e, d) => {
    if (e || (d === undefined)) {
      return;
    }

    let names = Object.keys(d.counters);
    let validCounterNames = _.filter(names, n => d.counters[n] > 0);
    let newProcessInformations = _.map(validCounterNames, n => createCounterInfo(n, d.counters[n]));
    updateProcessinformations(newProcessInformations);
  });

  let processPattern = /Process\(([^\)]+)\)\\ID Process$/i;
  function createCounterInfo(counterName, counterValue) {
    return {
      processName: counterName.match(processPattern)[1],
      pid: counterValue
    };
  }

  function updateProcessinformations(newInfo) {
    lastHash = calculateHash(_.map(newInfo, pi => pi.pid));
    if (lastHash != currentHash) {
      var tmpHash = currentHash;
      currentHash = lastHash;

      appPools.getApplicationPoolInfo((e, entries) => {
        if (e) {
          currentHash = tmpHash;
          return;
        }

        processInformations = _.map(newInfo, pi => {
          var foundEntry = _.find(entries, { pid: pi.pid });
          if (foundEntry !== undefined) {
            return { processName: _.toLower(pi.processName), pid: pi.pid, appPoolName: foundEntry.appPool };
          }

          return pi;
        });
      });
    }
  }

  function calculateHash(pids) {
    return _.reduce(pids, function (hash, pid) {
      return (hash ^ pid);
    }, 0);
  }

  W3wp.prototype.getAppPoolName = function (name) {
    let entry = _.find(processInformations, { processName: _.toLower(name) });
    if (entry === undefined) {
      return name;
    }

    return entry.appPoolName;
  };

  W3wp.prototype.getEntries = function () {
    return processInformations;
  };

  return new W3wp();
};