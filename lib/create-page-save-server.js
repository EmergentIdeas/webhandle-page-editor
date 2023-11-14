const filog = require('filter-log')
const cheerio = require('cheerio')
const FileSink = require('file-sink')
const PageLocator = require('@webhandle/page-locator')

let webhandle = require('webhandle')
let log = filog('webhandle-page-editor')

let createPageSaveServer = function (sourceDirectory) {
	let sink = new FileSink(sourceDirectory)
	let locator = new PageLocator({
		sink
	})
	let server = async function (req, res, next) {
		if (req.method !== 'POST') {
			return next()
		}

		let pagePath = req.path
		let pageInfo

		try {
			pageInfo = await locator.locate(pagePath)
		}
		catch(e) {
			// That's fine. We just don't have a page at this location
			return next()
		}

		try {
			let { template, metadata, metadataExists } = pageInfo

			log.debug({
				message: 'Saving page info for: ' + template,
				path: req.path,
				method: req.method,
				hostname: req.hostname,
				ip: req.ip,
				protocol: req.protocol,
				userAgent: req.headers['user-agent'],
				fileName: template,
				type: 'page-view'
			})
			if (!req.body.sectionsContent) {
				req.body.sectionsContent = []
				if (req.body['sectionsContent[]']) {
					if (typeof req.body['sectionsContent[]'] == 'string') {
						req.body.sectionsContent.push(req.body['sectionsContent[]'])
					}
					else {
						req.body.sectionsContent.push(...req.body['sectionsContent[]'])
					}
				}
			}
			if (req.body.pageInfo) {
				try {
					req.body.pageInfo = JSON.parse(req.body.pageInfo)
				}
				catch (e) {
					log.error({
						msg: 'Could not parse pageInfo',
						error: e
					})
				}
			}

			// Run through all the sections and apply any processing to them.
			// By default there are at least two processors, one that looks for underscores
			// and one that replaces the contents of template widgets with template code
			for (let index in req.body.sectionsContent) {
				let content = req.body.sectionsContent[index]
				for (let processor of webhandle.services.pageEditor.editableContentPostProcessors) {
					content = await processor(content)
				}
				req.body.sectionsContent[index] = content
			}
			
			// replace the content of the existing template
			let data = await sink.read(template)
			let $ = cheerio.load(data, { decodeEntities: false })
			$('.edit-content-inline').each(function (index, element) {
				let content = req.body.sectionsContent[index]
				$(this).html(content)
			})

			// figure out if we should be saving the entire document (rare for normal usage, but happens
			// when we're editing full pages) or we're editing a template which did not start out as a
			// full document
			let lower = data.toString().toLowerCase()
			let val = lower.indexOf('<html') > -1 ? $.html() : $('body').html()
			await sink.write(template, val)
			
			
			// If we've got any metadata, save that
			if (req.body.pageInfo && req.body.pageInfo.pageMeta) {
				await sink.write(metadata, JSON.stringify(req.body.pageInfo.pageMeta, null, '\t'))
			}
			if (!res.finished) {
				res.end('The page is saved.')
			}
		}
		catch (e) {
			log.error({
				message: `The page ${pagePath} could not be saved.`
				, error: e
			})
			if (!res.finished) {
				res.end('The page could not be saved.')
			}
		}
	}

	return server
}

module.exports = createPageSaveServer