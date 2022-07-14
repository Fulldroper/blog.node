const fastify = require('fastify')({logger: false})
const {config} = require('./package.json')
const {v4: uuidv4} = require('uuid')

const db = new((require('mongodb')).MongoClient)(config.mongoDBURL, {
  authSource: "admin",
  useNewUrlParser: true
})

fastify.post('/reg', async (req, res) => {
  const {username, password} = req.body;
  const connection = await db.connect();
  const collection = await connection.db("blog").collection("users");
  const isUserExist = await collection.findOne({username});

  if (isUserExist) {
    res.code(200).header("Error", "Username already exists").send();
  } else {
    const auth = {
      token: uuidv4(),
      refresh: uuidv4(),
      lastUpdate: new Date().getTime()
    }
    await collection.insertOne({username, password, auth, id: auth.lastUpdate})
    res.code(200).send({id: auth.lastUpdate, auth});
  } connection.close()
})

fastify.listen(process.env.PORT || config.port || 80, (err, address) => {
  if (err) {
    throw err;
  }
  console.log(`Server is now listening on ${address}`);
})
