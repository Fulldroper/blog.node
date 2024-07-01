## Objective

The project aims to create a web server with API support for user authentication, media file upload, and media content streaming. This project can be used to create a blog with the ability to upload and view videos.

## Repository

You can find the project repository on GitHub: https://github.com/Fulldroper/blog.node

## Main Components

1. **Fastify Web Server**
    - Used to create a high-performance web server with logging support and various HTTP methods.

2. **MongoDB**
    - Database for storing user information, posts, and files.

3. **GridFS**
    - A file system for MongoDB that allows storing large files such as videos.

4. **Dynamic JWT Authentication**
    - Used to protect the API and ensure secure user authentication. Unlike standard JWT, this implementation is dynamic, which means the tokens are updated regularly, enhancing security and reducing the risk of token misuse.
## How It Works
### User Registration
  - The user provides a username, email, and password.
  - Validation of the provided data.
  - Storing user information in the database with generating a unique authentication token.
```js
fastify.post('/reg', async (req, res) => {
  const {username, password, email} = req.body;
  if (!username || !password || !email) {
    res.code(400).header("Error", "Empty parameters are entered").send();
    return;
  }
  if (!validateUsername(username)){
    res.code(401).header("Error", "Your username is not valid. Only characters A-Z, a-z and '-' are acceptable. Must be more than 8 characters and less than 16.").send();
    return;
  }
  if (!validateEmail(email)){
    res.code(401).header("Error", "Your email has prohibited characters").send();
    return;
  }
  if (!validatePassword(password)){
    res.code(401).header("Error", "Your password is not valid. It must contain at least one uppercase letter, one lowercase letter, and one number.").send();
    return;
  }

  const connection = await db.connect();
  const collection = await connection.db("blog").collection("users");
  const isUserExist = await collection.findOne({username});
  const isEmailExist = await collection.findOne({email});
  if (isUserExist || isEmailExist) {
    res.code(406).header("Error", "Username or email already exists").send();
    return;
  } else {
    const auth = {
      token: uuidv4(),
      refresh: uuidv4(),
      lastUpdate: new Date().getTime()
    };
    await collection.insertOne({
      id: `${auth.lastUpdate}`,
      username,
      password,
      auth,
      email,
      posts: [],
      files: []
    });
    res.code(200).send({
      id: auth.lastUpdate,
      auth: {
        token: auth.token,
        refresh: auth.refresh,
        life: config.tokenLifeMS - (new Date().getTime() - auth.lastUpdate)
      }
    });
  }
  connection.close();
});
```
### Token Update
  - Updating user authentication tokens using a refresh token.
```js
fastify.post('/update', async (req, res) => {
  const {token, refresh} = req.body;
  if (!token || !refresh) {
    res.code(406).header("Error", "Empty parameters are entered").send();
    return;
  }
  const connection = await db.connect();
  const collection = await connection.db("blog").collection("users");
  const user = await collection.findOne({"auth.token": token, "auth.refresh": refresh});
  if (!user) {
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
      life: config.tokenLifeMS - (new Date().getTime() - auth.lastUpdate)
    }
  });
  connection.close();
});
```
### File Upload
  - Uploading media files to GridFS.
```js
fastify.get('/upload', async (req, res) => {
  const connection = await db.connect();
  const bucket = new mongodb.GridFSBucket(connection.db('files'));
  const videoUploadStream = bucket.openUploadStream('test3');
  const videoReadStream = (require("fs")).createReadStream('./assets/test3.mp4');
  videoReadStream.pipe(videoUploadStream);
  res.status(200).send("Done...");
});
```
4. ### Media Streaming
    - Streaming video with byte range support to provide functionality similar to HLS servers. This is my implementation of HLS streams in the media server.
```js
fastify.get('/media/:uid/:mid/', async (req, res) => {
  try {
    const {uid, mid} = req.params;

    const connection = await db.connect();
    const _db = connection.db('files');
    const file = await _db.collection("fs.files").findOne({filename: mid});

    // Create response headers
    const meta = {
      start: 0,
      end: file.length - 1
    };

    if (req?.headers?.range) {
      const _meta = req.headers.range.matchAll(/^bytes\=(?<start>[0-9]*)\-(?<end>[0-9]*)$/g);
      meta.start = _meta.start || 1;
      meta.end = _meta.end - 1;
    }

    meta.contentLength = meta.end - meta.start + 1;

    const bucket = new mongodb.GridFSBucket(_db);
    const downloadStream = bucket.openDownloadStreamByName(mid, {start: meta.start});

    await res
      .code(206)
      .header("Content-Range", `bytes ${meta.start}-${meta.end}/${file.length - 1}`)
      .header("Accept-Ranges", "bytes")
      .header("Content-Length", meta.contentLength)
      .header("Content-Type", "video/mp4")
      .send(downloadStream);
  } catch (error) {
    console.error(error);
  }
});
```
## Skills Acquired
### Fastify Development
  - Setting up and configuring a high-performance web server.
  - Implementing API methods for various CRUD operations.

### Working with MongoDB
  - Using MongoDB to store user data and files.
  - Working with GridFS to upload and store large files.

### Dynamic JWT Authentication
  - Implementing dynamic JWT authentication to secure the API. This dynamic approach involves regularly updating tokens, enhancing security, and reducing the risk of token misuse.
  - Validating user data.

### Handling Media Content
  - Creating a streaming media server for video playback.
  - Implementing HLS streams in the media server to enable streaming functionality.
  - Working with byte ranges to provide functionality similar to HLS servers.

This project provides practical experience in creating a comprehensive web server with media functionality and ensuring a high level of security.
