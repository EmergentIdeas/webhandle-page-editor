var treeData = require('./menu-data.json')
var pagesData = require('./pages-data.json')
var menuMaker = require('./index')

var $ = require('jquery')
var container = $('.wrapper-1')

var tree = menuMaker({
	wrapper: container, 
	treeData: treeData,
	pages: pagesData,
	writeBack: function(data) {
		console.log(data)
	}
})
window.tree = tree

