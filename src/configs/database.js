const mongoose = require('mongoose')
const { mongoUri } = require('./vars')
console.log(mongoUri)
if(process.env.NODE_ENV == 'development') {
    mongoose.set('debug', true)
}


mongoose.connect('mongodb+srv://angelarrieta34:parzival-13@cluster0.mykndeo.mongodb.net/?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(db => console.log('Database is connected'))
    .catch(err => { console.error(err), console.log(err) })