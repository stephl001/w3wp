'use strict';

const execFile = require('child_process').execFile;
const path = require('path');

exports.getApplicationPoolInfo = function(cb) {
  var appcmdPath = path.join(process.env.windir, 'system32', 'inetsrv', 'appcmd.exe');
  execFile(appcmdPath, ['list', 'wps'], (error, stdout) => {
    if (error) {
      cb(error);
      return;
    }

    var re = /^WP \"(\d+)\" \(applicationPool:(.+)\)$/igm;
    var entries = [];
    var match;
    while ((match = re.exec(stdout)) !== null) {
      entries.push({ pid: parseInt(match[1]), appPool: match[2] });
    }
    
    cb(null, entries);
  });
};