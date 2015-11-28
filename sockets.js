//this file exports the custom socket.io functionality to app.js and is provided the io object by app.js
module.exports = function(io,app,db){
  var uuid = require('node-uuid');
  var listOfThreads = []; //load list of threads from database

  db.run("CREATE TABLE if not exists threads (id TEXT, name TEXT)");
  db.run("CREATE TABLE if not exists messages (thread TEXT, sender TEXT, content TEXT)");
  db.run('CREATE TABLE if not exists users ( "id" INTEGER PRIMARY KEY AUTOINCREMENT,"username" TEXT,"password" TEXT,"salt" TEXT)');
  
  io.on('connection', function(socket){
    console.log(socket.request.session);
    socket.emit('updateThreads',listOfThreads);
    console.log('user connected');  
    db.all("SELECT id,name FROM threads", function(err,rows){
       io.emit("printThreads",rows);
    });  
    socket.on('createThread',function(threadName){
      var threadId = uuid.v4();
      db.run("INSERT INTO threads ('id','name') VALUES ('"+threadId+"','"+threadName+"')");
      listOfThreads.push(socket.thread);
      db.all("SELECT id,name FROM threads", function(err,rows){
        io.emit("printThreads",rows);
      });
    });
    socket.on('joinThread',function(threadId){
      socket.leave(socket.thread);
      socket.join(threadId);
      socket.thread = threadId;
      db.all("SELECT thread,content FROM messages WHERE thread='"+threadId+"'",function(err,rows){
        io.emit("printMessages",rows);
      });
    });    
    socket.on('disconnect', function(){
      console.log('user disconnected');
    });   
    socket.on('message', function(msg){
      io.in(socket.thread).emit('message', msg);
      db.run("INSERT INTO messages ('thread','content') VALUES ('"+socket.thread+"','"+msg+"')");
    });
  });
}
