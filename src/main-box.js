const blessed = require('blessed');

let currentElectionType = null;

module.exports = function setUpMainBox(mainBox) {
	const electionTypes = {
		RP: 'Paroranga metodo',
		STV: 'Unuopa Transdonebla Voĉo'
	};
	const maxElectionTypeWidth = Math.max(...Object.values(electionTypes).map(x => x.length)) + 5;

	const typePickerBtn = blessed.button({
		parent: mainBox,
		width: maxElectionTypeWidth,
		height: 1,
		style: {
			bg: 'gray',
			hover: {
				bg: 'white',
				fg: 'black'
			},
		},
		mouse: true
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
			typePickerBtn.style.fg = 'white';
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
};
