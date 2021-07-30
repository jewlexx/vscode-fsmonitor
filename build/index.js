const vsce = require('vsce');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const out = path.resolve(root, 'out');

/**
 * @type {vsce.ICreateVSIXOptions}
 */
const config = {
	cwd: root,
	useYarn: true,
	packagePath: out,
};

if (!fs.existsSync(out)) {
	fs.mkdirSync(out);
}

vsce.createVSIX(config);
