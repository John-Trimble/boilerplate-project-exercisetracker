const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cors = require('cors')
const shortId = require('shortid')

const mongoose = require('mongoose')
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://John:3216@fcc-cluster.edllc.mongodb.net/Excercise-Tracker?retryWrites=true&w=majority', { useNewUrlParser: true, useFindAndModify: true, useUnifiedTopology: true })
var db = mongoose.connection;
db.on("error", console.error.bind(console, "DATABASE ERROR"))
db.once("open", console.log.bind(console, "DATABASE CONNECTED"))

const ExerciseSchema = new mongoose.Schema({
  duration: {type: Number, required: true},
  description: {type: String, required: true},
  date: {type: Date, default: new Date()}
})

const UserSchema = new mongoose.Schema({
  username: {type: String, required: true},
  id: {type: String, required: true, unique: true},
  exercises: [ExerciseSchema]
})
const Users = mongoose.model("Users", UserSchema);

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post("/api/exercise/new-user", (req, res) => {
  Users.find({username: req.body.username}, (err, data) => {
    console.log(err, data)
    if (err) return res.send({error: "Failed to fetch data"})
    if (data.length != 0) return res.send({error: "Username taken"})
    let user = new Users({username: req.body.username, id: shortId.generate()})
    user.save((e, d) => {
      if (e) return console.error.bind(console, "Failed to add new user")
      res.send({username: d.username, _id: d.id})
    })
  })
})

app.get("/api/exercise/users", (req, res) => {
  Users.find({}, (err, data) => {
    if (err) return res.send({error: "Failed to fetch users"})
    res.send(data.map(item => {return {username: item.username, _id: item.id}}))
  })
})

app.post("/api/exercise/add", (req, res) => {
  Users.findOne({id: req.body.userId}, (err, data) => {
    if (err || data == null) return res.send({error: "Failed to find user"})
    let {duration, description} = req.body;
    let exDate = new Date(req.body.date == ""?Date.now():req.body.date)
    Users.findOneAndUpdate({id: req.body.userId}, {$push: {exercises: {duration, description, date: exDate}}}, {new: true}, (e, d) => {
      if (e) return res.send({error: "Failed to update user"})
      let {id, username, exercises} = d
      res.send({id, username, exercises})
    })
  })
})

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
