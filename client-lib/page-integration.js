var $ = require('jquery')
var menuMaker = require('./index')

var integrate = function(selector) {
	var container = $(selector)
	if(container.length > 0) {
		let menuName = new URLSearchParams(window.location.search).get('menu') || 'main'
		$.get('/webhandle-page-editor/admin/files/api/all-pages', function(pagesData) {
			$.get('/webhandle-page-editor/admin/files/api/all-pages/' + menuName, function(treeData) {
				if(typeof treeData == 'string') {
					treeData = JSON.parse(treeData)
				}
				var tree = menuMaker({
					wrapper: container, 
					treeData: treeData,
					pages: pagesData,
					writeBack: function(data) {
						$.post('/webhandle-page-editor/admin/files/api/all-pages/' + menuName, {
							data: btoa(data)
						})
					}
				})	
			})
			
		})
		$.get('/webhandle-page-editor/admin/files/api/all-menus', function(menuNames) {
			for(let menu of menuNames) {
				$('.page-editor-menu-selector select').append(`<option value="${menu}" ${menu == menuName ? ' selected' : ''}>${menu}</option>`)
			}
			$('.page-editor-menu-selector select').on('change', function(evt) {
				let self = this
				setTimeout(function() {
					window.location = window.location.pathname + "?menu=" + $(self).val()
				})
			})
		})
	}
}

module.exports = integrate