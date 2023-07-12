const createPageInfoRetriever = require('./page-info-retriever')
const createPageInfoSaver = require('./page-info-saver')
const pageExtensions = require('./page-extensions')

const filog = require('filter-log')
const _ = require('underscore')
const find = require('find')
const FileSink = require('file-sink')

class PageEditorService {
		constructor ({pagesDirectory, pagesSource, editorGroups}) {
			Object.assign(this, arguments[0])
			/*
			* Returns a promise that is the page info object or null if there is no object
			*/
			this.getPageInfo = createPageInfoRetriever(pagesSource)

			/** 
			 * Returns a promise that is the page info object after it is saved
			*/
			this.savePageInfo = createPageInfoSaver(pagesSource)
			
			this.log = filog('webhandle-page-editor')
			
			this.pagesSink = new FileSink(pagesDirectory)
		}

	
		isUserPageEditor(req) {
			if(req.user && req.user.groups && _.intersection(req.user.groups, this.editorGroups).length > 0) {
				return true
			}
			return false
		}
		
		/**
		 * Returns a promise that's value is an array of strings with page file paths which
		 * are relative to the pages directory.
		 */
		getPageFiles() {
			let p = new Promise((resolve, reject) => {
				find.file(/\.tri$/, this.pagesDirectory, (files) => {
					files = files.map(file => {
						return file.substring(this.pagesDirectory.length)
					})
					resolve(files)
				})
				.error(err => {
					if(err) {
						reject(err)
					}
				})
				
			})
			return p
		}
		
		async getPageDirectories() {
			let p = new Promise((resolve, reject) => {
				find.dir(this.pagesDirectory, (dirs) => {
					dirs = dirs.map(dir => {
						return dir.substring(this.pagesDirectory.length)
					})
					dirs.unshift('/')
					dirs.sort()
					resolve(dirs)
				})
				.error(err => {
					if(err) {
						reject(err)
					}
				})
				
			})
			return p
		}
		
		async movePage(startingLocation, endingLocation) {
			// this.log.info(`${startingLocation} ${endingLocation}`)
			if(startingLocation != endingLocation) {
				let meta 
				, content
				, finalExt;
				
				try {
					meta = await this.pagesSink.read(startingLocation + '.json')
				}
				catch(e) {}
				
				for(let ext of pageExtensions) {
					try {
						content = await this.pagesSink.read(startingLocation + '.' + ext)
						finalExt = ext
						break
					}
					catch(e) {}
				}
				
				if(meta) {
					await this.pagesSink.write(endingLocation + '.json', meta)
				}
				if(content) {
					await this.pagesSink.write(endingLocation + '.' + finalExt, content)
				}
				
				if(meta) {
					await this.pagesSink.rm(startingLocation + '.json')
				}
				if(content) {
					await this.pagesSink.rm(startingLocation + '.' + finalExt)
				}
			}
		}
}

module.exports = PageEditorService