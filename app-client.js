const webhandleEnvSetup = require('./client-lib/webhandle-env-setup')

webhandleEnvSetup()

var menuMaker = require('./client-lib/page-integration')

menuMaker('.menu-editor-page-seg')