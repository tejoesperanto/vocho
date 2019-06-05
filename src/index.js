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

process.on('uncaughtException', err => {
	screen.destroy();
	throw err;
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
Por helpo pri kiel uzi la programon, premu F12.
Por eliri la programon, premu ESC.`
});

const mainBox = blessed.box({
	parent: screen,
	width: '100%',
	left: 0,
	padding: 1
});

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

const fullPrompt = blessed.prompt({
	parent: screen,
	border: 'line',
	height: '100%',
	width: '100%',
	top: 'center',
	left: 'center'
});
fullPrompt._.okay.content = ' Enmeti'; // intentional space
fullPrompt._.okay.width = 8;
fullPrompt._.okay.top++;
fullPrompt._.cancel.content = ' Nuligi'; // intentional space
fullPrompt._.cancel.left++;
fullPrompt._.cancel.top++;
fullPrompt._.input.top++;

const helpScreen = blessed.box({
	parent: screen,
	border: 'line',
	label: 'Helpo',
	content: fs.readFileSync(path.join(__dirname, '../help.txt'), 'utf8'),
	padding: 1,
	tags: true,
	hidden: true
});

setUpMainBox(mainBox, fullPrompt);

screen.key('escape', () => {
	yesNoQuestion.ask('Ĉu vi certas, ke vi volas eliri Voĉon?', (err, val) => {
		if (val) { process.exit(0);	}
		screen.render();
	});
});
screen.key('C-x', () => process.exit(0));
screen.key('f12', () => {
	helpScreen.toggle();
	screen.render();
});

resizeHandler();
screen.on('resize', resizeHandler);
screen.render();
screen.enableMouse();
screen.enableKeys();
