const path = require('path');

/* need to install:

npm i --save-dev webpack-cli 

*/


module.exports = {
	entry: 'kalpa-tree/index.js',
	mode: 'production',
	output: {
		filename: 'kalpa-tree.js',
		path: path.resolve(__dirname, 'public/webhandle-page-editor/js'),
		library: {
			name: 'KalpaTree',
			type: 'umd',
			umdNamedDefine: true
		}
	}
};
