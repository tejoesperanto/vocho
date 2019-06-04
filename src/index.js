const lib = require('./lib');
const RankedPairs = lib.RankedPairs;

const cands = 'BKMS';

const ballots = [];
for (let i = 0; i < 60; i++) {
	ballots.push('B>K>M>S');
}
for (let i = 0; i < 45; i++) {
	ballots.push('S>K>M>B');
}
for (let i = 0; i < 40; i++) {
	ballots.push('M>K>S>B');
}
for (let i = 0; i < 35; i++) {
	ballots.push('K>M>B>S');
}

RankedPairs(cands, ballots, 'K');
