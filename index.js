const fastify = require('fastify')({logger: true});
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

const validateEmail = (email) => {
  return email.match(
    /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  );
};

const validateUsername = (username) => {
  return username.match(
    /^(?=[a-zA-Z0-9._]{8,16}$)(?!.*[_.]{2})[^_.].*[^_.]$/
  );
};

const validatePassword = (password) => {
  return password.match(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,32}$/
  );
};
// register user
fastify.post('/reg', async (req, res) => {
  const {username, password, email} = req.body;
  if (!username || !password || !email) {
    res.code(400).header("Error", "Empty parameters are entered").send();
    return;
  }
  if (!validateUsername(username)){
    res.code(401).header("Error", "Your username is not valid. Only characters A-Z, a-z and '-'are acceptable .Must be more ther 8 charecters and less then 16.").send()
  }
  if (!validateEmail(email)){
    res.code(401).header("Error", "Your email has prohibited characters").send()
  }
  if (!validatePassword(password)){
    res.code(401).header("Error", "Your password is not valid. Only characters A-Z, a-z and '-'are acceptable .Must be more ther 8 charecters and less then 16.").send()
  }

  const connection = await db.connect();
  const collection = await connection.db("blog").collection("users");
  const isUserExist = await collection.findOne({username});
  const isEmailExist = await collection.findOne({email});
  console.log(isUserExist, isEmailExist)
  if (isUserExist || isEmailExist) {
    res.code(406).header("Error", "Username or mail already exists").send();
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
      email,
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
  const videoUploadStream = bucket.openUploadStream('test3');
  const videoReadStream = (require("fs")).createReadStream('./assets/test3.mp4');
  videoReadStream.pipe(videoUploadStream);
  res.status(200).send("Done...");
})

// upload post

// get file

// get post
fastify.get('/media/:uid/:mid/', async (req, res) => {
  try {
    const {uid, mid} = req.params

    console.log(uid, mid);

    const connection = await db.connect();
    const _db = connection.db('files');
    const file = await _db.collection("fs.files").findOne({filename: mid});

    // Create response headers
    const meta = {
      start : 0,
      end: file.length -1
    }

    if (req?.headers?.range) {
      const _meta = req.headers.range.matchAll(/^bytes\=(?<start>[0-9]*)\-(?<end>[0-9]*)$/g);
      meta.start = _meta.start || 1
      meta.end = _meta.end -1
    }

    meta.contentLength =  meta.end - meta.start + 1

    const bucket = new mongodb.GridFSBucket(_db);
    const downloadStream = bucket.openDownloadStreamByName(mid, {start: meta.start});

    await res
      .code(206)
      .header("Content-Range", `bytes ${meta.start}-${meta.end}/${file.length -1}`)
      .header("Accept-Ranges", "bytes")
      .header("Content-Length", meta.contentLength)
      .header("Content-Type", "video/mp4")
      .send(downloadStream)
  } catch (error) {
    console.error(error)
  }
})

// get user posts

fastify.listen({port: process.env.PORT || config.port || 80}, (err, address) => {
  if (err) {
    throw err;
  }
  console.log(`Server is now listening on ${address}`);
})
