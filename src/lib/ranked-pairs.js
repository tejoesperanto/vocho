const util = require('./util');

// https://hackernoon.com/the-javascript-developers-guide-to-graphs-and-detecting-cycles-in-them-96f4f619d563
function isCyclic (graph) {
	const nodes = Object.keys(graph);
	const visited = {};
	const recStack = {};

	const _isCyclic = (node, visited, recStack) => {
		if (!visited[node]) {
			visited[node] = true;
			recStack[node] = true;
			const nodeNeighbors = graph[node];
			for (let currentNode of nodeNeighbors) {
				if (
					(!visited[currentNode] && _isCyclic(currentNode, visited, recStack)) ||
					recStack[currentNode]
				) { return true; }
			}
		}
		recStack[node] = false;
		return false;
	};

	for (let node of nodes) {
		if (_isCyclic(node, visited, recStack)) {
			return true;
		}
	}
	return false;
}

/**
 * Runs a tideman ranked pairs election
 * @param {string[]|string} candidates    The candidates. Each candidate must be represented by one character
 * @param {string[]} ballots              All ballots written using tideman ranked pairs syntax
 * @param {string[]}  [ignoredCandidates] An array of candidates to ignore
 * @param {string} tieBreaker             The fully inclusive tie breaker ballot without any equals
 * @return {string} The winning candidate
 */
function RankedPairs (candidates, ballots, ignoredCandidates = [], tieBreaker) {
	if (typeof candidates === 'string') { candidates = candidates.split(''); }
	candidates.sort();

	let tieBreakerArr = [];
	if (tieBreaker) {
		ballots.push(tieBreaker);
		tieBreakerArr = tieBreaker.split('>');

		if (new Set(tieBreakerArr).size !== tieBreakerArr.length) {
			const err = new Error('The tie breaker ballot must not contain duplicate candidates');
			err.type = 'INVALID_TIE_BREAKER';
			throw err;
		}

		if (tieBreakerArr.length < candidates.length) {
			const err = new Error('The tie breaker ballot must contain all candidates');
			err.type = 'INVALID_TIE_BREAKER';
			throw err;
		}

		for (let cand of tieBreakerArr) {
			if (!candidates.includes(cand)) {
				const err = new Error(`Invalid candidate ${cand} in tie breaker`);
				err.type = 'INVALID_TIE_BREAKER';
				throw err;
			}
		}
	}

	// Create pairs
	const pairs = {};
	for (let i = 0; i < candidates.length; i++) {
		const cand1 = candidates[i];
		for (let n = i + 1; n < candidates.length; n++) {
			const cand2 = candidates[n];
			const pairName = cand1 + cand2;
			const pair = pairs[pairName] = {
				diff: 0,
				winner: null,
				loser: null
			};
			pair[cand1] = 0;
			pair[cand2] = 0;
		}
	}

	// Tally
	let blankBallots = 0;
	const candStats = {};
	for (let cand of candidates) {
		candStats[cand] = {
			won: 0,
			lost: 0,
			mentions: 0
		};
	}

	for (let ballot of ballots) {
		const alreadyMentioned = [];

		const rows = ballot
			.split('>')
			.filter(row => row.length) // Turn blank votes into an empty array
			.map(row => row.split('='));
		
		if (!rows.length) {
			blankBallots++;
			continue;
		}

		for (let y = 0; y < rows.length; y++) {
			const curRow = rows[y];

			for (let curCol of curRow) {
				if (!candidates.includes(curCol)) {
					const err = new Error(`Invalid candidate ${curCol} in ballot ${ballot}`);
					err.type = 'INVALID_BALLOT';
					throw err;
				}
				if (alreadyMentioned.includes(curCol)) {
					const err = new Error(`Duplicate candidate ${curCol} in ballot ${ballot}`);
					err.type = 'INVALID_BALLOT';
					throw err;
				}
				alreadyMentioned.push(curCol);
				candStats[curCol].mentions++;

				for (let i = y + 1; i < rows.length; i++) {
					const lesserRow = rows[i];

					for (let lesserCol of lesserRow) {
						if (lesserCol === curCol) {
							const err = new Error(`Duplicate candidate ${curCol} in ballot ${ballot}`);
							err.type = 'INVALID_BALLOT';
							throw err;
						}

						const pairName = [ curCol, lesserCol ].sort().join('');
						pairs[pairName][curCol]++;
					}
				}
			}
		}
	}

	// Check blank vote count
	util.debug(`${ballots.length} ballots cast (${blankBallots} blank)`);
	if (blankBallots >= ballots.length / 2) {
		const err = new Error('Too many blank ballots');
		err.type = 'BLANK_BALLOTS';
		throw err;
	}

	// Disqualify candidates as needed
	for (let [cand, stats] of Object.entries(candStats)) {
		const isIgnored = ignoredCandidates.includes(cand);
		const hasInsufficientMentions = stats.mentions < ballots.length / 2;

		if (isIgnored || hasInsufficientMentions) {
			candidates.splice(candidates.indexOf(cand), 1);

			for (let pairName in pairs) {
				const cands = pairName.split('');
				if (cands.includes(cand)) {
					delete pairs[pairName];
				}
			}
		}

		if (isIgnored) {
			util.debug(`${cand} is ignored in this election`);
		} else if (hasInsufficientMentions) {
			util.debug(`${cand} is disqualified due to insufficient mentions`);
		}
	}

	// Determine the results of the compared pairs
	for (let [pairName, pair] of Object.entries(pairs)) {
		const [cand1, cand2] = pairName.split('');
		pair.diff = pair[cand1] - pair[cand2];

		if (pair[cand1] > pair[cand2]) {
			candStats[cand1].won++;
			candStats[cand2].lost++;
			pair.winner = cand1;
			pair.loser = cand2;
		} else if (pair[cand2] > pair[cand1]) {
			candStats[cand2].won++;
			candStats[cand1].lost++;
			pair.winner = cand2;
			pair.loser = cand1;
		} else {
			if (!tieBreaker) {
				const err = new Error('Tie breaker needed!');
				err.type = 'TIE_BREAKER_NEEDED';
				throw err;
			}

			const cand1Index = tieBreakerArr.indexOf(cand1);
			const cand2Index = tieBreakerArr.indexOf(cand2);

			if (cand1Index < cand2Index) {
				candStats[cand1].won++;
				candStats[cand2].lost++;
				pair.winner = cand1;
				pair.loser = cand2;
			} else {
				candStats[cand2].won++;
				candStats[cand1].lost++;
				pair.winner = cand2;
				pair.loser = cand1;
			}
		}
	}

	util.debug('\nCompared pairs:');
	util.debug(pairs);

	util.debug('\nCandidate pair scores:');
	util.debug(candStats);

	// Order the pairs
	const orderedEntries = [];
	const entries = Object.entries(pairs);
	while (entries.length) {
		let maxDiff = -1;
		let maxDiffIndices = null;
		for (let i = 0; i < entries.length; i++) {
			const pair = entries[i];
			const absDiff = Math.abs(pair[1].diff);
			if (absDiff > maxDiff) {
				maxDiff = absDiff;
				maxDiffIndices = [ i ];
			} else if (absDiff === maxDiff) {
				maxDiffIndices.push(i);
			}
		}

		if (maxDiffIndices.length === 1) {
			// No tie
			const pair = entries.splice(maxDiffIndices[0], 1)[0];
			orderedEntries.push(pair);
		} else {
			// We have a tie, follow §2.10
			// Obtain the pairs, from the highest index to the lowest as to not mess up the indices when removing them
			maxDiffIndices.sort((a, b) => b - a);
			const equalPairs = maxDiffIndices.map(i => entries.splice(i, 1)[0]);

			// 1. The pair with a loser that's already listed as a loser is put first
			const loserEntries = []; // All losers that are already in the ordered pairs
			for (let i = 0; i < equalPairs.length; i++) {
				const equalPair = equalPairs[i];
				// Find the loser of the equal pair
				const equalPairLoser = equalPair[1].loser;

				// Check if the loser is already in the ordered pairs as a loser
				let hasOrderedLoser = false;
				let orderedIndex;
				for (orderedIndex = 0; orderedIndex < orderedEntries.length; orderedIndex++) {
					const orderedEntry = orderedEntries[orderedIndex];
					const orderedLoser = orderedEntry[1].loser;
					if (equalPairLoser === orderedLoser) {
						hasOrderedLoser = true;
						break;
					}
				}
				if (hasOrderedLoser) { loserEntries.push({ eqI: i, or: orderedIndex }); }
			}
			loserEntries.sort((a, b) => b.or - a.or); // Don't mess up the indices when splicing

			const newOrderedLoserEntries = [];
			for (let i = 0; i < loserEntries.length; i++) {
				const loserEntry = loserEntries[i];
				const nextLoserEntry = loserEntries[i + 1];
				if (typeof nextLoserEntry === 'undefined' || nextLoserEntry.or > loserEntry.or) {
					newOrderedLoserEntries.push(loserEntry.eqI);
				}
			}
			newOrderedLoserEntries.sort((a, b) => b - a); // Don't mess up the indices when splicing
			for (let i of newOrderedLoserEntries) {
				orderedEntries.push(equalPairs.splice(i, 1)[0]);
			}

			// 2. The pair with a winner that's already listed as a winner is put first
			const winnerEntries = []; // All winners that are already in the ordered pairs
			for (let i = 0; i < equalPairs.length; i++) {
				const equalPair = equalPairs[i];
				// Find the winner of the equal pair
				const equalPairWinner = equalPair[1].winner;

				// Check if the winner is already in the ordered pairs as a winner
				let hasOrderedWinner = false;
				let orderedIndex;
				for (orderedIndex = 0; orderedIndex < orderedEntries.length; orderedIndex++) {
					const orderedEntry = orderedEntries[orderedIndex];
					const orderedWinner = orderedEntry[1].winner;
					if (equalPairWinner === orderedWinner) {
						hasOrderedWinner = true;
						break;
					}
				}
				if (hasOrderedWinner) { winnerEntries.push({ eqI: i, or: orderedIndex }); }
			}
			winnerEntries.sort((a, b) => b.or - a.or); // Don't mess up the indices when splicing

			const newOrderedWinnerEntries = [];
			for (let i = 0; i < winnerEntries.length; i++) {
				const winnerEntry = winnerEntries[i];
				const nextWinnerEntry = winnerEntries[i + 1];
				if (typeof nextWinnerEntry === 'undefined' || nextWinnerEntry.or > winnerEntry.or) {
					newOrderedWinnerEntries.push(winnerEntry.eqI);
				}
			}
			newOrderedWinnerEntries.sort((a, b) => b - a); // Don't mess up the indices when splicing
			for (let i of newOrderedWinnerEntries) {
				orderedEntries.push(equalPairs.splice(i, 1)[0]);
			}

			if (equalPairs.length > 1) {
				// 3. The pair with a loser that is least preferred by the tie breaker ballot is put first
				if (!tieBreaker) {
					const err = new Error('Tie breaker needed!');
					err.type = 'TIE_BREAKER_NEEDED';
					throw err;
				}

				const loserPrefIndices = equalPairs.map((equalPairEntry, i) => {
					const loser = equalPairEntry[1].loser;
					return { eqI: i, or: tieBreakerArr.indexOf(loser) };
				});

				const newOrderedTieBreakerPairs = [];
				for (let i = 0; i < loserPrefIndices.length; i++) {
					const pair = loserPrefIndices[i];
					const nextPair = loserPrefIndices[i + 1];
					if (typeof nextPair === 'undefined' || nextPair.or > pair.or) {
						newOrderedTieBreakerPairs.push(pair.eqI);
					}
					newOrderedTieBreakerPairs.sort((a, b) => b - a); // Don't mess up the indices when splicing
					for (let i of newOrderedTieBreakerPairs) {
						orderedEntries.push(equalPairs.splice(i, 1)[0]);
					}
				}
			}

			// There should only be one pair remaining at this point
			orderedEntries.push(...equalPairs);
		}
	}
	util.debug('\nCompared pairs:');
	util.debug(orderedEntries);

	// Make a graph of the winning pairs
	let lock = {};
	for (let cand of candidates) {
		lock[cand] = [];
	}

	util.debug('\nLock');
	for (let entry of orderedEntries) {
		const pair = entry[1];
		const from = pair.winner;
		const to = pair.loser;

		const newLock = {...lock};
		newLock[from].push(to);
		if (isCyclic(newLock)) { continue; }
		lock = newLock;

		util.debug(`${from} → ${to}`);
	}

	// Find the candidate at the root of the graph (with nothing pointing to it)
	const possibleWinners = [...candidates];
	const candsPointedTo = new Set([].concat(...Object.values(lock)));
	for (let cand of candsPointedTo) {
		possibleWinners.splice(possibleWinners.indexOf(cand), 1);
	}
	const winner = possibleWinners[0];

	util.debug(`\nWinner: ${winner}`);

	return winner;
}

module.exports = RankedPairs;
