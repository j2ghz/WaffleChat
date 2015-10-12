//this file exports the custom socket.io functionality to app.js and is provided the io object by app.js
module.exports = function(io){
  var sqlite3 = require('sqlite3').verbose();
  var db = new sqlite3.Database('database/sqlite.db');
  var uuid = require('node-uuid');
  db.serialize(function() {
    db.run("CREATE TABLE if not exists threads (id TEXT, name TEXT)");
  });
  var listOfThreads = ["swag"]; //load list of threads from database
  io.on('connection', function(socket){
    socket.emit('updateThreads',listOfThreads);
    console.log('user connected');
    db.all("SELECT id,name FROM threads", function(err,rows){
       io.emit("printThreads",rows);
    });
    socket.on('joinThread',function(threadName){
      db.run("INSERT INTO threads ('id','name') VALUES ('"+uuid.v4()+"','"+threadName+"')");
      socket.leave(socket.thread);
      socket.join(threadName);
      socket.thread = threadName;
      listOfThreads.push(threadName);
    });
    
    socket.on('disconnect', function(){
      console.log('user disconnected');
    });
    
    socket.on('chatMessage', function(msg){
      io.in(socket.thread).emit('chatMessage', msg);
    });
  });
}
