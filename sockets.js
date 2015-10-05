//this file exports the custom socket.io functionality to app.js and is provided the io object by app.js
module.exports = function(io){
  var sqlite3 = require('sqlite3').verbose();
  var db = new sqlite3.Database('database/sqlite.db');
  db.serialize(function() {
    db.run("CREATE TABLE if not exists threads (info TEXT)");
  });
  var clients = {}, rooms = {};
  io.on('connection', function(socket){
    console.log('user connected');
    socket.on('joinRoom',function(roomId){
      socket.join(roomId);
      socket.room = roomId;
    });
    socket.on('disconnect', function(){
      console.log('user disconnected');
    });
    socket.on('chat message', function(msg){
      io.in(socket.room).emit('chat message', msg);
    });
  });
}
