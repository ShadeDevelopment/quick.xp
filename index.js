module.exports = {
    SQLiteManager: require("./src/SQLiteManager"),
    MongoManager: require("./src/MongoManager"),
    version: require('./package.json').version
}
