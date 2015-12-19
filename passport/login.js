var LocalStrategy  = require('passport-local').Strategy;
var crypto = require('crypto');
module.exports = function(passport){
    function hashPassword(password, salt) {
        var hash = crypto.createHash('sha256');
        hash.update(password);
        hash.update(salt);
        return hash.digest('hex');
    }     
    passport.use(new LocalStrategy(function(username, password, done) {
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