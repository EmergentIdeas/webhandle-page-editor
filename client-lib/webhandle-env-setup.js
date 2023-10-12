const FileSinkRemoteHTTP = require('file-sink-remote-http')

function webhandleEnvSetup() {
	let webhandle = window.webhandle = window.webhandle || {}

	webhandle.sinks = webhandle.sinks || {}
	webhandle.sinks.public = new FileSinkRemoteHTTP('/webhandle-page-editor/admin/page-editor/v1/file-resources/public')
	webhandle.sinks.pages = new FileSinkRemoteHTTP('/webhandle-page-editor/admin/page-editor/v1/file-resources/pages')

}

module.exports = webhandleEnvSetup