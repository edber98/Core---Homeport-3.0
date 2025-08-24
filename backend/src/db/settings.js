const DEFAULT_URL = process.env.MONGO_URL || 'mongodb://192.168.147.40:27017/';
const NODE_ENV = process.env.NODE_ENV || 'development';
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || (NODE_ENV === 'test' ? 'homeport_test' : 'homeport');
module.exports = { MONGO_URL: DEFAULT_URL, MONGO_DB_NAME, NODE_ENV };
