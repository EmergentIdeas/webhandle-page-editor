
const path = require('path')
const fs = require('fs')
const filog = require('filter-log')
const _ = require('underscore')
const FileSink = require('file-sink')
const cheerio = require('cheerio')

let log = filog('webhandle-page-editor')

const createPageSaveServer = require('./lib/create-page-save-server')
const createUploadFileServer = require('./lib/create-upload-file-server')
const createPageInfoServer = require('./lib/create-page-info-server')

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
	webhandle.addTemplateDir(path.join(webhandle.projectRoot, 'node_modules/webhandle-page-editor/views'))

	let sink = new FileSink(path.join(webhandle.staticPaths[0], 'img'))
	let uploadServer = createUploadFileServer(sink)
	router.use('/files/upload-file', uploadServer)
	
	let publicFolderSink = new FileSink(webhandle.staticPaths[0])
	let oldStyleUploadServer = createUploadFileServer(publicFolderSink)
	router.use(/\/files\/upload(.*)/, oldStyleUploadServer)
	
	router.use('/files/browse/type/image', createBrowseHandler(imagesFilter, 'image'))
	router.use('/files/browse/type/all', createBrowseHandler(allFilter, 'all'))
	
	router.use(/\/files\/thumbnails\/urls(.*)/, (req, res, next) => {
		let sink = new FileSink(path.join(webhandle.staticPaths[0]))
		let prefix = req.params[0]
		sink.getFullFileInfo(prefix || '').then((item) => {
			let result = []
			for(let child of item.children) {
				result.push(path.join(prefix, child.name))
			}
			res.json(result)
		})
	})
	
	
	let pageInfoServer = createPageInfoServer(pagesSource)
	router.use(pageInfoServer)
	let pageSaveServer = createPageSaveServer(pagesSource)
	router.use(pageSaveServer)
	
	
	
}

function createBrowseHandler(filter, fileTypes) {
	return (req, res, next) => {
		let fullSink = new FileSink(webhandle.staticPaths[0])
		fullSink.getFullFileInfo(req.query.path || '').then((item) => {
			let allowed = item.children.filter(filter)
			
			allowed.sort(sortItems)
			
			let curPath = req.query.path
			if(!curPath || curPath == '/') {
				curPath = ''
			}
			
			try {
				if(curPath && (curPath != '' && curPath != '/')) {
					res.locals.parent = {
						name: '(parent directory)',
						parent: path.dirname(curPath),
						directory: true
					}
				}
				else {
					res.locals.parent = null
				}
			}
			catch(e) {
				log.error(e)
			}
			
			allowed.forEach((item) => {
				if(isNameImage(item.name)) {
					item.thumbnail = curPath + '/' + item.name
				}
				else {
					item.thumbnail = '/webhandle-page-editor/img/document.png';
				}
			})
			
			res.locals.items = allowed
			res.locals.path = curPath
			res.locals.CKEditor = req.query.CKEditor
			res.locals.CKEditorFuncNum = req.query.CKEditorFuncNum
			res.locals.fileTypes = fileTypes
			res.render('webhandle-page-editor/browser/items')
		})
		.catch( e => {
			log.error(e)
			next()
		})
		
		
		
	}
}

function isNameImage(name) {
	let nameLower = name.toLowerCase()
	if(nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg') || nameLower.endsWith('.png') || nameLower.endsWith('.gif')) {
		return true
	}
	return false
}

function imagesFilter(child) {
	if(child.directory) {
		return true
	}
	return isNameImage(child.name)
}

function allFilter(child) {
	return true
}

function sortItems(a, b) {
	if(a.directory && !b.directory) {
		return -1
	}
	if(b.directory && !a.directory) {
		return 1
	}
	
	let aName = a.name.toLowerCase()
	let bName = b.name.toLowerCase()
	if(aName < bName) {
		return -1
	}
	if(aName > bName) {
		return 1
	}
	return 0
}








module.exports = integrate



// @GET
// @Path("browse/type/image")
// @Template
// @Wrap("app_page")
// @RolesAllowed("page-editors")
// public Object browseImages(Location location, String CKEditor, String CKEditorFuncNum, String path) {
// 	return browseFiles(location, CKEditor, CKEditorFuncNum, path, "image", true);
// }
// 
// @GET
// @Path("browse/type/all")
// @Template
// @Wrap("app_page")
// @RolesAllowed("page-editors")
// public Object browseAllTypes(Location location, String CKEditor, String CKEditorFuncNum, String path) {
// 	return browseFiles(location, CKEditor, CKEditorFuncNum, path, "all", false);
// }
// 
// 
// public Object browseFiles(Location location, String CKEditor, String CKEditorFuncNum, String path, String browseType, boolean imagesOnly) {
// 	if(path == null) {
// 		path = "";
// 	}
// 	
// 	if(isInsecurePath(path)) {
// 		// a security check to make sure that we're never asked for a relative path
// 		return new CouldNotHandle() {
// 		};
// 	}
// 	
// 	if(path.startsWith("/")) {
// 		path = path.substring(1);
// 	}
// 	
// 	location.put("CKEditor", CKEditor);
// 	location.put("CKEditorFuncNum", CKEditorFuncNum);
// 	
// 	List<Resource> resources = new ArrayList<Resource>();
// 	
// 	Resource r = findStaticSink(location).get(path);
// 	processFoundResource(resources, r);
// 	
// 	pageEditorService.sortResources(resources);
// 	if(imagesOnly) {
// 		pageEditorService.filterAllButImages(resources);
// 	}
// 	else {
// 		r = findPagesResourceSource(location).get(path);
// 		processFoundResource(resources, r);
// 		pageEditorService.sortResources(resources);
// 	}
// 	
// 	List<ResourceDisplayEntry> disp = pageEditorService.getDisplayEntries(path, resources);
// 	disp.add(0, pageEditorService.createParentEntry(path));
// 	location.put("resources", disp);
// 	
// 	location.put("currentPath", path);
// 	location.put("browseType", browseType);
// 	
// 	return "page-editor/images-browser";
// }
