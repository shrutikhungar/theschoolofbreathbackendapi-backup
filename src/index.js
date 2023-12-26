require('dotenv').config()
const app = require('./configs/server')
const { port } = require('./configs/vars')
const cors = require('cors')
require('./configs/database')
app.use(cors());

app.listen(port, () => console.log(`Server running on port ${port}`))
