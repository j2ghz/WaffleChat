/* global db */
//this file exports the custom socket.io functionality to app.js and is provided the io object by app.js
var uuid = require('node-uuid');
module.exports = function(io){
  io.on('connection', function(socket){
    var ss = socket.conn.request.session;
    console.log(ss.passport.user === undefined ? 'user' + ' connected' : ss.passport.user + ' connected');  
    //update socket's threads on connection
    db.all("SELECT id,name FROM threads", function(err,rows){
       socket.emit("printThreads",rows);
    });  
    //receiving createThread
    socket.on('createThread',function(threadName){
      var threadId = uuid.v4(); //unique id
      db.run("INSERT INTO threads ('id','name') VALUES ('"+threadId+"','"+threadName+"')");
      db.all("SELECT id,name FROM threads", function(err,rows){
        io.emit("printThreads",rows); //update everyone's list upon creation of new one
      });
    });
    //on user joining thread
    socket.on('joinThread',function(threadId){
      socket.leave(socket.thread);
      socket.join(threadId);
      socket.thread = threadId;
      db.all("SELECT thread,content FROM messages WHERE thread='"+threadId+"'",function(err,rows){
        socket.emit("printMessages",rows); //display messages to socket upon joining
      });
    });
    //on disconnect of socket    
    socket.on('disconnect', function(){
      console.log('user disconnected');
    });   
    //on message being sent
    socket.on('message', function(msg){
      io.in(socket.thread).emit('message', msg);
      db.run("INSERT INTO messages ('thread','content') VALUES ('"+socket.thread+"','"+msg+"')");
    });
  });
}
