/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see https://ckeditor.com/legal/ckeditor-oss-license
 */

CKEDITOR.editorConfig = function( config ) {
	// Define changes to default configuration here.
	// For complete reference see:
	// http://docs.ckeditor.com/#!/api/CKEDITOR.config

	// The toolbar groups arrangement, optimized for two toolbar rows.
	config.toolbarGroups = [
		{ name: 'clipboard',   groups: [ 'clipboard', 'undo' ] },
		{ name: 'editing',     groups: [ 'find', 'selection', 'spellchecker' ] },
		{ name: 'links' },
		{ name: 'insert' },
		{ name: 'forms' },
		{ name: 'tools' },
		{ name: 'document',	   groups: [ 'mode', 'document', 'doctools' ] },
		{ name: 'others' },
		'/',
		{ name: 'basicstyles', groups: [ 'basicstyles', 'cleanup' ] },
		{ name: 'paragraph',   groups: [ 'list', 'indent', 'blocks', 'align', 'bidi' ] },
		{ name: 'styles' },
		{ name: 'colors' }
	];

	// Remove some buttons provided by the standard plugins, which are
	// not needed in the Standard(s) toolbar.
	config.removeButtons = 'Underline,Subscript,Superscript';

	config.removePlugins = 'image';

	// Set the most common block elements.
	config.format_tags = 'p;h1;h2;h3;pre';

	// Simplify the dialog windows.
	// config.removeDialogTabs = 'image:advanced;link:advanced';
	
	config.disableNativeSpellChecker = false;
	config.filebrowserBrowseUrl = '/webhandle-page-editor/files/browse/type/all'
	config.filebrowserImageBrowseUrl = '/webhandle-page-editor/files/browse/type/image'
	config.filebrowserUploadUrl = '/webhandle-page-editor/files/upload-file?action=upload'
	config.allowedContent = "small h5 h6 sup sub strong em table tr td th tbody dl dt dd br hr ul ol li pre u[class](*); img[*](*){*}; a[*](*); iframe[*](*); span[*](*); div[*](*); h1[*](*); h2[*](*){*}; h3[*](*){*}; h4[*](*); p{*}[*](*); section[*](*); picture[*](*){*}; figure[*](*){*}; figcaption[*](*){*}; script[*](*){*}"
	config.disallowedContent = 'img{width, height}[width, height]'

	config.extraPlugins = (config.extraPlugins ? config.extraPlugins + ',' : '') + 'sourcedialog,flex-picture,template-replacement'

	config.sourceAreaTabSize = 4;
};

CKEDITOR.on( 'instanceReady', function( ev ) {
	function makeBlockStyleFormat(tag) {
		ev.editor.dataProcessor.writer.setRules( tag, {
			indent: true,
			breakBeforeOpen: true,
			breakAfterOpen: true,
			breakBeforeClose: true,
			breakAfterClose: true
		})
	}
    ev.editor.dataProcessor.writer.selfClosingEnd = '/>';
    ev.editor.dataProcessor.writer.indentationChars = '\t';
	for(let tag of ['div', 'section', 'p', 'h1', 'h2', 'h3', 'h4', 'h5']) {
		makeBlockStyleFormat(tag)
	}
});