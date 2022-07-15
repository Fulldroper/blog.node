const fastify = require('fastify')({logger: false})
const {config} = require('./package.json')
const {v4: uuidv4} = require('uuid')

const db = new((require('mongodb')).MongoClient)(config.mongoDBURL, {
  authSource: "admin",
  useNewUrlParser: true
})

const validateToken = async (token, collection) => {
  const user = await collection.findOne({"auth.token": token});
  if (new Date().getTime() - user.auth.lastUpdate > config.tokenLifeMS) {
    return false;
  } else {
    return true
  };
};

fastify.post('/reg', async (req, res) => {
  const {username, password} = req.body;
  if (!username || !password) {
    res.code(400).header("Error", "Empty parameters are entered").send();
    return;
  }
  const connection = await db.connect();
  const collection = await connection.db("blog").collection("users");
  const isUserExist = await collection.findOne({username});

  if (isUserExist) {
    res.code(406).header("Error", "Username already exists").send();
    return;
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

fastify.post('/update', async (req, res) => {
  const {token, refresh} = req.body;
  if (!token || !refresh) {
    res.code(406).header("Error", "Empty parameters are entered").send();
    return;
  }
  const connection = await db.connect();
  const collection = await connection.db("blog").collection("users");
  const user = await collection.findOne({"auth.token": token, "auth.refresh": refresh});
  if (! user) {
    res.code(404).header("Error", "Not Found").send();
    return;
  };

  const auth = {
    token: uuidv4(),
    refresh: uuidv4(),
    lastUpdate: new Date().getTime()
  }

  await collection.updateOne({
    "id": user.id
  }, {$set: {
      auth
    }})
})

fastify.listen(process.env.PORT || config.port || 80, (err, address) => {
  if (err) {
    throw err;
  }
  console.log(`Server is now listening on ${address}`);
})
