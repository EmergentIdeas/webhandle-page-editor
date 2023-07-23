const cheerio = require('cheerio')

let replacementPrefix = '00165caa3c642a5ef15d7e49cd41ce37'
async function replaceTemplateContent(content) {
	let $ = cheerio.load(content)	
	
	let count = 1;
	let replacements = []
	$('.tri-template-replacement').each(function() {
		let current = $(this)
		let templateContent = current.attr('data-templatecontent')
		
		let token = replacementPrefix + (count++)
		replacements.push({
			token,
			templateContent
		})
		current.html(token)
	})

	let section = $('body').html()
	replacements.forEach((replacement) => {
		section = section.split(replacement.token).join('__' + replacement.templateContent + '__')
	})
	return section
}

module.exports = replaceTemplateContent