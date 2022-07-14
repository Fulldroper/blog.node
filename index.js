const fastify = require('fastify')({logger: false})
const {config} = require('./package.json')
const db = new((require('mongodb')).MongoClient)(config.mongoDBURL, {
  authSource: "admin",
  useNewUrlParser: true
})

fastify.post('/reg', async (req, res) => {})

fastify.listen(process.env.PORT || config.port || 80, (err, address) => {
  if (err) {
    throw err;
  }
  console.log(`Server is now listening on ${address}`);
})
