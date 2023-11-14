const filog = require('filter-log')

let log = filog('webhandle-page-editor')

const createPageInfoRetriever = require('./page-info-retriever')

let createPageInfoServer = async function (sourceDirectory) {
	let pageInfoRetriever
	if(typeof sourceDirectory === 'string') {
		pageInfoRetriever = await createPageInfoRetriever(sourceDirectory)
	}
	else {
		pageInfoRetriever = sourceDirectory
	}

	let server = function (req, res, next) {
		if (req.method !== 'GET') {
			next()
		}

		pageInfoRetriever(req.path).then(data => {
			if(data) {
				log.debug({
					message: 'Serving page info for: ' + req.path,
					path: req.path,
					method: req.method,
					hostname: req.hostname,
					ip: req.ip,
					protocol: req.protocol,
					userAgent: req.headers['user-agent'],
					type: 'page-view'
				})

			}
			else {
				log.debug('Sending blank page meta information for: ' + filePath)
				data = {}
			}
			res.set('Content-Type', 'text/json; charset=UTF-8')
			let result = {
				pageMeta: data
			}
			res.end(JSON.stringify(result))

		}).catch(err => {
			if(err == 401) {
				log.error("Attacking detected for path: " + req.path)
				res.setStatus(404)
				return res.end()
			}
			else if(err == 404) {
				log.debug('No page found for: ' + req.path)
				next()
			}
			else if(err == 500) {
				log.debug('Error when loading info : ' + req.path)
				next()
			}
			else {
				next()
			}
		})
	}



	return server
}

module.exports = createPageInfoServer