const filog = require('filter-log')
const FileSink = require('file-sink')
const PageLocator = require('@webhandle/page-locator')

let log = filog('webhandle-page-editor')

function createPageInfoSaver(sourceDirectory) {

	let sink = new FileSink(sourceDirectory)
	let locator = new PageLocator({
		sink
	})

	let saver = (pagePath, pageInfo) => {
		if (!pageInfo) {
			pageInfo = {}
		}

		let p = new Promise(async (resolve, reject) => {
			try {
				let { template, metadata, metadataExists } = await locator.locate(pagePath)
				try {
					await sink.write(metadata, JSON.stringify(pageInfo, null, '\t'))
					resolve(pageInfo)
				}
				catch (e) {
					// This indicates some sort of parse problem writing to the disk
					log.error({
						message: `Could not write to file: ${metadata}`	
						, error: e
					})
					return reject(500)
				}
			}
			catch(e) {
				// this would happen if we couldn't find the template for the page at all
				// that is, the page does not exist
				log.error({
					message: `Could not write file for path: ${pagePath}`	
					, error: e
				})
				reject(404)
			}
		})
		return p
	}

	return saver
}

module.exports = createPageInfoSaver