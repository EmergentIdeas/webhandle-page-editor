const UploadableImage = require('ei-pic-browser/uploadable-image')

let $ = require('jquery')

const menuFrame = require('./menu-frame.tri')
const optionProperties = require('./option-properties.tri')


let filenamePattern = '[a-z0-9-.]+'

async function deleteFile(path) {

	let resp = await fetch('/webhandle-page-editor/delete-file' + path,
		{
			method: 'DELETE'
		})
	let data = await resp.text()
	return data == 'success'
}


let fileBrowserPage = document.querySelector('.webhandle-page-editor-file-browser')

function getAllowNonstandardNameValue() {
	let check = fileBrowserPage.querySelector('input[name="useFreeFormName"]')
	if (check) {
		return check.checked
	}
	return false
}

if (fileBrowserPage) {
	let fileInput = fileBrowserPage.querySelector('input[name="fileContent"]')
	if (fileInput) {
		fileInput.addEventListener('change', (evt) => {
			let files = evt.target.files
			if (files.length > 0) {
				let name = files[0].name
				if (!getAllowNonstandardNameValue()) {
					name = name.replace(/[^a-z0-9-.]/gi, '-').toLowerCase();
				}
				fileBrowserPage.querySelector('input[name="name"]').value = name
			}
		})
	}

	let deletes = fileBrowserPage.querySelectorAll('.file-item .delete')
	deletes.forEach(del => {
		del.addEventListener('click', async (evt) => {
			let fileItem = evt.currentTarget.closest('.file-item')
			let path = fileItem.getAttribute('data-path')
			if (confirm(`Delete ${path}?`)) {
				if (await deleteFile(path)) {
					fileItem.parentElement.removeChild(fileItem)
				}
			}
		})
	})
	let check = fileBrowserPage.querySelector('input[name="useFreeFormName"]')
	if (check) {
		check.addEventListener('change', (evt) => {
			fileBrowserPage.querySelector('input[name="name"]').setAttribute('pattern', getAllowNonstandardNameValue() ? '.*' : filenamePattern)
		})
	}
}





let menuMaker = async function (options) {
	let $wrapper = $(options.wrapper)
	$wrapper.append(menuFrame())
	let pageDiv = $wrapper.get(0)

	const makeTree = require('kalpa-tree-on-page')

	makeTree({
		data: options.treeData
		, treeContainerSelector: '.tree-spot'
	}).then(tree => {
		let makePageActive = function () {
			$wrapper.find('.page-label').show()
			$wrapper.find('.url-label').hide()
			$wrapper.find('input[value=page]').prop('checked', 'checked')
			$wrapper.find('input[value=url]').prop('checked', '')
		}
		let makeUrlActive = function () {
			$wrapper.find('.page-label').hide()
			$wrapper.find('.url-label').show()
			$wrapper.find('input[value=page]').prop('checked', '')
			$wrapper.find('input[value=url]').prop('checked', 'checked')
		}
		tree.on('select', function (node) {
			$wrapper.find('.properties-side').html(optionProperties())
			$wrapper.find('input[name=label]').val(node.label)
			if (options.pages) {
				options.pages.sort((one, two) => {
					return one.label > two.label ? 1 : -1
				})
				options.pages.forEach(function (page) {
					$wrapper.find('select[name=page]').append('<option value="' + page.url + '">' + page.label + "</option>")
				})
			}

			$wrapper.find('input[name=url]').val(node.url)
			if (node.url) {
				let opt = $wrapper.find('option[value="' + node.url + '"]')
				if (opt.length > 0) {
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
			
			if(node.elementAttributes) {
				let keys = [...Object.keys(node.elementAttributes)]
				let vals = [...Object.values(node.elementAttributes)]
				let comb = []
				while(keys.length > 0 && vals.length > 0) {
					comb.push(keys.shift())
					comb.push(vals.shift())
				}
				let inputs = [...pageDiv.querySelectorAll('.element-attributes input')]
				while(inputs.length > 0 && comb.length > 0) {
					let inp = inputs.shift()
					let val = comb.shift()
					inp.value = val
				}
			}
			
			

			$wrapper.find('input[name=linkBy]').click(function (evt) {
				if ($(this).val() == 'page') {
					makePageActive()
				}
				else {
					makeUrlActive()
				}
			})
			
			function labelChange(evt) {
				setTimeout(function () {
					node.label = $wrapper.find('input[name=label]').val()
					tree.edit(node)
				})
			}

			$wrapper.find('input[name=label]').on('keydown', labelChange)
			$wrapper.find('input[name=label]').on('input', labelChange)

			function urlChange(evt) {
				setTimeout(function () {
					node.url = $wrapper.find('input[name=url]').val()
					tree.edit(node)
				})
			}
			$wrapper.find('input[name=url]').on('keydown', urlChange)
			$wrapper.find('input[name=url]').on('input', urlChange)

			function customClassChange(evt) {
				setTimeout(function () {
					node.customClasses = $wrapper.find('input[name=customClasses]').val()
					tree.edit(node)
				})
			}
			$wrapper.find('input[name=customClasses]').on('keydown', customClassChange)
			$wrapper.find('input[name=customClasses]').on('input', customClassChange)


			$wrapper.find('select[name=page]').change(function (evt) {
				setTimeout(function () {
					node.url = $wrapper.find('select[name=page]').val()
					tree.edit(node)
				})
			})

			$wrapper.find('input[name=image]').each(function () {
				new UploadableImage(this, function (newPath) {
					setTimeout(function () {
						node.image = $wrapper.find('input[name=image]').val()
						tree.edit(node)
					})
				})
			})
			
			function attributeChange(evt) {
				setTimeout(function() {
					node.elementAttributes = {}
					let inputs = [...pageDiv.querySelectorAll('.element-attributes input')]
					while(inputs.length > 0) {
						node.elementAttributes[inputs[0].value] = inputs[1].value
						inputs.shift()
						inputs.shift()
					}
					
					tree.edit(node)
				})
			}

			$wrapper.find('.element-attributes input').on('keydown', attributeChange)
			$wrapper.find('.element-attributes input').on('input', attributeChange)

		})
		tree.editable()

		$wrapper.find('.add').click(function (evt) {
			evt.preventDefault()
			let selected = tree.selected()
			let id = Object.values(tree.nodes).reduce((acc, item) => item.id > acc ? item.id : acc, 0) + 1

			let parent
			if (selected.id == 0) {
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

		$wrapper.find('.remove').click(function (evt) {
			evt.preventDefault()
			let selected = tree.selected()
			tree.removeNode(selected)
			tree.select(0)
		})

		$wrapper.find('.save').click(function (evt) {
			evt.preventDefault()
			let dat = tree.serialize()
			if (options.writeBack) {
				options.writeBack(dat)
			}
		})
	})
}

module.exports = menuMaker
