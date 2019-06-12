const blessed = require('blessed');
const Editor = require('editor-widget');

const performElection = require('./calc');

const defaultResultsValue = 'Atendas enigon ...';
let currentElectionType = null;

module.exports = function setUpMainBox (mainBox, prompt) {
	const electionTypes = {
		RP: 'Paroranga metodo',
		STV: 'Unuopa Transdonebla Voĉo'
	};
	const maxElectionTypeWidth = Math.max(...Object.values(electionTypes).map(x => x.length)) + 5;

	blessed.text({
		parent: mainBox,
		left: 1,
		top: 2,
		width: '50%',
		height: 1,
		content: '{bold}Voĉdonebloj:{/bold} (unulitera, dividu per komo)',
		tags: true
	});

	const candidatesInput = new Editor({
		parent: mainBox,
		top: 3,
		height: 3,
		width: '50%',
		border: 'line',
		multiLine: false
	});
	candidatesInput.on('focus', () => {
		// Makes the cursor visible immediately
		mainBox.screen.render();
	});
	candidatesInput.on('blur', () => {
		mainBox.screen.program.hideCursor();
		mainBox.screen.render();
	});

	blessed.text({
		parent: mainBox,
		left: 1,
		top: 6,
		width: '50%',
		height: 1,
		content: '{bold}Balotiloj:{/bold}',
		tags: true
	});

	const ballotsInput = new Editor({
		parent: mainBox,
		top: 7,
		height: '100%-8',
		width: '50%',
		border: 'line'
	});
	ballotsInput.on('focus', () => {
		// Makes the cursor visible immediately
		mainBox.screen.render();
	});
	ballotsInput.on('blur', () => {
		mainBox.screen.program.hideCursor();
		mainBox.screen.render();
	});

	blessed.text({
		parent: mainBox,
		left: '50%+1',
		top: 2,
		width: '50%',
		height: 1,
		content: '{bold}Ignorataj kandidatoj:{/bold} (unulitera, dividu per komo)',
		tags: true
	});

	const ignoredCandidatesInput = new Editor({
		parent: mainBox,
		left: '50%',
		top: 3,
		height: 3,
		width: '50%',
		border: 'line',
		multiLine: false
	});
	ignoredCandidatesInput.on('focus', () => {
		// Makes the cursor visible immediately
		mainBox.screen.render();
	});
	ignoredCandidatesInput.on('blur', () => {
		mainBox.screen.program.hideCursor();
		mainBox.screen.render();
	});

	blessed.text({
		parent: mainBox,
		left: '50%+1',
		top: 6,
		width: '50%',
		height: 1,
		content: '{bold}Kvanto de venkontoj:{/bold} (nur por UTV)',
		tags: true
	});

	const placesInput = new Editor({
		parent: mainBox,
		left: '50%',
		top: 7,
		height: 3,
		width: '50%',
		border: 'line',
		multiLine: false
	});
	placesInput.on('focus', () => {
		// Makes the cursor visible immediately
		mainBox.screen.render();
	});
	placesInput.on('blur', () => {
		mainBox.screen.program.hideCursor();
		mainBox.screen.render();
	});

	blessed.text({
		parent: mainBox,
		left: '50%+1',
		top: 10,
		width: '50%',
		height: 1,
		content: '{bold}Rezulto(j):{/bold}',
		tags: true
	});

	const resultsBox = blessed.box({
		parent: mainBox,
		left: '50%',
		top: 11,
		height: '100%-12',
		width: '50%',
		border: 'line',
		scrollable: true,
		mouse: true,
		content: defaultResultsValue
	});

	const typePickerBtn = blessed.button({
		parent: mainBox,
		width: maxElectionTypeWidth,
		height: 1,
		style: {
			bg: 'gray',
			hover: {
				bg: 'white',
				fg: 'black'
			}
		},
		mouse: true,
		hoverText: 'Alklaki por ŝanĝi voĉdonsistemon'
	});

	const changeElectionType = type => {
		currentElectionType = type;
		typePickerBtn.setText(' ▼  ' + electionTypes[type]);
		mainBox.screen.render();
	};
	changeElectionType('RP');

	const toggleTypePickerDropdown = () => {
		if (typePickerDropdownItems[0].hidden) {
			typePickerBtn.style.bg = 'white';
			typePickerBtn.style.fg = 'black';
		} else {
			typePickerBtn.style.bg = 'gray';
			typePickerBtn.style.fg = 'default';
		}
		typePickerDropdownItems.forEach(x => x.toggle());
		mainBox.screen.render();
	};

	const typePickerDropdownItems = Object.entries(electionTypes).map(([name, text], i) => {
		const button = blessed.button({
			parent: mainBox,
			hidden: true,
			top: 1 + i,
			width: maxElectionTypeWidth,
			height: 1,
			content: text,
			style: {
				bg: 'gray',
				hover: {
					bg: 'white',
					fg: 'black'
				}
			},
			mouse: true
		});

		button.on('click', () => {
			changeElectionType(name);
			toggleTypePickerDropdown();
		});

		return button;
	});

	typePickerBtn.on('click', toggleTypePickerDropdown);

	const runElectionBtn = blessed.button({
		parent: mainBox,
		left: maxElectionTypeWidth + 1,
		width: 9,
		height: 1,
		style: {
			bg: 'gray',
			hover: {
				bg: 'white',
				fg: 'black'
			}
		},
		mouse: true,
		content: ' Kalkuli', // Intentional space
		hoverText: 'Kalkulas la rezulton de la voĉdono'
	});
	runElectionBtn.on('click', () => {
		const candidates = candidatesInput.textBuf.getText();
		const ballots = ballotsInput.textBuf.getText();
		const ignoredCandidates = ignoredCandidatesInput.textBuf.getText();
		const places = placesInput.textBuf.getText();

		try {
			const results = performElection(currentElectionType, candidates, ballots, ignoredCandidates, places);
			resultsBox.setContent(results);
			mainBox.screen.render();
		} catch (e) {
			if (!e || !('type' in e)) { throw e; }
			if (e.type === 'TIE_BREAKER_NEEDED') {
				prompt.setLabel('Necesas egalecrompanto!');
				let promptText = 'La egalecrompanto mem enskribu sian balotilon ĉi-sube.';
				if (currentElectionType === 'RP') {
					promptText += '\nEkz. A>B>D>C';
				} else if (currentElectionType === 'STV') {
					promptText += '\nEkz. ABCD';
				}
				promptText += '\nValidaj kandidatoj:\n' + e.candidates.join(', ') + '\n';
				
				prompt.input(promptText, '', (err, tieBreaker) => {
					if (err) { throw err; }
					if (!tieBreaker) { return mainBox.screen.render(); }

					const results = performElection(currentElectionType, candidates, ballots, ignoredCandidates, places, tieBreaker);
					resultsBox.setContent(results);
					mainBox.screen.render();
				});
			} else {
				throw e;
			}
		}
	});

	const resetFormBtn = blessed.button({
		parent: mainBox,
		left: maxElectionTypeWidth + 11,
		width: 8,
		height: 1,
		style: {
			bg: 'gray',
			hover: {
				bg: 'white',
				fg: 'black'
			},
		},
		mouse: true,
		content: ' Nuligi', // Intentional space
		hoverText: 'Ŝanĝas la valorojn de ĉiuj kampoj al siaj defaŭltoj'
	});
	resetFormBtn.on('click', () => {
		candidatesInput.textBuf.setText('');
		ballotsInput.textBuf.setText('');
		ignoredCandidatesInput.textBuf.setText('');
		placesInput.textBuf.setText('');
		resultsBox.setContent(defaultResultsValue);
		mainBox.screen.render();
	});
};
