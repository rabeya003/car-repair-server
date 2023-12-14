const express = require('express')
require('dotenv').config()
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookirParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')

const app = express()
const port = process.env.PORT || 5000

// middleware
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'https://car-repair-931a2.web.app'],
    credentials: true,
  }),
)
app.use(express.json())
app.use(cookirParser())

// middlewares
const logger = async (req, res, next) => {
  next()
}

const jwtSecret = process.env.ACCESS_TOKEN_SECRET
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token

  if (!token) {
    return res.status(401).send('Unauthorized access')
  }
  jwt.verify(token, jwtSecret, (error, decoded) => {
    if (error) {
      return res.status(403).send({
        message: 'forbidden access',
      })
    }
    req.decoded = decoded
    next()
  })
}


const uri = `mongodb+srv://${ process.env.DB_USER }:${ process.env.DB_PASS }@cluster0.ey8cr7h.mongodb.net/?retryWrites=true&w=majority`

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

const dbConnect = async () => {
  try {
    client.connect()
    console.log('DB Connected Successfully✅')
  } catch (error) {
    console.log(error.name, error.message)
  }
}
dbConnect()

const serviceCollection = client.db('carManagement').collection('services')
const bookingCollection = client.db('carManagement').collection('bookings')


app.get('/', (req, res) => {
  res.send('My car management service is working')
})

// auth related api
app.post('/jwt', logger, async (req, res) => {
  const user = req.body
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: '1h',
  })
  res
    .cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    })
    .send({ status: true })
})

app.post('/logout', async (req, res) => {
  const user = req.body
  res.clearCookie('token', { maxAge: 0 }).send({ success: true })
})
// services
app.get('/services', async (req, res) => {
  const cursor = serviceCollection.find()
  const result = await cursor.toArray()
  res.send(result)
})

app.get('/services/:id', async (req, res) => {
  const id = req.params.id
  const query = { _id: new ObjectId(id) }
  const options = {
    projection: { title: 1, price: 1, service_id: 1, img: 1 },
  }
  const result = await serviceCollection.findOne(query, options)
  res.send(result)
})

// bookings

app.get('/bookings', verifyToken, async (req, res) => {
  const email = req.query?.email;
  console.log(email)
  if (!email) {
    res.send([])
  }
  // check valid user
  const decodedEmail = req.decoded?.email;
  if (email !== decodedEmail) {
    res.status(403).send({ message: 'Forbidden Access' })
  }
  const query = { email: email }
  const result = await bookingCollection.find(query).toArray()
  res.send(result)
})

app.post('/bookings', async (req, res) => {
  const booking = req.body
  const result = await bookingCollection.insertOne(booking)
  res.send(result)
})

app.patch('/bookings/:id', async (req, res) => {
  const id = req.params.id
  const updatedBooking = req.body
  const filter = { _id: new ObjectId(id) }
  const updateDoc = {
    $set: {
      status: updatedBooking.status,
    },
  }
  const result = await bookingCollection.updateOne(filter, updateDoc)
  res.send(result)
})

app.delete('/bookings/:id', async (req, res) => {
  const id = req.params.id
  const query = { _id: new ObjectId(id) }
  const result = await bookingCollection.deleteOne(query)
  res.send(result)
})



app.listen(port, () => {
  console.log(`Car management app's listening on port is ${ port }`)
})
