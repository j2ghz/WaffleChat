var db = require('../database/conn');
var crypto = require('crypto');
var hashPassword = require('./hash');
var validator = require('validator');
module.exports = function(username, password, next) {
    username = validator.trim(username);
    if (validator.isLength(username, 2, 16)) {
        username = validator.escape(username);
        db.get("SELECT username FROM users WHERE username = ?", username, function(err, row) {
            if (!row) {
                var salt = crypto.randomBytes(16).toString("hex");
                db.run("INSERT INTO users ('username', 'password', 'salt') VALUES (?, ?, ?)", username, hashPassword(password, salt), salt);
                next();  
            } else {
                var error = new Error('Username already taken');
                error.status = 422;
                next(error);
            }
        });  
    } else {
        var error = new Error('Username must be between 2 and 16 characters long.');
        error.status = 422;
        next(error);
    }
}