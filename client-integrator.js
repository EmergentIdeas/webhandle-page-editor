window.CKEDITOR_BASEPATH = '/ckeditor/'

var CKEditorDrop = require('ei-pic-browser/ckeditor-drop')
var PicUpload = require('ei-pic-browser/pic-upload')
var Dialog = require('ei-dialog')
var inputTemplate = require('./input-template.tri')
var textareaTemplate = require('./textarea-template.tri')

const { ImageBrowserView, FileSelectDialog, loadStyles  } = require('@webhandle/tree-file-browser/client-lib/dynamic-load.mjs')
const webhandleEnvSetup = require('./client-lib/webhandle-env-setup')

var propertiesDialog

var pageEditorSetup = function(options) {
	
	var $ = jQuery
	options = options || {}
	
	webhandleEnvSetup()

	
	var cssLocation = '/webhandle-page-editor/css/page-editor.css'
	var editableSelector = '.edit-content-inline'
	
	
	$('head').append('<link rel="stylesheet" href="' + cssLocation + '" type="text/css" />');
	
	$('body').append('<div class="webhandle-page-editor-tools">' +
	'<a href="#" title="Edit Page" class="start-editing">E</a>' +
	'<a href="#" title="Properties" class="property-button">P</a>' +
	'<a href="#" title="Save" class="save-button">S</a>' +
	'<a href="/menu" title="Menu Page" class="go-to-menu">M</a>' +
	'</div>')
	
	var enablePageSave = function() {
		
	}
	
	var checkEditorDirtyAndSetContent = function(changeEvent, index) {
		var editor = changeEvent.editor
		monitor.sectionsContent[index] = editor.getData()
		enablePageSave();
	}

	var updateSectionsContent = function () {
		var size = Object.keys(CKEDITOR.instances).length
		for(var i = 0; i < size; i++) {
			monitor.sectionsContent[i] = CKEDITOR.instances['e' + i].getData()
		}
	}
	
	var monitor = {
		sectionsContent: [],
		startEditing: function() {
			$('html').addClass('editing-page')

			function setupCK() {
				CKEDITOR.disableAutoInline = true
				
				var index = 0
				$(editableSelector).each(function() {
					var i = index++
					var id = 'e' + i
					monitor.sectionsContent.push($(this).html())
					$(this).attr('contenteditable', "true").attr('id', id).addClass('page-editor-editable')
					var editorOptions = {
						on: {
							change: function(event) {
								checkEditorDirtyAndSetContent(event, i)
							},
							blur: function( event ) {
								checkEditorDirtyAndSetContent(event, i);
							}
						}
					}
					if(options.configFile) {
						editorOptions.customConfig = options.configFile
					}
					CKEDITOR.inline(id, editorOptions) 
					
					var ckDrop = new CKEditorDrop('#' + id)
					if(options.fileFunctionsPrefix) {
						ckDrop.fileUploadUrlPrefix = options.fileFunctionsPrefix + ckDrop.fileUploadUrlPrefix
					}
					// ckDrop.imageLayouts = pageEditorConfiguration.imageLayouts || []
					ckDrop.imageLayouts = []
					ckDrop.render()

				})
			}
			if(window.CKEDITOR) {
				setupCK()
			}
			else {
				let ckscript = document.createElement('script');
				ckscript.setAttribute('src','/ckeditor/ckeditor.js');
				ckscript.onload = function() {
					setupCK()
				}
				document.head.appendChild(ckscript)
			}

		},
		getSections: function() {
			return this.sectionsContent
		}
	}
	
	$.get('/webhandle-page-editor/admin/api/v1/page-properties' + window.location.pathname)
	.done(function(data) {
		monitor.pageInfo = data
	})

	
	$('.webhandle-page-editor-tools .start-editing').click(function(evt) {
		evt.preventDefault()
		monitor.startEditing()
	})
	
	$('.webhandle-page-editor-tools .save-button').click(function(evt) {
		evt.preventDefault()
		updateSectionsContent()
		$.post('/webhandle-page-editor' + window.location.pathname, {
			sectionsContent: monitor.getSections(),
			pageInfo: JSON.stringify(monitor.pageInfo)
		})
		.done(function(data) {
			alert('saved')
		})
	})

	/* The dialog based way of doing properties

	$('.webhandle-page-editor-tools .property-button').click(function(evt) {
		evt.preventDefault()
		propertiesDialog = new Dialog({
			title: 'Properties',
			body: function(bodyElement) {
				var result = '<div class="page-editor-page-properties">'
				result += inputTemplate({
					label: 'Page title',
					name: 'pageTitle',
					id: 'pageTitle',
					value: monitor.pageInfo.pageMeta.title
				})
				result += textareaTemplate({
					label: 'Page description',
					name: 'pageDescription',
					id: 'pageDescription',
					value: monitor.pageInfo.pageMeta.description
				})
				result += '</div>'
				return result
			},
			on: {
				'.btn-ok': function() {
					monitor.pageInfo.pageMeta.title = $('#pageTitle').val()
					monitor.pageInfo.pageMeta.description = $('#pageDescription').val()
					propertiesDialog.close()
				}
			}
		})
		propertiesDialog.open()
	})
	*/
	$('.webhandle-page-editor-tools .property-button').on('click', function(evt) {
		if(window.page && window.page.editor && window.page.editor.propertiesPage) {
			window.location = window.page.editor.propertiesPage
		}
		else {
			window.location = '/webhandle-page-editor/admin/page-editor/v1/page-properties' + window.location.pathname
		}
	})
	
}

module.exports = pageEditorSetup
