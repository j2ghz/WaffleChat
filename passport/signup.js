var db = require('../database/conn');
var crypto = require('crypto');
var hashPassword = require('./hash');
module.exports = function(username, password, next) {
    db.get("SELECT username FROM users WHERE username = ?", username, function(err, row) {
        if (row !== undefined) {
            var error = new Error('Username already taken');
            error.status = 401;
            next(error);
        } else {
          	var salt = crypto.randomBytes(16).toString("hex");
            db.run("INSERT INTO users ('username', 'password', 'salt') VALUES (?, ?, ?)", username, hashPassword(password, salt), salt);
            next();  
        }
    });
}