var MergeBot = require('./mergebot');

function Logger() {
};

Logger.log = function log(consoleLog) {
	if (global.debug == false) { return }
	console.log(consoleLog)
}

module.exports = Logger;