var $ = require('jquery')
var menuMaker = require('./index')

var integrate = function(selector) {
	var container = $(selector)
	if(container.length > 0) {
		$.get('/webhandle-page-editor/admin/files/api/all-pages', function(pagesData) {
			$.get('/webhandle-page-editor/admin/files/api/all-pages/main', function(treeData) {
				if(typeof treeData == 'string') {
					treeData = JSON.parse(treeData)
				}
				var tree = menuMaker({
					wrapper: container, 
					treeData: treeData,
					pages: pagesData,
					writeBack: function(data) {
						$.post('/webhandle-page-editor/admin/files/api/all-pages/main', {
							data: btoa(data)
						})
					}
				})	
			})
			
		})
	}
}

module.exports = integrate