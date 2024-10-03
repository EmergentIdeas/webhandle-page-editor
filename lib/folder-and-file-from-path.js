
function folderAndFile(path) {
	
	let parts = path.split('/')
	if(parts.length < 2) {
		parts.unshift('')
	}
	
	let file = parts.pop()
	let folder = parts.join('/')
	if(folder.startsWith('/') === false) {
		folder = '/' + folder
	}
	
	return [folder, file]
}

module.exports = folderAndFile