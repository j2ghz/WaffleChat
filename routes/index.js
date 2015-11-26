var express = require('express');
var router = express.Router();
var isAuthenticated = function (req, res, next) {
	// if user is authenticated in the session, call the next() to call the next request handler 
	// Passport adds this method to request object. A middleware is allowed to add properties to
	// request and response objects
	if (req.isAuthenticated())
		return next();
	// if the user is not authenticated then redirect him to the login page
	res.redirect('/');
}

module.exports = function(passport){
  /* GET home page. */
  router.get('/', function(req, res, next) {
    res.render('index');
  }); 
  router.post('/login', 
  	passport.authenticate('local', { 
		  successRedirect: '/good-login',
      failureRedirect: '/bad-login',
      failureFlash : true   
	  })
  );
  router.get('/good-login', isAuthenticated, function(req,res){
	  res.render('index',{username:req.user.username});  
  });
  return router;
}
