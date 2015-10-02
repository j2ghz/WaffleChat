//this file exports the custom socket.io functionality to app.js and is provided the io object by app.js
module.exports = function(app,io){
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
