const path = require('path')
const fs = require('fs')
const filog = require('filter-log')
const allowedPath = require('./allowed-path')

let log = filog('webhandle-page-editor')

let createPageInfoServer = function(sourceDirectory) {
	let server = function(req, res, next) {
		if(!allowedPath(req.path)) {
			return next()
		}
		
		if(req.method !== 'GET') {
			next()
		}
		
		let filePath = req.path
		let fullPath = path.join(sourceDirectory, filePath)
		fs.stat(fullPath, function(err, data) {
			let isDirectory = data && data.isDirectory()
			
			let parsedPath = path.parse(fullPath)
			let containingPath = isDirectory ? fullPath : parsedPath.dir
			
			if(containingPath.toString().indexOf(sourceDirectory.toString()) != 0) {
				log.error("Attacking detected for path: " + filePath)
				return res.setStatus(404)
			}
			
			fs.readdir(containingPath, function(err, items) {
				if(err) {
					log.debug('No page found for: ' + filePath)
					return next()
				}

				for(let currentName of ( isDirectory ? server.indexNames : [parsedPath.name])) {
					for(let item of items) {
						if((currentName + '.tri') === item) {
							log.debug({
								message: 'Serving page info for: ' + filePath,
								path: req.path,
								method: req.method,
								hostname: req.hostname,
								ip: req.ip,
								protocol: req.protocol,
								userAgent: req.headers['user-agent'],
								fileName: path.join(containingPath, item),
								type: 'page-view'
							})
							fs.readFile(containingPath + '/' + currentName + '.json', function(err, data) {
								if(!err) {
									log.debug('Found page meta information for: ' + filePath)
									try {
										res.set('Content-Type', 'text/json; charset=UTF-8')
										let result = {
											pageMeta: JSON.parse(data.toString())
										}
										res.end(JSON.stringify(result))
									}
									catch(e) {
										log.error(e)
										next()
									}
								}
							})
							return
						}
					}
				}
				
				return next()
			})
			
		})
	}
	
	server.indexNames = ['index']
	
	
	return server
}

module.exports = createPageInfoServer