const fastify = require('fastify')({logger: false});
const {config} = require('./package.json');
const {v4: uuidv4} = require('uuid');
const mongodb = require('mongodb');

const db = new(mongodb.MongoClient)(config.mongoDBURL, {
  authSource: "admin",
  useNewUrlParser: true
});

const validateToken = async (token, collection) => {
  const user = await collection.findOne({"auth.token": token});
  if (new Date().getTime() - user.auth.lastUpdate > config.tokenLifeMS) {
    return false;
  } else {
    return true;
  };
};

// register user
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
    await collection.insertOne({
      id: `${
        auth.lastUpdate
      }`,
      username,
      password,
      auth,
      posts: [],
      files: []
    })
    res.code(200).send({
      id: auth.lastUpdate,
      auth: {
        token: auth.token,
        refresh: auth.refresh,
        life: config.tokenLifeMS -(new Date().getTime() - auth.lastUpdate)
      }
    });
  } connection.close()
})

// update token
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
  };

  await collection.updateOne({
    "id": user.id
  }, {$set: {
      auth
    }});
  res.code(200).send({
    id: user.id,
    auth: {
      token: auth.token,
      refresh: auth.refresh,
      life: config.tokenLifeMS -(new Date().getTime() - auth.lastUpdate)
    }
  });
  connection.close();
})

// upload file
fastify.get('/upload', async (req, res) => {
  const connection = await db.connect();
  const bucket = new mongodb.GridFSBucket(connection.db('files'));
  const videoUploadStream = bucket.openUploadStream('test1');
  const videoReadStream = (require("fs")).createReadStream('./assets/test1.mp4');
  videoReadStream.pipe(videoUploadStream);
  res.status(200).send("Done...");
})

// upload post

// get file

// get post
fastify.get('/media/:uid/:mid/', async (req, res) => {
  try {
    const {uid, mid} = req.params

    const connection = await db.connect();
    const _db = connection.db('files');
    const file = await _db.collection("fs.files").findOne({filename: mid});

    // Create response headers
    const meta = {
      start : 0,
      end: file.length -1
    }

    console.log(req.headers);  
    if (req?.headers?.range) {
      const _meta = req.headers.range.matchAll(/^bytes\=(?<start>[0-9]*)\-(?<end>[0-9]*)$/g);
      meta.start = _meta.start || 1
      meta.end = _meta.end -1
    }

    meta.contentLength =  meta.end - meta.start + 1

    console.log(meta.contentLength);

    const bucket = new mongodb.GridFSBucket(_db);
    const downloadStream = bucket.openDownloadStreamByName(mid, {start: meta.start});
    const {createReadStream, createWriteStream, unlinkSync } = require('fs')
    const duplexStreamID = `./${uid}${mid}${meta.start}.tmp`
    const readStream = createReadStream(duplexStreamID)
    const writeStream = createWriteStream(duplexStreamID)

    downloadStream.pipe(writeStream)
    await res
      .code(206)
      .header("Content-Range", `bytes ${meta.start}-${meta.end}/${file.length -1}`)
      .header("Accept-Ranges", "bytes")
      .header("Content-Length", meta.contentLength)
      .header("Content-Type", "video/mp4")
      .send(readStream)

    unlinkSync(duplexStreamID)
  } catch (error) {
    console.error(error)
  }
})

// get user posts

fastify.listen(process.env.PORT || config.port || 80, (err, address) => {
  if (err) {
    throw err;
  }
  console.log(`Server is now listening on ${address}`);
})
