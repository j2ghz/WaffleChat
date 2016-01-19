var express = require('express');
var router = express.Router();
var signup = require('../passport/signup');

var isAuthenticated = function (req, res, next) {
	//pokud je uživatel autentikovaný, pošle se požadavek dál
	if (req.isAuthenticated()) {
		return next();
    }
	//jinak se přesměruje na přihlášení
	res.redirect('/login');
}

module.exports = function(passport) { 
    router.post('/signupform', function(req, res, next) {
        var username = req.body.username; //post parametry
        var password = req.body.password;
  	    signup(username, password, next);
    });
    
    router.post(/loginform|signupform/, function(req, res, next) {
        passport.authenticate('local', function(err, user, info) {
            if (err) { 
                return next(err); 
            }
            if (!user) {
                var error = new Error('Špatné jméno nebo heslo.');
                error.status = 401;
                return next(error);
            }
            req.login(user, function(err) {
                if (err) {
                    return next(err);
                }
                return res.redirect('/');
            });
        })(req, res, next);  
    });
    
    router.get('/login', function(req, res) {
	    res.render('login', {
            alertMessage: req.alertMessage
        });
    });
    
    router.get('/loginform|signupform/', function(req, res, next) {
        res.redirect('/login');
    });
   
    router.get('/', isAuthenticated, function(req, res) {
        res.render('index', {
            username:req.user.username
        });  
    });
  
    router.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });
    
    return router;
}
