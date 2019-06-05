const util = require('./util');

/**
 * Runs a Single Transferable Vote election
 * @param {number}          places       The number of electable candidates (seats)
 * @param {string[]|string} candidates   The candidates. Each candidate must be represented by one character
 * @param {string[]}        ballots      All ballots
 * @param {string}          [tieBreaker] A tie breaker listing all candidates
 * @returns {Object}
 */
function STV (places, candidates, ballots, tieBreaker) {
	if (typeof candidates === 'string') { candidates = candidates.split(''); }
	places = Math.min(places, candidates.length); // We can't elect a ghost

	// Validate the tie breaker
	if (typeof tieBreaker !== 'undefined') {
		for (let pref of tieBreaker) {
			if (new Set(tieBreaker).size !== tieBreaker.length) {
				const err = new Error('Duplicate candidates in tie breaker');
				err.type = 'INVALID_TIE_BREAKER';
				throw err;
			}
			if (tieBreaker.length !== candidates.length) {
				const err = new Error('Tie breaker vote must contain all candidates');
				err.type = 'INVALID_TIE_BREAKER';
				throw err;
			}
			if (!candidates.includes(pref)) {
				const err = new Error(`Invalid candidate ${pref} in tie breaker`);
				err.type = 'INVALID_TIE_BREAKER';
				throw err;
			}
		}
	}

	const originalBallots = [ ...ballots ];
	const weightedBallots = ballots.map(ballot => {
		return {
			weight: 1,
			prefs: ballot
		};
	});

	const quota = ballots.length / (places + 1); // Hagenbach-Bischoff

	let blankBallots = 0;

	// Validate the ballots
	for (let ballot of ballots) {
		if (ballot.length === 0) {
			blankBallots++;
			continue;
		}

		const alreadyMentioned = [];
		for (let pref of ballot) {
			if (!candidates.includes(pref)) {
				const err = new Error(`Invalid candidate ${pref} in ballot ${ballot}`);
				err.type = 'INVALID_BALLOT';
				throw err;
			}
			if (alreadyMentioned.includes(pref)) {
				const err = new Error(`Duplicate candidates ${pref} in ballot ${ballot}`);
				err.type = 'INVALID_BALLOT';
				throw err;
			}
			alreadyMentioned.push(pref);
		}
	}

	// Check blank vote count
	util.debug(`${ballots.length} ballots cast (${blankBallots} blank)`);
	if (blankBallots >= ballots.length / 2) {
		const err = new Error('Too many blank ballots');
		err.type = 'BLANK_BALLOTS';
		err.numBallots = ballots.length;
		err.blankBallots = blankBallots;
		throw err;
	}

	util.debug(`There are ${places} places and ${candidates.length} candidates`);
	util.debug(`Election quota: ${quota}`);

	const electedCandidates = [];
	// Determine the amount of votes each candidate has based on everyone's first preference
	const candidateVotes = {};
	for (let cand of candidates) { candidateVotes[cand] = 0; }
	for (let ballot of ballots) {
		const firstPref = ballot[0];
		candidateVotes[firstPref]++;
	}

	let round = 0;
	while (electedCandidates.length < places && round < 6) { // TODO: Remove round limit
		util.debug(`\nRound ${round + 1}:`);
		round++;

		util.debug(`Valid candidates: ${candidates.join(', ')}`);

		const votesDebug = [];
		const exceedsQuota = [];
		util.debug('Votes for each candidate:');
		for (let [cand, votes] of Object.entries(candidateVotes)) {
			votesDebug.push(`${cand}: ${votes}`);
			if (votes > quota) { exceedsQuota.push(cand); }
		}
		util.debug(votesDebug.join(', '));
		electedCandidates.push(...exceedsQuota);

		util.debug('Ballots:');
		util.debug(weightedBallots);

		// § 3.7: Check if the amount of remaining candidates is equal to the amount of remaining places, and if so elect all remaining candidates
		if (places - electedCandidates.length === candidates.length) {
			// Elect all remaining candidates
			electedCandidates.push(...candidates);
			util.debug(`Elected all remaining candidates: ${candidates.join(', ')}`);
			break;
		}
		
		if (exceedsQuota.length) {
			util.debug(`Elected candidates: ${exceedsQuota.join(', ')}`);
		} else {
			util.debug('No candidates elected');
		}

		// Transfer surplus votes
		// Calculate the surplus transfer value using the Gregory method
		for (let cand of exceedsQuota) {
			const votesReceived = candidateVotes[cand];

			// Find all ballots that listed the candidate as the first priority
			const firstPrefBallots = [];
			for (let ballot of weightedBallots) {
				if (ballot.prefs[0] !== cand) { continue; }
				firstPrefBallots.push(ballot);
			}
			const totalCandVoteValue = firstPrefBallots.map(b => b.weight).reduce((a, b) => a + b, 0);
			const transferValueFactor = (totalCandVoteValue - quota) / totalCandVoteValue;

			for (let ballot of firstPrefBallots) {
				// Change the value of each relevant ballot
				ballot.weight *= transferValueFactor;
			}

			// Remove elected candidates from the array of candidates
			candidates.splice(candidates.indexOf(cand), 1);
			delete candidateVotes[cand];

			// Remove all mentions of the candidate from ballots
			for (let ballot of weightedBallots) {
				ballot.prefs = ballot.prefs.replace(cand, '');
			}

			const transferTo = {};
			for (let ballot of firstPrefBallots) {
				// Count the second priorities of all relevant ballots
				const nextPref = ballot.prefs[0];
				if (!nextPref) { continue; } // Ignore the vote if there's no next priority
				if (!(nextPref in transferTo)) { transferTo[nextPref] = 1; }
				else { transferTo[nextPref]++; }
			}

			// Transfer the votes
			for (let [to, votes] of Object.entries(transferTo)) {
				const newVotes = (votesReceived - quota) / votesReceived * votes;
				candidateVotes[to] += newVotes;
			}
		}

		if (!exceedsQuota.length) { // No candidate elected, time to eliminate someone
			// § 3.11, eliminate the candidate with the least voices
			let minVotes = Number.MAX_SAFE_INTEGER;
			let minVotesCands = null;
			for (let [cand, votes] of Object.entries(candidateVotes)) {
				if (votes < minVotes) {
					minVotes = votes;
					minVotesCands = [ cand ];
				} else if (votes === minVotes) {
					minVotesCands.push(cand);
				}
			}

			let eliminatedCand;
			if (minVotesCands.length === 1) { // No tie
				eliminatedCand = minVotesCands[0];
			} else {
				// § 3.11 If multiple candidates have the same amount of votes, eliminate the one with the least first priorities,
				// then second priorities etc. in the ORIGINAL ballots.
				// If there is still equality, a tie breaker is needed, whose least preferred of the relevant candidates is to be eliminated

				let priorityNum = -1;
				while (minVotesCands.length > 1 && priorityNum < candidates.length) {
					priorityNum++;

					let numPriorities = Number.MAX_SAFE_INTEGER;
					let numPrioritiesCands = null;
					for (let cand of minVotesCands) {
						// Find all ballots with the candidate at this priority level
						let candNumPriorities = 0;
						for (let ballot of originalBallots) {
							if (ballot[priorityNum] !== cand) { continue; }
							candNumPriorities++;
						}
						if (candNumPriorities < numPriorities) {
							numPriorities = candNumPriorities;
							numPrioritiesCands = [ cand ];
						} else {
							numPrioritiesCands.push(cand);
						}
					}

					if (numPrioritiesCands.length === 1) {
						minVotesCands = numPrioritiesCands;
					}
				}

				// Check if we've found a candidate to eliminate
				if (minVotesCands.length === 1) {
					eliminatedCand = minVotesCands[0];
				} else {
					// Nope, there's still equality. This calls for a tie breaker
					if (!tieBreaker) {
						const err = new Error('Tie breaker needed!');
						err.type = 'TIE_BREAKER_NEEDED';
						throw err;
					}
					// The least preferred candidate according to the tie breaker is eliminated
					const preferenceIndices = minVotesCands.map(cand => {
						return {
							cand: cand,
							index: tieBreaker.indexOf(cand)
						};
					});
					eliminatedCand = preferenceIndices
						.reduce((a, b) => {
							if (a.index > b.index) { return a; }
							return b;
						})
						.cand;
				}
			}

			// Transfer the voices of the eliminated candidate
			for (let ballot of weightedBallots) {
				// Find all ballots that have the eliminated candidate as their first priority
				if (ballot.prefs[0] !== eliminatedCand) { continue; }
				// Find their next preference
				const nextPref = ballot.prefs[1];
				if (!nextPref) { continue; } // Unless there is none
				candidateVotes[nextPref] += ballot.weight;
			}

			// Remove eliminated candidates from the array of candidates
			candidates.splice(candidates.indexOf(eliminatedCand), 1);
			delete candidateVotes[eliminatedCand];

			// Remove all mentions of the candidate from ballots
			for (let ballot of weightedBallots) {
				ballot.prefs = ballot.prefs.replace(eliminatedCand, '');
			}

			util.debug(`Eliminated candidate: ${eliminatedCand}`);
		}
	}

	util.debug(`\n\nDone!\nElected: ${electedCandidates.join(', ')}`);

	util.debug('Remaining ballots:');
	util.debug(weightedBallots);

	return {
		ballots: ballots.length,
		blankBallots: blankBallots,
		winners: electedCandidates
	};
}

module.exports = STV;
