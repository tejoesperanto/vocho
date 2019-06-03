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

function RankedPairs (options, votes, tieBreaker) {
	if (tieBreaker) {
		if (new Set(tieBreaker).size !== options.length) {
			const err = new Error('The tie breaker vote must contain all options');
			err.type = 'INVALID_TIE_BREAKER';
			throw err;
		}

		for (let opt of tieBreaker) {
			if (!options.includes(opt)) {
				const err = new Error(`Invalid option ${opt} used in tie breaker`);
				err.type = 'INVALID_TIE_BREAKER';
				throw err;
			}
		}

		votes.push(tieBreaker);
	}

	const numVotes = votes.length;

	let blankVotes = 0;
	let optCount = {};
	for (let opt of options) { optCount[opt] = 0; }

	for (let vote of votes) {
		if (vote.length === 0) { blankVotes++; }

		for (let opt of vote) {
			if (!options.includes(opt)) {
				const err = new Error(`Invalid option ${opt} used in ballot`);
				err.type = 'INVALID_BALLOT_OPTION';
				throw err;
			}

			optCount[opt]++;
		}

		if (vote.length !== new Set(vote).size) {
			const err = new Error('Ballot contains duplicate options');
			err.type = 'DUPLICATE_BALLOT_OPTION';
			throw err;
		}
	}

	util.debug(`${numVotes} votes cast (${blankVotes} blank votes)\n`);

	// Check if the majority of votes are blank
	if (blankVotes / numVotes > 0.5) {
		const err = new Error('The majority of votes are blank');
		err.numVotes = numVotes;
		err.blankVotes = blankVotes;
		err.type = 'MAJORITY_BLANK';
		throw err;
	}

	// Disqualify options that don't appear in at least half of the ballots
	for (let [opt, count] of Object.entries(optCount)) {
		util.debugOneLine(`${opt}: listed in ${count} ballots →`);
		if (count >= numVotes / 2) {
			util.debug('  Remains');
		} else {
			util.debug('  Disqualified');

			options.splice(options.indexOf(opt), 1);

			for (let vote of votes) {
				let index = vote.indexOf(opt);
				if (index > -1) {
					vote.splice(index, 1);
				}
			}
		}
	}
	util.debug();

	// Compare all pairs
	const compPairs = [];
	const pairScores = {};
	let optIndex = 1;
	for (let opt1 of options) {
		pairScores[opt1] = {
			won: 0,
			lost: 0
		};

		// Go through all possible pairs
		for (let opt2 of options) {
			if (opt1 === opt2) { continue; }
			let opt1Count = 0;
			let opt2Count = 0;
			for (let vote of votes) {
				const opt1Pos = vote.indexOf(opt1);
				const opt2Pos = vote.indexOf(opt2);
				if (opt1Pos < opt2Pos) {
					opt1Count++;
				} else if (opt1Pos > opt2Pos) {
					opt2Count++;
				}
			}

			if (opt1Count > opt2Count) {
				pairScores[opt1].won++;
			} else if (opt2Count > opt1Count) {
				pairScores[opt1].lost++;
			} else {
				// We have a tie, request a tie breaker
				// This should only ever happen if a tie breaker hasn't been given
				const err = new Error('Tie breaker needed');
				err.type = 'TIE_BREAKER_NEEDED';
				throw err;
			}
		}

		// Go through all possible UNIQUE pairs
		for (let opt2 of options.slice(optIndex)) {
			let opt1Count = 0;
			let opt2Count = 0;
			for (let vote of votes) {
				const opt1Pos = vote.indexOf(opt1);
				const opt2Pos = vote.indexOf(opt2);
				if (opt1Pos < opt2Pos) {
					opt1Count++;
				} else if (opt1Pos > opt2Pos) {
					opt2Count++;
				}
			}

			compPairs.push({
				opt1: opt1,
				opt2: opt2,
				diff: opt1Count - opt2Count
			});
		}

		optIndex++;
	}

	util.debug('Compaired pairs:');
	util.debug(compPairs);

	const orderedPairs = [];
	while (compPairs.length) {
		let maxDiff = -1;
		let maxDiffIndices = null;
		for (let i = 0; i < compPairs.length; i++) {
			const pair = compPairs[i];

			const absDiff = Math.abs(pair.diff);
			if (absDiff > maxDiff) {
				maxDiff = absDiff;
				maxDiffIndices = [ i ];
			} else if (absDiff === maxDiff) {
				maxDiffIndices.push(i);
			}
		}

		if (maxDiffIndices.length === 1) {
			// No tie
			const pair = compPairs.splice(maxDiffIndices[0], 1)[0];
			orderedPairs.push(pair);
		} else {
			// We have a tie, follow §2.10
			// Obtain the pairs, from the highest index to the lowest as to not mess up the indices when removing them
			maxDiffIndices = maxDiffIndices.sort((a, b) => b - a);
			let pairs = maxDiffIndices.map(i => compPairs.splice(i, 1)[0]);

			// 1. The pair with a loser that's already listed as a loser is put first
			let loserPairs = [];
			for (let i = 0; i < pairs.length; i++) {
				const equalPair = pairs[i];

				// Find the loser of the equal pairs
				const equalLoser = Math.sign(equalPair.diff) === 1 ? equalPair.opt2 : equalPair.opt1;
				
				// Check if the loser is already in the ordered pairs
				let hasOrderedLoser = false;
				let orderedIndex;
				for (orderedIndex = 0; orderedIndex < orderedPairs.length; orderedIndex++) {
					const orderedPair = orderedPairs[orderedIndex];
					const orderedLoser = Math.sign(orderedPair.diff) === 1 ? orderedPair.opt2 : orderedPair.opt1;
					if (equalLoser === orderedLoser) {
						hasOrderedLoser = true;
						break;
					}
				}

				if (hasOrderedLoser) { loserPairs.push({ eqI: i, or: orderedIndex }); }
			}

			loserPairs = loserPairs.sort((a, b) => b.or - a.or);

			let newOrderedLoserPairs = [];
			for (let i = 0; i < loserPairs.length; i++) {
				const loserPair = loserPairs[i];
				const nextLoserPair = loserPairs[i + 1];
				if (typeof nextLoserPair === 'undefined' || nextLoserPair.or > loserPair.or) {
					newOrderedLoserPairs.push(loserPair.eqI);
				}
			}
			newOrderedLoserPairs = newOrderedLoserPairs.sort((a, b) => b - a);
			for (let i of newOrderedLoserPairs) {
				orderedPairs.push(pairs.splice(i, 1)[0]);
			}

			if (pairs.length > 1) {
				// 2. The pair with a winner that's already listed as a winner is put first
				let winnerPairs = [];
				for (let i = 0; i < pairs.length; i++) {
					const equalPair = pairs[i];

					// Find the winner of the equal pairs;
					const equalWinner = Math.sign(equalPair.diff) === 1 ? equalPair.opt1 : equalPair.opt2;

					// Check if the winner is already in the ordered pairs
					let hasOrderedWinner = false;
					let orderedIndex;
					for (orderedIndex = 0; orderedIndex < orderedPairs.length; orderedIndex++) {
						const orderedPair = orderedPairs[orderedIndex];
						const orderedWinner = Math.sign(orderedPair.diff) === 1 ? orderedPair.opt1 : orderedPair.opt2;
						if (equalWinner === orderedWinner) {
							hasOrderedWinner = true;
							break;
						}
					}

					if (hasOrderedWinner) { winnerPairs.push({ eqI: i, or: orderedIndex }); }
				}

				winnerPairs = winnerPairs.sort((a, b) => b.or - a.or);

				let newOrderedWinnerPairs = [];
				for (let i = 0; i < winnerPairs.length; i++) {
					const winnerPair = winnerPairs[i];
					const nextWinnerPair = winnerPairs[i + 1];
					if (typeof nextWinnerPair === 'undefined' || nextWinnerPair.or > winnerPair.or) {
						newOrderedWinnerPairs.push(winnerPair.eqI);
					}
				}
				newOrderedWinnerPairs = newOrderedWinnerPairs.sort((a, b) => b - a);
				for (let i of newOrderedWinnerPairs) {
					orderedPairs.push(pairs.splice(i, 1)[0]);
				}
			}

			if (pairs.length > 1) {
				// 3. The pair with a loser that is least preferred by the tie breaker ballot is put first

				if (!tieBreaker) {
					const err = new Error('Tie breaker needed');
					err.type = 'TIE_BREAKER_NEEDED';
					throw err;
				}

				const loserPrefIndices = pairs.map((pair, i) => {
					const loser = Math.sign(pair.diff) === 1 ? pair.opt2 : pair.opt1;
					return { eqI: i, or: tieBreaker.indexOf(loser) };
				});

				let newOrderedTieBreakerPairs = [];
				for (let i = 0; i < loserPrefIndices.length; i++) {
					const pair = loserPrefIndices[i];
					const nextPair = loserPrefIndices[i + 1];
					if (typeof nextPair === 'undefined' || nextPair.or > pair.or) {
						newOrderedTieBreakerPairs.push(pair.eqI);
					}
					newOrderedTieBreakerPairs = newOrderedTieBreakerPairs.sort((a, b) => b - a);
					for (let i of newOrderedTieBreakerPairs) {
						orderedPairs.push(pairs.splice(i, 1)[0]);
					}
				}
			}

			// There should only be one pair remaining at this point
			orderedPairs.push(...pairs);
		}
	}

	util.debug('\nOrdered pairs:');
	util.debug(orderedPairs);

	// Make a graph of the winning pairs
	util.debug('\nLock graph:');
	let lock = {};
	for (let option of options) {
		lock[option] = [];
	}

	for (let pair of orderedPairs) {
		const sign = Math.sign(pair.diff) === 1;
		const from = sign ? pair.opt1 : pair.opt2;
		const to = sign ? pair.opt2 : pair.opt1;

		const newLock = {...lock};
		newLock[from].push(to);
		if (isCyclic(newLock)) { continue; }

		lock = newLock;
		util.debug(`${from} →  ${to}`);
	}

	util.debug(lock);

	// Find the option which no other option points to = the winner
	const possibleWinners = [...options];
	const opts = new Set([].concat(...Object.values(lock)));
	for (let opt of opts.values()) {
		possibleWinners.splice(possibleWinners.indexOf(opt), 1);
	}
	const winner = possibleWinners[0];

	util.debug(`\nRoot of graph = Winner: ${winner}`);

	return winner;
}

module.exports = RankedPairs;
