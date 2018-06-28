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