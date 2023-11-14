
const filog = require('filter-log')
const FileSink = require('file-sink')

let log = filog('webhandle-page-editor')

async function createPageInfoRetriever(sourceDirectory) {

	let sink = new FileSink(sourceDirectory)
	const PageLocator = (await import('@webhandle/page-locator')).default
	let locator = new PageLocator({
		sink
	})
	let retriever = (pagePath) => {
		let p = new Promise(async (resolve, reject) => {
			try {
				let { template, metadata, metadataExists } = await locator.locate(pagePath)
				if (metadataExists) {
					try {
						let data = await sink.read(metadata)
						return resolve(JSON.parse(data))
					}
					catch (e) {
						// This indicates some sort of parse problem with the JSON
						// since we were able to find a metadata file.
						log.error(e)
						return reject(500)
					}
				}
				else {
					// if there's no metadata, that's fine, we'll just return null
					resolve(null)
				}
			}
			catch (e) {
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

	return retriever
}

module.exports = createPageInfoRetriever