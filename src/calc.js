const lib = require('vocho-lib');

const commaSeparatedRegex = /[^\s,]/g;

module.exports = function performElection (electionType, candidatesStr, ballotsStr, ignoredCandidatesStr, places, tieBreaker) {
	const candidates = candidatesStr.match(commaSeparatedRegex) || [];
	const ignoredCandidates = ignoredCandidatesStr.match(commaSeparatedRegex) || [];
	if (electionType === 'STV') {
		places = parseInt(places, 10);
		if (!Number.isSafeInteger(places)) {
			return 'Nevalida kvanto de venkontoj';
		}
	}

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
	try {
		if (electionType === 'RP') {
			const results = lib.RankedPairs([...candidates], ballots, ignoredCandidates, tieBreaker);

			let resultsStr = `${results.ballots} balotiloj (${results.blankBallots} blanka(j))\n`;
			if (results.disqualifiedCandidates.length) {
				resultsStr += `Neelektitaj laŭ §2.6: ${results.disqualifiedCandidates.join(', ')}\n`;
			}
			resultsStr += `Venkinto: ${results.winner}`;
			return resultsStr;

		} else if (electionType === 'STV') {
			const results = lib.STV(places, [...candidates], ballots, ignoredCandidates, tieBreaker);

			const resultsStr =
`${results.ballots} balotiloj (${results.blankBallots} blanka(j))
Venkintoj (laŭ ordo de elektiĝo): ${results.winners.join(', ')}`;
			return resultsStr;
		} else {
			throw new Error(`Nekonata voĉdonsistemo ${electionType}`);
		}
	} catch (e) {
		if (!e || !('type' in e)) { throw e; }
		switch (e.type) {
		case 'BLANK_BALLOTS':
			return `Rezulto: Sindetene (${e.blankBallots} balotiloj el entute ${e.numBallots} estis blankaj)`;
		case 'INVALID_TIE_BREAKER':
			return 'La egalecrompa balotilo ne estis valida.';
		case 'INVALID_BALLOT':
			return 'Unu aŭ pluraj el la enmetitaj balotiloj ne estis valida(j).';
		case 'TIE_BREAKER_NEEDED':
			e.candidates = candidates;
			throw e;
		default:
			throw e;
		}
	}
};
