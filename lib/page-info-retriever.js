
const path = require('path')
const fs = require('fs')
const filog = require('filter-log')
const allowedPath = require('./allowed-path')

let log = filog('webhandle-page-editor')

function createPageInfoRetriever(sourceDirectory) {

	let retriever = (pagePath) => {
		let p = new Promise((resolve, reject) => {
			let decodedPath = decodeURI(pagePath)
			if (!allowedPath(decodedPath)) {
				return reject(401)
			}
			let filePath = decodedPath
			let fullPath = path.join(sourceDirectory, filePath)
			fs.stat(fullPath, function (err, data) {
				// if (err || !data) {
				// 	return reject(err)
				// }
				let isDirectory = data && data.isDirectory()

				let parsedPath = path.parse(fullPath)
				let containingPath = isDirectory ? fullPath : parsedPath.dir

				if (containingPath.toString().indexOf(sourceDirectory.toString()) != 0) {
					log.error("Attacking detected for path: " + filePath)
					return reject(404)
				}

				fs.readdir(containingPath, function (err, items) {
					if (err) {
						return reject(404)
					}

					for (let currentName of (isDirectory ? retriever.indexNames : [parsedPath.name])) {
						for (let item of items) {
							if ((currentName + '.tri') === item || currentName + '.html' === item) {
								fs.readFile(containingPath + '/' + currentName + '.json', function (err, data) {
									if (!err) {
										try {
											return resolve(JSON.parse(data))
										}
										catch (e) {
											log.error(e)
											return reject(500)
										}
									}
									else {
										return resolve(null)
									}
								})
								return
							}
						}
					}

					return reject(404)
				})

			})

		})
		return p
	}

	retriever.indexNames = ['index']
	return retriever
}

module.exports = createPageInfoRetriever