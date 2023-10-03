const path = require('path');
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin")

/* need to install:

npm i --save-dev webpack-cli node-polyfill-webpack-plugin

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
	, plugins: [
        new NodePolyfillPlugin()
    ]
};
