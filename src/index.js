require('dotenv').config()
const app = require('./configs/server')
const { port } = require('./configs/vars')
const Log = require('./utils/loggerService')

require('./configs/database')

app.listen(port, () => Log.info(`Server running on port ${port}`))
