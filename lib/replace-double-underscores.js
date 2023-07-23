async function replaceDoubleUnderscores(content) {
	return content.split('__').join('__::dus__')
}

module.exports = replaceDoubleUnderscores
