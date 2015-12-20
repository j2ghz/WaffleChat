var db = require('../database/conn');
var LocalStrategy  = require('passport-local').Strategy;
var hashPassword = require('./hash');
module.exports = function(passport){
    passport.serializeUser(function(user, done) {
        return done(null, user.id);
    });
    passport.deserializeUser(function(id, done) {
        db.get('SELECT id, username FROM users WHERE id = ?', id, function(err, row) {
            if (!row) return done(null, false);
            return done(null, row);
        });
    });
    passport.use('local', new LocalStrategy(function(username, password, done) {
        db.get('SELECT salt FROM users WHERE username = ?', username, function(err, row) {
            if (!row) return done(null, false);
            var hash = hashPassword(password, row.salt);
            db.get('SELECT username, id FROM users WHERE username = ? AND password = ?', username, hash, function(err, row) {
                if (!row) return done(null, false);
                return done(null, row);
            });
        });
    }));
}