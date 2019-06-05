const ENV = process.env.NODE_ENV || 'dev';

function debug (...obj) {
	if (ENV === 'dev' && !global.disableDebug) {
		return console.log(...obj);
	}
}

function debugOneLine (...obj) {
	if (ENV === 'dev' && !global.disableDebug) {
		return process.stdout.write(...obj);
	}
}

module.exports = {
	debug: debug,
	debugOneLine: debugOneLine
};
