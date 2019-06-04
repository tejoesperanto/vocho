const lib = require('./lib');
const RankedPairs = lib.RankedPairs;

const opts = [ 'M', 'N', 'C', 'K' ];

const votes = [];
for (let i = 0; i < 42; i++) {
	votes.push('M>N>C>K');
}
for (let i = 0; i < 26; i++) {
	votes.push('N>C>K>M');
}
for (let i = 0; i < 15; i++) {
	votes.push('C>K>N>M');
}
for (let i = 0; i < 17; i++) {
	votes.push('K>C>N>M');
}

const tieBreaker = 'K>M>N>C';

RankedPairs(opts, votes, [], tieBreaker);
