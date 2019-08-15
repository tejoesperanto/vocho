const lib = require('vocho-lib');
const table = require('table').table;
const style = require('ansi-styles');

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
		.map(b => b.replace(/\s/g, ''))
		.filter(b => b.length)
		.map(b => {
			if (b === 'blanka') { b = ''; }
			return b;
		});

	global.disableDebug = true;
	try {
		let results;

		if (electionType === 'RP') {
			results = lib.RankedPairs([...candidates], ballots, ignoredCandidates, tieBreaker);
		} else if (electionType === 'STV') {
			results = lib.STV(places, [...candidates], ballots, ignoredCandidates, tieBreaker);
		}

		let resultsText = `${results.ballots} balotiloj kalkulitaj, ${results.blankBallots} blanka(j)`;

		if (ignoredCandidates.length) {
			resultsText += `\n\nIgnorataj kandidatoj: ${ignoredCandidates.join(', ')}`;
		}

		if (electionType === 'RP') {
			if (results.disqualifiedCandidates.length) {
				const disc_cands = results.disqualifiedCandidates.map(c => `${c} (${results.candStats[c].mentions} mencioj)`);
				resultsText += `\n\nNeelektitaj laŭ §2.6: ${disc_cands.join(', ')}\n`;
			}

			const comparedPairsTableData = [[]];
			for (let th of [ 'Paro', 'Gajnanto', 'Diferenco' ]) {
				comparedPairsTableData[0].push(`${style.bold.open}${th}${style.bold.close}`);
			}

			for (let [pairName, pair] of results.rankedPairs) {
				const cand1 = pairName[0];
				const cand2 = pairName[1];

				comparedPairsTableData.push([
					`${cand1} (${pair[cand1]}) kontraŭ ${cand2} (${pair[cand2]})`,
					pair['winner'],
					Math.abs(pair['diff'])
				]);
			}

			resultsText += '\n\nKomparitaj paroj:\n' + table(comparedPairsTableData);

			const graphTableData = [[]];
			for (let th of [ 'De', 'Al' ]) {
				graphTableData[0].push(`${style.bold.open}${th}${style.bold.close}`);
			}

			for (let [from, to] of Object.entries(results.graph)) {
				graphTableData.push([
					from, to.join(', ')
				]);
			}

			resultsText += '\n\nGrafeo:\n' + table(graphTableData);

			resultsText += `\n\nVenkinto: ${results.winner}`;
		} else if (electionType === 'STV') {
			resultsText += `\nElektiĝkvoto: ${results.quota.toFixed(3)}`;

			const votesTableData = [['Voĉdoneblo']];
			for (let i = 0; i < results.rounds.length; i++) {
				votesTableData[0].push(`${i + 1}-a vico`);
			}

			for (let cand of candidates) {
				const row = [ cand ];
				votesTableData.push(row);

				for (let round of results.rounds) {
					if (!(cand in round.votes)) {
						row.push('');
						continue;
					}
					const votes = round.votes[cand];
					const votesRounded = votes.toFixed(3);

					let col;
					if (round.elected.includes(cand)) {
						col = `${style.bold.open}${style.green.open}${votesRounded}${style.green.close}${style.bold.close}`;
					} else if (cand === round.eliminated) {
						col = `${style.bold.open}${style.red.open}${votesRounded}${style.red.close}${style.bold.close}`;
					} else {
						col = votesRounded;
					}

					row.push(col);
				}
			}

			resultsText += '\n\n' + table(votesTableData);

			resultsText += '\n\nVenkintoj (laŭ ordo de elektiĝo):\n' + results.winners.join(', ');
		}

		return resultsText;
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
