let webhandle = require('webhandle')
module.exports = async (req, res) => {
	let pageEditorService = webhandle.services.pageEditor
	res.locals.pageDirectories = await pageEditorService.getPageDirectories()
}