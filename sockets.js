//this file exports the custom socket.io functionality to app.js and is provided the io object by app.js
module.exports = function(io){
  io.on('connection', function(socket){
    console.log('a user connected');
    socket.on('disconnect', function(){
      console.log('user disconnected');
    });
    socket.on('chat message', function(msg){
      io.emit('chat message', msg);
    });
  });
}
