const mongodb = require('mongodb')
const {v4: uuidv4} = require('uuid')
const MongoClient = mongodb.MongoClient;

module.exports = class db {
  constructor({
    username,
    pwd,
    dbAddr,
    dbPort = false,
    dbName,
    authSource = "admin",
    collection,
    srv = true,
    param = "?retryWrites=true&w=majority"
  }) {
    this.url = `mongodb${
      srv ? '+srv' : ''
    }://${username}:${pwd}@${dbAddr}${
      dbPort !== false ? `:${dbPort}` : ''
    }/test${param}`
    this.collection = collection
    this.dbName = dbName
    this.authSource = authSource
    this.client = new MongoClient(this.url, {
      authSource: this.authSource,
      useNewUrlParser: true
    })
  }

  connect(fn, {
    dbName = this.dbName,
    collection = this.collection
  }) {
    this.client.connect().then(pipe => {
      this.pipe = pipe
      return pipe.db(dbName).collection(collection)
    }).then(fn). finally(() => {
      this.pipe.close()
    }).catch(err => {
      console.error(err);
      return undefined;
    })
  }

  registerUser(username, password) {
    return new Promise((res, rej) => {
      const auth = {
        token: uuidv4(),
        refresh: uuidv4(),
        lastUpdate: new Date().getTime()
      }
      this.connect(pipe => pipe.findOne({username}), {collection: "users"}).then(isUserExist => {
        if (isUserExist) {
          rej({msg: "Username already exists"})
        } else {
          return pipe.insertOne({username, password, auth, id: auth.lastUpdate})
        }
      }).then(() => {
        res({id: auth.lastUpdate, auth})
      }).catch(rej)
    })
  }

  updateToken(oldToken, refreshToken) {}

  update(id, value) {
    this.connect(pipe => {
      return pipe.updateOne({
        "_id": new mongodb.ObjectID(id)
      }, {
        $set: {
          value: value
        }
      })
    })
  }

  getList() {
    return new Promise((res, rej) => {
      this.connect(async pipe => {
        return res(await pipe.find().toArray())
      })

    })
  }
}
