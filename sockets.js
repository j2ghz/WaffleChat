//this file exports the custom socket.io functionality to app.js and is provided the io object by app.js
module.exports = function(io){
  var sqlite3 = require('sqlite3').verbose();
  var db = new sqlite3.Database('database/sqlite.db');
  db.serialize(function() {
    db.run("CREATE TABLE if not exists threads (name TEXT)");
  });
  var listOfThreads = ["swag"]; //load list of threads from database
  io.on('connection', function(socket){
    socket.emit('updateThreads',listOfThreads);
    console.log('user connected');
    
    socket.on('joinThread',function(threadName){
      db.run("INSERT INTO threads ('name') VALUES ('"+threadName+"')");
      socket.leave(socket.thread);
      socket.join(threadName);
      socket.thread = threadName;
      listOfThreads.push(threadName);
      io.emit('updateThreads',listOfThreads);
    });
    
    socket.on('disconnect', function(){
      console.log('user disconnected');
    });
    
    socket.on('chatMessage', function(msg){
      io.in(socket.thread).emit('chatMessage', msg);
    });
  });
}
