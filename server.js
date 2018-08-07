'use strict'
require('dotenv').config()
var express = require('express')
var mongoose = require('mongoose')
var bodyParser = require('body-parser')
var dns = require('dns')
var cors = require('cors')

var app = express()

// Basic Configuration
var port = process.env.PORT || 3000

/** this project needs a db !! **/
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true})
var db = mongoose.connection
db.on('error', console.error.bind(console, 'connection error:'))

app.use(cors())
var Schema = mongoose.Schema
var urlSchema = new Schema({
  old_url: String,
  new_url: {type: Number, unique: true}
})

var countSchema = new Schema({
  id: String,
  COUNT: Number,
  Notes: String
})
var urlStore = mongoose.model('urlStore', urlSchema)
var countStore = mongoose.model('countStore', countSchema)

countStore.findOne({id: 'Unique Counter'}, (err, data) => {
  if (err) return console.error(err)
  if (data == null) {
    let newcount = countStore({id: 'Unique Counter', COUNT: 0, Notes: 'Increment using findAndModify'})
    newcount.save(newcount, (err) => {
      if (err) return console.error(err)
    })
  }
})

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.json())
app.use('/public', express.static(process.cwd() + '/public'))

app.use(bodyParser.urlencoded({
  extended: true
}))

app.post('/api/shorturl/new', function (req, res) {
  var oUrl = req.body.url

  dns.lookup(cleanURL(oUrl), function (err) {
    if (err) {
      res.status(500).json({'error': 'invalid URL'})
      return console.error(err)
    }
    countStore.findOne({id: 'Unique Counter'}, (err, data) => {
      if (err) return console.error(err)
      res.json({orignal_url: oUrl, short_url: data.COUNT})
      var dbUrl = urlStore({old_url: oUrl, new_url: data.COUNT})
      dbUrl.save((err, data) => {
        if (err) return console.error(err)
        countStore.findOneAndUpdate({id: 'Unique Counter'}, {$inc: {COUNT: 1}}, {new: true}, (err, data) => {
          if (err) return console.log(err)
        })
      })
    })
  })
})

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html')
})

app.get('/api/shorturl/:nUrl', (req, res) => {
  urlStore.findOne({new_url: req.params.nUrl}, (err, doc) => {
    if (err) return console.error(err)
    if (doc != null) {
      res.redirect('https://' + cleanURL(doc.old_url))
    } else {
      res.json({'error': 'site does not exist'})
    }
  })
})

app.listen(port, function () {
  console.log(`Node.js listening on port: ${port}...`)
})

function cleanURL (url) {
  return url.replace(/(^https:\/\/|^http:\/\/|\/$)/gi, '')
}
