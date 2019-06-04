const blessed = require('blessed');
const fs = require('fs');
const path = require('path');

const setUpMainBox = require('./main-box');

const screen = blessed.screen({
	smartCSR: true,
	title: 'TEJO Voĉo',
	fullUnicode: true,
	warnings: true,
	autoPadding: true
});

const resizeHandler = () => {
	if (screen.width < 120) {
		titleBox.width = 70;

		introBox.top = 11;
		introBox.left = 2;
		introBox.width = '100%';

		mainBox.top = 15;
		mainBox.height = '100%-15';
	} else {
		titleBox.width = '50%';

		introBox.top = 1;
		introBox.left = '50%';
		introBox.width = '50%';

		mainBox.top = 11;
		mainBox.height = '100%-11';
	}
};

const banner = fs.readFileSync(path.join(__dirname, '../banner.txt'), 'utf8');
const titleBox = blessed.box({
	parent: screen,
	top: 0,
	left: 2,
	height: 10,
	content: banner + '\n\n' +
	' '.repeat(5) + '© Mia Nordentoft 2019, MIT-permesilo'
});

const introBox = blessed.box({
	parent: screen,
	height: 10,
	content:
`Bonvenon al TEJO Voĉo, la eksterreta voĉdonsistemo de TEJO.
Por helpo pri kiel uzi la programon, premu F1.
Por eliri la programon, premu ESC aŭ ^C.`
});

const mainBox = blessed.box({
	parent: screen,
	width: '100%',
	left: 0,
	padding: 1
});
setUpMainBox(mainBox);

const yesNoQuestion = blessed.question({
	parent: screen,
	border: 'line',
	height: 'shrink',
	width: 'half',
	top: 'center',
	left: 'center'
});
yesNoQuestion._.okay.content = 'Jes';
yesNoQuestion._.cancel.content = ' Ne'; // intentional space

screen.key(['escape', 'C-c'], () => {
	yesNoQuestion.ask('Ĉu vi certas, ke vi volas eliri Voĉon?', (err, val) => {
		if (val) { process.exit(0);	}
		screen.render();
	});
});
screen.key('C-x', () => process.exit(0));

resizeHandler();
screen.on('resize', resizeHandler);
screen.render();
screen.enableMouse();
screen.enableKeys();
