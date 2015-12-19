var login = require('./login');
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
    login(passport,db);
}