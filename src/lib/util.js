const ENV = process.env.NODE_ENV || 'dev';

function debug (...obj) {
	if (ENV === 'dev') {
		return console.log(...obj);
	}
}

function debugOneLine (...obj) {
	if (ENV === 'dev') {
		return process.stdout.write(...obj);
	}
}

module.exports = {
	debug: debug,
	debugOneLine: debugOneLine
};
