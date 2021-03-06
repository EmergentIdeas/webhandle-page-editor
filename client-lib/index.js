var UploadableImage = require('ei-pic-browser/uploadable-image')

var $ = require('jquery')

var menuFrame = require('./menu-frame.tri')
var optionProperties = require('./option-properties.tri')
var _ = require('lodash')

var serialize = function(tree, rootId, result) {
	_.each(tree.children(rootId), function(child) {
		child.parentId = rootId
		result.push(child)
		serialize(tree, child.id, result)
	})
}

var treeMaker = function(treeData) {
	var Tree = require('kalpa-tree')
	  , JSONStream = require('JSONStream')
	  , tree
	  , Readable = require('stream').Readable
	  , i = 0
	  
	  var stream = new Readable({objectMode: true})
		, clone = JSON.parse(JSON.stringify(treeData)) // poor man's clone

	  stream._read = function () {
		if (clone[i]) {
		  return stream.push(clone[i++])
		}
		stream.push(null)
	  }

	tree = new Tree({
	  stream: stream,
	  accessors: {
		icon: 'nodeType'
	  },
	  initialSelection: 0
	})

	tree.on('error', function (e) {
	  console.log('tree error', e)
	})

	tree.on('move', function (node, newParent, previousParent, newIndex, prevIndex) {
		node.parentId = newParent.id
	})
	
	tree.serialize = function() {
		var result = []
		result.push(tree.get(0))
		serialize(tree, 0, result)
		return JSON.stringify(result)
	}

	return tree
}




var menuMaker = function(options) {
	var $wrapper = $(options.wrapper)
	$wrapper.append(menuFrame())
	
	
	var makePageActive = function() {
		$wrapper.find('.page-label').show()
		$wrapper.find('.url-label').hide()
		$wrapper.find('input[value=page]').prop('checked', 'checked')
		$wrapper.find('input[value=url]').prop('checked', '')
	}
	var makeUrlActive = function() {
		$wrapper.find('.page-label').hide()
		$wrapper.find('.url-label').show()
		$wrapper.find('input[value=page]').prop('checked', '')
		$wrapper.find('input[value=url]').prop('checked', 'checked')
	}
	
	var tree = treeMaker(options.treeData)
	tree.on('select', function(node) {
		$wrapper.find('.properties-side').html(optionProperties())
		$wrapper.find('input[name=label]').val(node.label)
		if(options.pages) {
			_.each(_.sortBy(options.pages, 'label'), function(page) {
				$wrapper.find('select[name=page]').append('<option value="' + page.url + '">' + page.label + "</option>")
			})
		}
		
		$wrapper.find('input[name=url]').val(node.url)
		if(node.url) {
			var opt = $wrapper.find('option[value="' + node.url + '"]')
			if(opt.length > 0) {
				opt.prop("selected", "selected")
				makePageActive()
			}
			else {
				makeUrlActive()
			}
		}
		else {
			makePageActive()
		}
		$wrapper.find('input[name=customClasses]').val(node.customClasses)
		$wrapper.find('input[name=image]').val(node.image)
		
		$wrapper.find('input[name=linkBy]').click(function(evt) {
			if($(this).val() == 'page') {
				makePageActive()
			}
			else {
				makeUrlActive()
			}
		})
		
		$wrapper.find('input[name=label]').keydown(function(evt) {
			setTimeout(function() {
				node.label = $wrapper.find('input[name=label]').val()
				tree.edit(node)
			})
		})
		
		$wrapper.find('input[name=url]').keydown(function(evt) {
			setTimeout(function() {
				node.url = $wrapper.find('input[name=url]').val()
				tree.edit(node)
			})
		})
		
		$wrapper.find('input[name=customClasses]').keydown(function(evt) {
			setTimeout(function() {
				node.customClasses = $wrapper.find('input[name=customClasses]').val()
				tree.edit(node)
			})
		})
		
		
		$wrapper.find('select[name=page]').change(function(evt) {
			setTimeout(function() {
				node.url = $wrapper.find('select[name=page]').val()
				tree.edit(node)
			})
		})
		
		$wrapper.find('input[name=image]').each(function() {
	        new UploadableImage(this, function(newPath) {
				setTimeout(function() {
					node.image = $wrapper.find('input[name=image]').val()
					tree.edit(node)
				})
			})
		})
		
	})
	
	$wrapper.find('.tree-spot').append(tree.render().el.node())
	tree.editable()
	
	$wrapper.find('.add').click(function(evt){
		evt.preventDefault()
		var selected = tree.selected()
		var id = _.maxBy(Object.values(tree.nodes), 'id').id + 1
		
		var parent
		if(selected.id == 0) {
			parent = selected
		}
		else {
			parent = tree.parent(selected)
		}
		tree.add({
			id: id,
			parentId: parent.id,
			label: 'New Menu Item',
			url: ''
		}, parent, tree.children(parent).length)
		tree.select(id)
	})
	
	$wrapper.find('.remove').click(function(evt){
		evt.preventDefault()
		var selected = tree.selected()
		tree.removeNode(selected)
		tree.select(0)
	})
	
	$wrapper.find('.save').click(function(evt){
		evt.preventDefault()
		var dat = tree.serialize()
		if(options.writeBack) {
			options.writeBack(dat)
		}
	})
	
	return tree
}

module.exports = menuMaker