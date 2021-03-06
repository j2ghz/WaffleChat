var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http').Server(express);

//express
var app = express();

//view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

//sass
var sassMiddleware = require('node-sass-middleware');
app.use(sassMiddleware({
    src: path.join(__dirname, 'sass'),
    dest: path.join(__dirname, 'public/stylesheets'),
    debug: true,
    outputStyle: 'compressed',
    sourceMap: true,
    prefix:  '/stylesheets'  // Where prefix is at <link rel="stylesheets" href="prefix/style.css"/>
}));

//parser, logger a pathing
app.use(favicon(path.join(__dirname, 'public', 'favicon.gif')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/bower_components',  express.static(__dirname + '/bower_components'));

//databáze
var db = require('./database/conn');
db.run("CREATE TABLE if not exists threads (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, creator TEXT, lastActivity TEXT, lastSender TEXT)");
db.run("CREATE TABLE if not exists messages (id INTEGER PRIMARY KEY AUTOINCREMENT, thread TEXT, sender TEXT, content TEXT, date TEXT)");
db.run('CREATE TABLE if not exists users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT, salt TEXT)');

//sessiony
var expressSession = require('express-session');
var FileStore = require('session-file-store')(expressSession);
var sessionMiddleware = expressSession({
  store:new FileStore(),
  cookie:{
    secure:false, /*https*/
    maxAge:(1000 * 60 * 60 * 24 * 7)
  },
  secret:'seminarka',
  resave:true,
  saveUninitialized:true
})
app.use(sessionMiddleware);

//passport
var passport = require('passport');
app.use(passport.initialize());
app.use(passport.session());
var initPassport = require('./passport/init');
initPassport(passport);

//socket.io
var io = require('socket.io')();
io.use(function(socket, next) {
    sessionMiddleware(socket.request, socket.request.res, next);
});
app.io = io; //poskytne io object /bin/www souboru pro připojení socket.io k serveru
require('./sockets')(io); //logika socket.io se získá ze souboru sockets.js

//routes
var routes = require('./routes/index')(passport);
app.use('/', routes);

//error handlery
//nejprve se odchytí 404
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

//přesměrování při chybných údajích
app.use(function(err, req, res, next) {
    if (err.status === 401 || err.status === 422) {
        res.status(err.status);
        res.render('login', {
            alertMessage: err.message
        });
    } else {
        next(err);
    }
});

//development error handler
//ukáže stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

//production error handler
//žádný stacktrace
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;