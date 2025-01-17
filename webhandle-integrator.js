
const path = require('path')
const filog = require('filter-log')
const _ = require('underscore')
const FileSink = require('file-sink')
const FileSinkServer = require('file-sink-server')
const find = require('find')
const express = require('express')


let log = filog('webhandle-page-editor')
const setupFlexPicture = require('@dankolz/picture-ckeditor-plugin/server-js/integrate')
const setupTemplateReplacement = require('@dankolz/template-ckeditor-plugin/server-js/integrate')

const createPageSaveServer = require('./lib/create-page-save-server')
const createUploadFileServer = require('./lib/create-upload-file-server')
const createPageInfoServer = require('./lib/create-page-info-server')
const PageEditorService = require('./lib/page-editor-service')

const pageDirectoriesPrerun = require('./lib/properties-prerun-page-directories')
const replaceDoubleUnderscores = require('./lib/replace-double-underscores')
const replaceTemplateContent = require('./lib/replace-template-content')

const pageListCreator = require('./lib/page-list')

const folderAndFile = require('./lib/folder-and-file-from-path')
const trimSlashes = require('./lib/trim-slashes')


const formInjector = require('form-value-injector')
function addFormInjector(req, res, focus) {
	res.addFilter((chunk) => formInjector(chunk, focus))
}

let imageSizeExt = ['2x', 'quarter', 'half']


let pageEditorService 

let pagesDirectory;
let fullSink
let pageSink

const kalpaTreeOnPage = require('kalpa-tree-on-page')

let integrate = async function(webhandle, pagesSource, router, options) {
	options = _.extend({
		editorGroups: ['administrators', 'page-editors']
		, defaultPropertyTemplate: 'webhandle-page-editor/page-properties-editor/basic-properties'
		, operationPrefix: '/webhandle-page-editor/admin/page-editor/v1/page-operation/'
		, actionPrefix: '/webhandle-page-editor/admin/page-editor/v1/page-properties/'
		, pagePropertiesPrerun: [
			pageDirectoriesPrerun
		]
		, editableContentPostProcessors: [
			replaceDoubleUnderscores
			, replaceTemplateContent
		]
	}, options)
	
	
	pagesDirectory = path.join(webhandle.projectRoot, 'pages')
	
	if(!webhandle.services.pageEditor) {
		webhandle.services.pageEditor = pageEditorService = new PageEditorService({pagesDirectory, pagesSource, editorGroups: options.editorGroups})
		await pageEditorService.init()
		webhandle.services.pageEditor.pagePropertiesPrerun = options.pagePropertiesPrerun || []
		webhandle.services.pageEditor.editableContentPostProcessors = options.editableContentPostProcessors || []
	}
	else {
		if(!webhandle.services.pageEditor.pagePropertiesPrerun) {
			webhandle.services.pageEditor.pagePropertiesPrerun = []
		}
		if(!webhandle.services.pageEditor.editableContentPostProcessors) {
			webhandle.services.pageEditor.editableContentPostProcessors = []
		}
		webhandle.services.pageEditor.pagePropertiesPrerun.push(...(options.pagePropertiesPrerun || []))
		webhandle.services.pageEditor.editableContentPostProcessors.push(...(options.editableContentPostProcessors || []))
	}
	

	let pageInfoServer = await createPageInfoServer(pageEditorService.getPageInfo)
	// router.use(pageInfoServer)
	let pageSaveServer = await createPageSaveServer(pagesSource)
	router.use(pageSaveServer)
	
	// set a flag so that the pages can see if the editor is a page editor
	webhandle.pageServer.preRun.push((req, res, next) => {
		res.locals.isPageEditor = pageEditorService.isUserPageEditor(req)
		next()
	})
	
	webhandle.addStaticDir(path.join(webhandle.projectRoot, 'node_modules/ckeditor4'), {urlPrefix: '/ckeditor'})
	webhandle.addStaticDir(path.join(webhandle.projectRoot, 'node_modules/webhandle-page-editor/public/webhandle-page-editor'), {urlPrefix: '/webhandle-page-editor'})
	webhandle.addTemplateDir(path.join(webhandle.projectRoot, 'node_modules/webhandle-page-editor/views'))
	
	
	kalpaTreeOnPage(webhandle)
	setupFlexPicture()
	setupTemplateReplacement()
	import('@webhandle/ckeditor-multi-widget-panel/server-lib/integrate.mjs').then(mod => {
		// integrate the multi-widget-panel
		mod.default()
	})

	fullSink = new FileSink(webhandle.staticPaths[0])
	pageSink = new FileSink(pagesDirectory)
	let publicFolderSink = new FileSink(webhandle.staticPaths[0])
	let sink = new FileSink(path.join(webhandle.staticPaths[0], 'img'))
	let uploadServer = createUploadFileServer(sink)
	router.use('/files/upload-file', uploadServer)
	
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
	
	
	router.post('/admin/update-resource-version', (req, res, next) => {
		webhandle.resourceVersion = ('' + new Date().getTime())
		res.addFlashMessage(`Resource version updated: ${webhandle.resourceVersion}.`, () => {
			res.redirect('/menu')
		})

	})
	
	router.get('/admin/files/api/all-pages', (req, res, next) => {
		if(pageEditorService.isUserPageEditor(req)) {
			pageEditorService.getPageFiles().then(files => {
				files = files.map(file => {
					let parts = file.split('.')
					parts.pop()
					return parts.join('.')
				})
				.map(file => {
					return {url: file, label: file}
				})
				res.json(files)
			})
		}
		else {
			res.redirect('/login')
		}
	})
	
	let menuSink = new FileSink(path.join(webhandle.projectRoot, 'menus'))
	router.get('/admin/files/api/all-pages/:menuName', async (req, res, next) => {
		if(pageEditorService.isUserPageEditor(req)) {
			let content = await menuSink.read(req.params.menuName + '.json')
			res.set('Content-Type', "text/json")
			res.end(content)
		}
		else {
			res.redirect('/login')
		}
	})

	router.post('/admin/files/api/all-pages/:menuName', async (req, res, next) => {
		if(pageEditorService.isUserPageEditor(req)) {
			let data = JSON.stringify(JSON.parse(Buffer.from(req.body.data, 'base64')), null, '\t')
			await menuSink.write(req.params.menuName + '.json', data)
			res.end('success')

		}
		else {
			res.redirect('/login')
		}
	})
	
	router.get('/admin/files/api/all-menus', async (req, res, next) => {
		if(pageEditorService.isUserPageEditor(req)) {
			let content = await menuSink.getFullFileInfo('.')
			let menuNames = content.children.map(child => {
				return child.name
			})
			.filter(name => {
				return name.endsWith('.json')
			})
			.map(name => {
				return name.substring(0, name.length - 5)
			})
			res.json(menuNames)
		}
		else {
			res.redirect('/login')
		}
	})
	
	// Setup file sink servers for resources 
	let fileSinkServerAuth = async (path, req) => {
		return pageEditorService.isUserPageEditor(req)
	}
	function createFileSinkServer(sink, name) {
		let publicFileSinkServer = new FileSinkServer(sink, {
			authorizationProvider: fileSinkServerAuth
		})
		let publicSinkRouter = express.Router()
		publicFileSinkServer.addToRouter(publicSinkRouter)
		
		router.use('/admin/page-editor/v1/file-resources/' + name, publicSinkRouter)

	}
	createFileSinkServer(publicFolderSink, 'public')
	createFileSinkServer(pageSink, 'pages')
	
	
	
	
	router.use('/admin/api/v1/page-properties/', pageInfoServer)
	router.get('/admin/page-editor/v1/page-properties/:pagePath(\\S{0,})', async (req, res, next) => {
		let pagePath = req.params.pagePath
		
		try {
			let pageInfo = await pageEditorService.getPageInfo(pagePath)
			if(!pageInfo) {
				pageInfo = {}
			}
			webhandle.pageServer.prerenderSetup(req, res, {}, async () => {
				res.locals.pagePath = pagePath
				res.locals.actionPrefix = options.actionPrefix
				res.locals.operationPrefix = options.operationPrefix
				let propertiesTemplate = options.defaultPropertyTemplate
				if(pageInfo.editor && pageInfo.editor.propertiesTemplate) {
					propertiesTemplate = pageInfo.editor.propertiesTemplate
				}
				for(let prerun of webhandle.services.pageEditor.pagePropertiesPrerun) {
					await prerun(req, res)
				}
				let [folder, file] = folderAndFile(pagePath)
				pageInfo.folder = folder
				pageInfo.pageName = file
				
				addFormInjector(req, res, pageInfo)
				res.render(propertiesTemplate)
			})

		}
		catch(e) {
			log.error(e)
			webhandle.pageServer.prerenderSetup(req, res, {}, () => {
				res.locals.pagePath = pagePath
				res.render('webhandle-page-editor/page-properties-editor/no-page-for-properties')
			})
		}
	})
	router.post('/admin/page-editor/v1/page-properties/:pagePath(\\S{0,})', async (req, res, next) => {
		let pagePath = req.params.pagePath
		
		try {
			let pageInfo = await pageEditorService.getPageInfo(pagePath)
			if(!pageInfo) {
				pageInfo = {}
			}
			let pageDestination
			let {folder, pageName} = req.body
			if(pageName == '' || !pageName || pageName == '/') {
				pageName = 'index'
			}
			if(folder && pageName) {
				pageDestination = trimSlashes(folder + '/' + pageName)
			}
			delete req.body.folder
			delete req.body.pageName

			pageInfo = Object.assign(pageInfo, req.body)
			pageInfo = await pageEditorService.savePageInfo(pagePath, pageInfo)
			
			let redirectUrl = decodeURIComponent(req.originalUrl)
			
			if(pagePath != pageDestination) {
				await pageEditorService.movePage(pagePath, pageDestination)
				redirectUrl = redirectUrl.substring(0, redirectUrl.length - pagePath.length) + pageDestination
			}
			
			res.addFlashMessage("Page properties updated", (err) => {
				res.redirect(redirectUrl)
			})
		}
		catch(e) {
			log.error(e)
			webhandle.pageServer.prerenderSetup(req, res, {}, () => {
				res.locals.pagePath = pagePath
				res.render('webhandle-page-editor/page-properties-editor/no-page-for-properties')
			})
		}
	})

	router.post('/admin/page-editor/v1/page-operation/move:pagePath(\\S{0,})', async (req, res, next) => {
		let pagePath = req.params.pagePath
		if(pagePath == '' || !pagePath || pagePath == '/') {
			pagePath = 'index'
		}
		let pageName = pagePath.split('/').pop()
		let destinationDir = req.body.pageDestination
		let pageDestination = `${destinationDir}/${pageName}`
		
		pageDestination = trimSlashes(pageDestination)
		pagePath = trimSlashes(pagePath)
		
		
		try {
			if(pagePath == pageDestination) {
				res.addFlashMessage("Page name is the same", (err) => {
					res.redirect(options.actionPrefix + pageDestination)
				})
			}
			else {
				await pageEditorService.movePage(pagePath, pageDestination)

				res.addFlashMessage("Page moved", (err) => {
					res.redirect(options.actionPrefix + pageDestination)
				})
			}
		}
		catch(e) {
			log.error(e)
			webhandle.pageServer.prerenderSetup(req, res, {}, () => {
				res.locals.pagePath = pagePath
				res.render('webhandle-page-editor/page-properties-editor/no-page-for-properties')
			})
		}
	})
	
	let allPagesRouter = pageListCreator()
	router.get('/admin/page-editor/page-list', allPagesRouter)

	router.get('/admin/page-editor/menu-editor', (req, res, next) => {
		webhandle.pageServer.prerenderSetup(req, res, {}, () => {
			res.render('webhandle-page-editor/tools/menu-editor')
		})
	})
	router.get('/admin/page-editor/create-page', (req, res, next) => {
		webhandle.pageServer.prerenderSetup(req, res, {}, () => {
			webhandle.sinks.project.getFullFileInfo('page-templates', function(err, data) {
				if(!err && data) {
					res.locals.templates = data.children.map(file => file.name).map(name => {
						let parts = name.split('.')
						parts.pop()
						return parts.join('.')
					})
					res.locals.templates = Array.from(new Set(res.locals.templates))
				}
				let absPrefix = path.join(webhandle.projectRoot, 'pages')
				find.dir(absPrefix, (dirs) => {
					dirs = dirs.map(dir => dir.substring(absPrefix.length))
					res.locals.destinations = dirs
					res.render('webhandle-page-editor/tools/create-new-page')

				})
			})
		})
	})
	router.post('/admin/page-editor/create-page', async (req, res, next) => {
		let body;  
		let meta; 
		webhandle.sinks.project.read(path.join('page-templates', req.body.templateName) + '.tri').then((data) => {
			body = data
			webhandle.sinks.project.read(path.join('page-templates', req.body.templateName) + '.json').then((data) => {
				meta = data || "{}"
				webhandle.sinks.project.write(path.join('pages', req.body.destination, req.body.pageName) + '.tri', body)
				webhandle.sinks.project.write(path.join('pages', req.body.destination, req.body.pageName) + '.json', meta)
				res.redirect(path.join(req.body.destination, req.body.pageName))
			})
		})
	})
	

	router.get('/manage-files', (req, res) => {
		res.render('webhandle-page-editor/tools/manage-files')
	})
	
	router.get(/\/upload-file\/?.*/, (req, res) => {
		let parts = req.originalUrl.split('/')
		parts.shift()
		parts.shift()
		parts.shift()
		let sub = parts.join('/')

		webhandle.sinks.project.getFullFileInfo('public/' + sub, async (err, files) => {
			if(err) {
				// The directory probably doesn't exist.
				// that may be especially true if the errno is -2
				res.locals.files = []
			}
			else {
				res.locals.files = files.children
			}
			if(sub !== '') {
				res.locals.files.push({
					"name": "..",
					"parent": "",
					"stat": {
					},
					"directory": true,
					"relPath": "public"
				})
			}
			try {
				let pages = (await webhandle.sinks.project.getFullFileInfo('pages/' + sub)).children
				pages = pages.filter(page => page.directory || page.name.toLowerCase().endsWith('.tri') || page.name.toLowerCase().endsWith('.html') || page.name.toLowerCase().endsWith('.htm'))
				pages.forEach(page => {
					if(page.name.endsWith('.tri')) {
						page.name = page.name.substring(0, page.name.length - 4)
					}
					if(page.name.endsWith('.html')) {
						page.name = page.name.substring(0, page.name.length - 5)
					}
				})

				res.locals.files.push(...pages)
			}
			catch(e) {
				// probably that the directory didn't exist
			}
			res.locals.sub = sub
			let subwithslash = ''
			if(sub) {
				if(sub[sub.length - 1] != '/') {
					subwithslash = sub + '/'
				}
				else {
					subwithslash = sub
				}
			}
			else {
				subwithslash = ''
			}

			res.locals.subwithslash = subwithslash
			res.locals.files = res.locals.files.sort((one, two) => {
				if(one.directory && !two.directory) {
					return -1
				}
				if(!one.directory && two.directory) {
					return 1
				}
				return two.name.toLowerCase() > one.name.toLowerCase() ? -1 : 1
			})
			res.render('webhandle-page-editor/tools/upload-file')
		})
		
	})
	router.post('/upload-file', (req, res, next) => {
		let sub = req.body.sub
		if(sub && !sub.endsWith('/')) {
			sub += '/'
		}
		webhandle.sinks.project.write('public/' + sub + req.body.name, req.files[0].buffer, (err, data) => {
			res.addFlashMessage('File Uploaded <a href="/' + sub + req.body.name + '">' + req.body.name + '</a>', () => {

				if(sub) {
					sub = '/' + sub
				}
				res.redirect('/webhandle-page-editor/upload-file' + sub)
			})
		})
		
	})
	router.post('/create-directory', async (req, res, next) => {
		let sub = req.body.sub
		if(sub && !sub.endsWith('/')) {
			sub += '/'
		}
		let directoryName = req.body.directoryName
		directoryName = directoryName.split('/').join('')
		directoryName = directoryName.split('/').join('')
		directoryName = directoryName.split('~').join('')
		directoryName = directoryName.split('\\').join('')

		await webhandle.sinks.project.mkdir('public/' + sub + '/' + directoryName)
		res.addFlashMessage('Directory created ' + directoryName, () => {

			if(sub) {
				sub = '/' + sub 
			}
			sub += '/' + directoryName
			res.redirect('/webhandle-page-editor/upload-file' + sub)
		})
		
	})
	router.delete(/^\/delete-file\/(.*)/, async (req, res, next) => {
		// let sub = req.body.sub
		let sub = req.params[0]
		try {
			await webhandle.sinks.project.rm('public/' + sub)		
			res.end('success')
		}
		catch(e) {
			console.log(e)
			log.error({error: e})
			res.end('failure')
		}
	})
		
	let templates = {}
	webhandle.templateLoaders.push((name, callback) => {
		callback(templates[name])
	})

	templates['webhandle-page-editor/icon-indicator-name'] = (fileName) => {
		if(!fileName) {
			return 'image'
		}
		fileName = fileName.toLowerCase()
		if(
			fileName.endsWith('.gif')
			|| fileName.endsWith('.jpg')
			|| fileName.endsWith('.jpeg')
			|| fileName.endsWith('.png')
			|| fileName.endsWith('.svg')
			|| fileName.endsWith('.tiff')
		) {
			return 'image'
		}
		
		
		if(
			fileName.endsWith('.tri')
			|| fileName.endsWith('.doc')
			|| fileName.endsWith('.docx')
			|| fileName.endsWith('.pdf')
			|| fileName.endsWith('.html')
			|| fileName.endsWith('.htm')
			|| fileName.endsWith('.xls')
			|| fileName.endsWith('.xlsx')
			|| fileName.endsWith('.ppt')
			|| fileName.endsWith('.pptx')
		) {
			return 'description'
		}
		if( ! /\.....?$/.test(fileName)) {
			return 'description'
		}
		
		
		return 'image'
	}
	
	
}

function createBrowseHandler(filter, fileTypes) {
	let pageEditor = webhandle.services.pageEditor
	return async (req, res, next) => {
		let item = {
			children: []
		}

		let queryPath = req.query.path || ''
		try {
			item = await fullSink.getFullFileInfo(queryPath)
		}
		catch(e) {
			// no big deal, the directory just doesn't exist
		}
			
		try {
			let pageFiles = await pageSink.getFullFileInfo(queryPath)
			let pages = pageFiles.children.filter(page => {
				return page.directory || page.name.endsWith('.tri') || page.name.endsWith('.html')
			})
			pages = pages.map(page => {
				if(page.name.endsWith('.tri') || page.name.endsWith('.html')) {
					let i = page.name.lastIndexOf('.')
					page.name = page.name.substring(0, i)
					if(page.name == 'index') {
						page.relPath = page.relPath.substring(0, page.relPath.lastIndexOf('/'))
					}
					page.relPath = page.relPath.substring(0, page.relPath.lastIndexOf('.'))
				}
				return page
			})
			
			item.children.push(...pages)
		}
		catch(e) {
			// no big deal, the directory just doesn't exist
		}
		
		
		let directories = []
		
		
		let allowed = item.children.filter(child => {
			if(child.directory) {
				if(directories.includes(child.name)) {
					return false
				}
				else {
					directories.push(child.name)
					return true
				}

			}
			else {
				return true
			}
		})
		
		// condense the images into a single entry
		let multiVersionImageBasenames = allowed.filter(item => item.name.endsWith('.json'))
			.map(item => item.name.substring(0, item.name.length - ('.json'.length)))

		// Creat a list of the primary images. This will not include webp files
		let primaries = allowed.filter(item => {
			let info = imageVariantInformation(item.name)
			if(!info) {
				return true
			}
			item.variantInfo = info
			if(multiVersionImageBasenames.includes(info.baseName)) {
				return info.size == 'std' && info.ext != 'webp'
			}
			return true
		})	
		
		// gen a map of primary files by basename
		let primaryByBasename = primaries.reduce((acc, item) => {
			if(item.variantInfo) {
				item.variants = []
				acc[item.variantInfo.baseName] = item
			}	
			return acc
		}, {})
		
		// Okay, put sometimes there isn't a jpg/png for the primary, so add it as a primary in that case
		allowed.forEach(item => {
			if(item.variantInfo) {
				let primary = primaryByBasename[item.variantInfo.baseName]
				if(!primary) {
					if(item.variantInfo.size == 'std') {
						primaries.push(item)
						primaryByBasename[item.variantInfo.baseName] = item
					}
				}
			}	
		})
		
		// Add all the non-primary images as variants
		allowed.forEach(item => {
			if(item.variantInfo) {
				let primary = primaryByBasename[item.variantInfo.baseName]
				if(primary) {
					if(item.variantInfo.size != 'std') {
						primary.variants.push(item)
					}
					else if(item.variantInfo.ext != primary.variantInfo.ext) {
						primary.variants.push(item)
					}
				}
			}	
		})
		
		allowed = primaries	
		
		allowed = allowed.filter(filter)
		
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
		
		
		
	}
}

function imageVariantInformation(name) {
	if(!isNameImage(name)) {
		return null
	}
	let info = {
		size: 'std'
	}
	
	info.ext = name.substring(name.lastIndexOf('.') + 1)
	let noExt = name.substring(0, name.lastIndexOf('.'))
	info.baseName = noExt
	for(let size of imageSizeExt) {
		let sizeString = '-' + size
		if(noExt.endsWith(sizeString)) {
			info.size = size	
			info.baseName = noExt.substring(0, noExt.length - sizeString.length)
			break
		}
	}
	return info
}
function isNameImage(name) {
	let nameLower = name.toLowerCase()
	if(nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg') || nameLower.endsWith('.png') || nameLower.endsWith('.webp') || nameLower.endsWith('.gif')) {
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
