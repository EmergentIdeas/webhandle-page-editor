
const path = require('path')
const fs = require('fs')
const filog = require('filter-log')
const _ = require('underscore')
const FileSink = require('file-sink')
const cheerio = require('cheerio')

let log = filog('webhandle-page-editor')


let pageEditorService = {
}


let integrate = function(webhandle, pagesSource, router, options) {
	options = _.extend({}, options, {
		editorGroups: ['administrators', 'page-editors']
	})
	
	if(!webhandle.services.pageEditor) {
		webhandle.services.pageEditor = pageEditorService
		
		pageEditorService.isUserPageEditor = function(req) {
			log.error(req.user)
			if(req.user && req.user.groups && _.intersection(req.user.groups, options.editorGroups).length > 0) {
				return true
			}
			return false
		}

	}
	
	// set a flag so that the pages can see if the editor is a page editor
	webhandle.pageServer.preRun.push((req, res, next) => {
		res.locals.isPageEditor = pageEditorService.isUserPageEditor(req)
		next()
	})
	
	webhandle.addStaticDir(path.join(webhandle.projectRoot, 'node_modules/ckeditor'))
	webhandle.addStaticDir(path.join(webhandle.projectRoot, 'node_modules/webhandle-page-editor/public'))
	webhandle.addStaticDir(path.join(webhandle.projectRoot, 'node_modules/webhandle-page-editor/node_modules/ckeditor'))

	let pageInfoServer = createPageInfoServer(pagesSource)
	router.use(pageInfoServer)
	let pageSaveServer = createPageSaveServer(pagesSource)
	router.use(pageSaveServer)
	
	let sink = new FileSink(path.join(webhandle.staticPaths[0], 'img'))
	let uploadServer = createUploadFileServer(sink)
	webhandle.routers.primary.use('/files/upload-file&responseType=json', uploadServer)
	webhandle.routers.primary.use('/files/upload-file', uploadServer)
	
}


const allowedPath = function(path) {
	if(path.indexOf('..') > -1 ) {
		return false
	}
	
	return true
}

let createUploadFileServer = function(fileSink) {
	let server = function(req, res, next) {
		if(req.files && req.files.length > 0) {
			let file = req.files[0]
			let name = file.originalname || new Date().getTime()
			fileSink.write(name, file.buffer, function(err) {
				res.write(JSON.stringify({
					uploaded: 1,
					fileName: name,
					url: '/' + path.join('img', name)
				}))
				res.end()
			})
		}
		else {
			res.end()
		}
	}
	
	return server
}


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


module.exports = integrate