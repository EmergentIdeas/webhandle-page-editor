
var CKEditorDrop = require('ei-pic-browser/ckeditor-drop')
var PicUpload = require('ei-pic-browser/pic-upload')

var pageEditorSetup = function(options) {
	
	var $ = jQuery
	options = options || {}
	
	var cssLocation = '/webhandle-page-editor/css/page-editor.css'
	var editableSelector = '.edit-content-inline'
	
	$('head').append('<link rel="stylesheet" href="' + cssLocation + '" type="text/css" />');
	
	$('body').append('<div class="webhandle-page-editor-tools">' +
	'<a href="#" title="Properties" class="property-button">P</a>' +
	'<a href="#" title="Save" class="save-button">S</a>' +
	'<a href="#" title="Edit Page" class="start-editing">E</a>' +
	'</div>')
	
	var enablePageSave = function() {
		
	}
	
	var checkEditorDirtyAndSetContent = function(changeEvent, index) {
		var editor = changeEvent.editor
		monitor.sectionsContent[index] = editor.getData()
		enablePageSave();
	}
	
	var monitor = {
		sectionsContent: [],
		startEditing: function() {
			$('html').addClass('editing-page')
			require('ckeditor')
			
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
				
				var ckDrop = new CKEditorDrop(id)
				// ckDrop.imageLayouts = pageEditorConfiguration.imageLayouts || []
				ckDrop.imageLayouts = []
				ckDrop.render()

			})
		},
		getSections: function() {
			return this.sectionsContent
		}
	}
	
	$.get('/webhandle-page-editor' + window.location.pathname)
	.done(function(data) {
		monitor.pageInfo = data
	})

	
	$('.webhandle-page-editor-tools .start-editing').click(function(evt) {
		evt.preventDefault()
		monitor.startEditing()
	})
	
	$('.webhandle-page-editor-tools .save-button').click(function(evt) {
		evt.preventDefault()
		$.post('/webhandle-page-editor' + window.location.pathname, {
			sectionsContent: monitor.getSections(),
			pageInfo: monitor.pageInfo
		})
		.done(function(data) {
			alert('saved')
		})
	})
	
}

module.exports = pageEditorSetup