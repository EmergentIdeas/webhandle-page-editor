const path = require('path')
const fs = require('fs')
const filog = require('filter-log')
const cheerio = require('cheerio')
const allowedPath = require('./allowed-path')

let log = filog('webhandle-page-editor')

let createPageSaveServer = function(sourceDirectory) {
	let server = function(req, res, next) {
		if(!allowedPath(req.path)) {
			return next()
		}
		
		if(req.method !== 'POST') {
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
							fs.readFile(containingPath + '/' + currentName + '.tri', function(err, data) {
								if(!err) {
									
									if(!req.body.sectionsContent) {
										req.body.sectionsContent = []
										if(req.body['sectionsContent[]']) {
											if(typeof req.body['sectionsContent[]'] == 'string') {
												req.body.sectionsContent.push(req.body['sectionsContent[]'])
											}
											else {
												req.body.sectionsContent.push(...req.body['sectionsContent[]'])
											}
										}
									}
									let $ = cheerio.load(data)
									$('.edit-content-inline').each(function(index, element) {
										$(this).html(req.body.sectionsContent[index])
									})
									
									try {
										let lower = data.toString().toLowerCase()
										let val
										if(lower.indexOf('<html') > -1) {
											val = $.html()
										}
										else {
											val = $('body').html()
										}
										fs.writeFile(containingPath + '/' + currentName + '.tri', val, function(err) {
											if(err) {
												log.error(err)
												res.end('The page could not be saved.')
											}
											else {
												res.end('The page is saved.')
											}
										})
									}
									catch(e) {
										log.error(e)
										res.end('The page could not be saved.')
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

module.exports = createPageSaveServer