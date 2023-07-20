# Purpose
Allows editing of HTMLish pages and templates using the CKEditor

# Usage

On the client side, include the scripts like:
```
var editing = require('webhandle-page-editor')
editing({
	configFile: '/webhandle-page-editor/std-config.js'
})
```

The configFile used above is a sensible default but any config file can be used.
jQuery must be available as a global variable.

On the server side, if you're a webhandle user, you can include all of server side
handlers like:

```
let pageEditingRouter = express.Router()
require('webhandle-page-editor/webhandle-integrator')(webhandle, path.join(webhandle.projectRoot, 'pages'), pageEditingRouter)
```
You can then secure it for admin users like:
```
let securedRouter = require('webhandle-users/utils/allow-group')(
	['administrators', 'page-editors'],
	pageEditingRouter
)
webhandle.routers.primary.use('/webhandle-page-editor', securedRouter)

```

Each page has a json file specifying certain elements. They have the general format of:

```
{
	"editor": {
		"propertiesTemplate": "rsf-page-properties"
		,"disablePageEditor": true
	},
	"title": "The page titel",
	"description": "The page description",
	"pageVisibility": "public",
	"socialImage": "",
}
```

The properties template is some view. By default, and if not specified, this is:

views/webhandle-page-editor/page-properties-editor/basic-properties.tri

"disablePageEditor" if true will cause the "E" icon not to show.

It's possible to change where the "P" icon directs to by adding something like this to the page:
```
<script>
	window.page = {
		editor: {
			propertiesPage: "/news-items/__newsItem._id__/edit"
		}
	}
</script>
```

## Custom page properties
Sometimes the properties page will need data setup. This can be done by adding to the array:

```
webhandle.services.pageEditor.pagePropertiesPrerun
```

Functions added should be of the form:

```
async (req, res) => {
	res.locals.someVariable = await [some long running process]
}

```



