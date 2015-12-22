var express = require('express');
var router = express.Router();
var signup = require('../passport/signup');
var isAuthenticated = function (req, res, next) {
	// if user is authenticated in the session, call the next() to call the next request handler 
	// Passport adds this method to request object. A middleware is allowed to add properties to
	// request and response objects
	if (req.isAuthenticated())
		return next();
	// if the user is not authenticated then redirect him to the login page
	res.redirect('/login');
}
module.exports = function(passport) {
    router.post('/loginform', passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/bad-login',
        failureFlash : true   
    }));
  
    router.post('/signupform', function(req, res, next) {
        var username = req.body.username; //get post parameters
        var password = req.body.password;
  	    signup(username, password);
        next(); //first sign up
    });
    router.post('/signupform', passport.authenticate('local', { //then automatically log in as new user
        successRedirect: '/',
        failureRedirect: '/bad-login',
        failureFlash : true   
	}));
  
    router.get('/login', function(req, res) {
	   res.render('login');
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
