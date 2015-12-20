/* global db */
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http').Server(express);
var users = require('./routes/users');

//database
var sqlite3 = require('sqlite3').verbose();
db = new sqlite3.Database('database/sqlite.db');
db.run("CREATE TABLE if not exists threads (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)");
db.run("CREATE TABLE if not exists messages (thread TEXT, sender TEXT, content TEXT)");
db.run('CREATE TABLE if not exists users ( "id" INTEGER PRIMARY KEY AUTOINCREMENT,"username" TEXT,"password" TEXT,"salt" TEXT)');

//express
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

//parser, logger and pathing
// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//sessions
var expressSession = require('express-session');
var FileStore = require('session-file-store')(expressSession);
var sessionMiddleware = expressSession({
  store:new FileStore(),
  secret:'someSecret',
  key:'express.sid',
  name:"session",
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

//add flash messages

//socket.io
var io = require('socket.io')();
io.use(function(socket, next) {
    sessionMiddleware(socket.request, {}, next);
});
app.io = io; //provide io object to /bin/www via module.export of app to attach to server
require('./sockets')(io); //use logic from sockets.js file and provide io object from this file

//routes
var routes = require('./routes/index')(passport);
app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

module.exports = app;