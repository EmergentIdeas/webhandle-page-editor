
function creator() {
	/* GET home page. */
	return async function (req, res, next) {
		let pageService = webhandle.services.pageEditor
		let pageFiles = await pageService.getPageFiles()
		res.locals.pageUrls = pageFiles.map(name => {
			let parts = name.split('.')
			parts.pop()
			return parts.join('.')
		})
		webhandle.pageServer.prerenderSetup(req, res, {}, () => {
			res.render('webhandle-page-editor/pages/all-pages')
		})
	}
}


module.exports = creator