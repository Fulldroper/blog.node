const mongodb = require('mongodb')
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

  connect(fn) {
    this.client.connect().then(pipe => {
      this.pipe = pipe
      return pipe.db(this.dbName).collection(this.collection)
    }).then(fn). finally(() => {
      this.pipe.close()
    }).catch(err => {
      console.log(err);
      return undefined;
    })
  }

  add(value) {
    this.connect(pipe => {
      return pipe.insertOne({"value": value, "isDone": false})
    })
  }
  del(id) {
    this.connect(pipe => {
      return pipe.remove({"_id": new mongodb.ObjectID(id)})
    })
  }
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
  toggleDone(id, isDone) {
    this.connect(pipe => {
      return pipe.updateOne({
        "_id": new mongodb.ObjectID(id)
      }, {
        $set: {
          isDone: isDone
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
