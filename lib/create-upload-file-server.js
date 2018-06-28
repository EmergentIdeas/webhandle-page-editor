const path = require('path')
const fs = require('fs')
const filog = require('filter-log')

let log = filog('webhandle-page-editor')

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

module.exports = createUploadFileServer