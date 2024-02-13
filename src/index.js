require('dotenv').config()
const app = require('./configs/server')
const PORT = process.env.PORT || 8080; 
require('./configs/database')

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
