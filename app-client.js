const webhandleEnvSetup = require('./client-lib/webhandle-env-setup')
const { ImageBrowserView, FileSelectDialog, loadStyles  } = require('@webhandle/tree-file-browser/client-lib/dynamic-load.mjs')

webhandleEnvSetup()


let treeHolder = document.querySelector('.manage-files.webhandle-file-tree-image-browser')
if(treeHolder) {
	let imageBrowserView = new ImageBrowserView({
		sink: webhandle.sinks.public
		, eventNotificationPanel: webhandle.eventPanel
	})
	imageBrowserView.appendTo(treeHolder)
	imageBrowserView.render()
}

var menuMaker = require('./client-lib/page-integration')

menuMaker('.menu-editor-page-seg')