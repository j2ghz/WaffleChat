var db = require('../database/conn');
var crypto = require('crypto');
var hashPassword = require('./hash');
module.exports = function(username,password){
	var salt = crypto.randomBytes(16).toString("hex");
	db.run("INSERT INTO users ('username','password','salt') VALUES (?,?,?)",username,hashPassword(password,salt),salt);
}