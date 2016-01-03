var db = require('../database/conn');
var crypto = require('crypto');
var hashPassword = require('./hash');
var validator = require('validator');
module.exports = function(username, password, next) {
    if (validator.isAlphanumeric(username)) {
        db.get("SELECT username FROM users WHERE username = ?", username, function(err, row) {
            if (!row) {
                var salt = crypto.randomBytes(16).toString("hex");
                db.run("INSERT INTO users ('username', 'password', 'salt') VALUES (?, ?, ?)", username, hashPassword(password, salt), salt);
                next();  
            } else {
                var error = new Error('Username already taken');
                error.status = 403;
                next(error);
            }
        });  
    } else {
        var error = new Error('Username must contain only letters and numbers');
        error.status = 403;
        next(error);
    }
}