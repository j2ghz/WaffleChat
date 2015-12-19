/* global db */
var crypto = require('crypto');
var salt = crypto.randomBytes(16).toString("hex");
var hashPassword = require('./hash');
module.exports = function(username,password){
	db.run("INSERT INTO users ('username','password','salt') VALUES ('"+username+"','"+hashPassword(password,salt)+"','"+salt+"')");
}