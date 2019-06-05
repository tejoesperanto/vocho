const lib = require('./lib');

const commaSeparatedRegex = /[^\s,]/g;

module.exports = function performElection (electionType, candidatesStr, ballotsStr, ignoredCandidatesStr, tieBreaker) {
	const candidates = candidatesStr.match(commaSeparatedRegex) || [];
	const ignoredCandidates = ignoredCandidatesStr.match(commaSeparatedRegex) || [];

	const ballots = ballotsStr
		.trim()
		.split(/\r?\n/g)
		.map(b => b.trim())
		.filter(b => b.length)
		.map(b => {
			if (b === 'blanka') { b = ''; }
			return b;
		});

	global.disableDebug = true;
	if (electionType === 'RP') {
		try {
			const results = lib.RankedPairs(candidates, ballots, ignoredCandidates, tieBreaker);

			const resultsStr =
`${results.ballots} balotiloj (${results.blankBallots} blankaj)
Venkinto: ${results.winner}`;
			return resultsStr;

		} catch (e) {
			switch (e.type) {
			case 'BLANK_BALLOTS':
				return `Rezulto: Sindetene (${e.blankBallots} balotiloj el entute ${e.numBallots} estis blankaj)`;
			default:
				throw e;
			}
		}
	} else {
		return `Nekonata voĉdonsistemo ${electionType}`;
	}
};
