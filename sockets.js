var db = require('./database/conn');
//this file exports the custom socket.io functionality to app.js and is provided the io object by app.js
module.exports = function(io){
  io.on('connection', function(socket){
    var session = socket.request.session;
    console.log(session.passport === undefined ? 'user connected' : session.passport.user === undefined ? 'user connected' : session.passport.user + ' connected'); 
     
    //update socket's threads on connection
    db.all("SELECT id,name FROM threads", function(err,rows){
       socket.emit("printThreads",rows);
    });  
    
    //receiving createThread
    socket.on('createThread',function(name){
      db.run("INSERT INTO threads ('name') VALUES (?)",name);
      db.all("SELECT id,name FROM threads", function(err,rows){
        io.emit("printThreads",rows); //update everyone's list upon creation of new one
      });
    });
    
    //on user joining thread
    socket.on('joinThread',function(id){
      socket.leave(socket.thread);
      socket.join(id);
      socket.thread = id;
      db.all("SELECT thread,content FROM messages WHERE thread = ?",id,function(err,rows){
        socket.emit("printMessages",rows); //display messages to socket upon joining
      });
      db.get("SELECT name FROM threads WHERE id = ?",id,function(err,row){
        socket.emit("threadJoined",row.name);
      });
    });
    
    //on disconnect of socket    
    socket.on('disconnect', function(){
      console.log('user disconnected');
    });  
     
    //on message being sent
    socket.on('message', function(msg){
      io.in(socket.thread).emit('message', msg);
      db.run("INSERT INTO messages ('thread','sender','content') VALUES (?,?,?)",socket.thread,session.passport.user,msg);
    });
  });
}
