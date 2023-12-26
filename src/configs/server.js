const express = require('express')
const morgan = require('morgan')
const helmet = require('helmet')
const cors = require('cors')
const passport = require('passport')
const { jwt } = require('./passport')

//imports
const userRoutes = require('../routes/user.routes')
const authRoutes = require('../routes/auth.routes')
const projectRoutes = require('../routes/music.routes')
const purchaseRoutes = require('../routes/purchase.routes')
const contactRoutes = require('../routes/contact.routes')



const app = express()
// Enable CORS for all routes
app.use(cors());

if (process.env.NODE_ENV == 'production') {
   

    app.use(morgan('short'))
    app.use(helmet())
}
else {
  
    app.use(morgan('dev'))
}

app.use(passport.initialize())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

passport.use('jwt', jwt)

app.use('/user', userRoutes)
app.use('/auth', authRoutes)
app.use('/musics', projectRoutes)
app.use('/purchases', purchaseRoutes)
app.use('/contact', contactRoutes)


module.exports = app
