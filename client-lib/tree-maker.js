
var serialize = function(tree, rootId, result) {
	tree.children(rootId).forEach(function(child) {
		child.parentId = rootId
		result.push(child)
		serialize(tree, child.id, result)
	})
}

let kalpaTreePath = '/webhandle-page-editor/js/kalpa-tree.js'

var treeMaker = function(treeData) {
	let Tree = window.KalpaTree.default
	
	let JSONStream = require('JSONStream')
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

async function createTreeMaker() {
	return new Promise((resolve, reject) => {
		if(window.KalpaTree) {
			resolve(treeMaker)
		}
		else {
			let ckscript = document.createElement('script');
			ckscript.setAttribute('src', kalpaTreePath);
			ckscript.onload = async function() {
				resolve(treeMaker)
			}
			document.head.appendChild(ckscript)
		}
	})
}




module.exports = createTreeMaker
