var db = require('./database/conn');
//this file exports the custom socket.io functionality to app.js and is provided the io object by app.js
module.exports = function(io) {
  io.on('connection', function(socket) {
    var session = socket.request.session;
    if (session.passport !== undefined) {
        if (session.passport.user !== undefined) {
            db.get('SELECT username FROM users WHERE id = ?', session.passport.user, function(err, row) {
                socket.username = row.username;
                socket.userid = session.passport.user;
                console.log(socket.username + ' connected'); 
            }); 
        } else {
            socket.username = null;
            console.log('previously logged user connected');
        }       
    } else {
        socket.username = null;
        console.log('user connected');
    }
    
    //on connection list all threads
    db.all('SELECT * FROM threads', function(err, rows) {
        socket.emit('printThreads', rows);
    });  
    
    //on user creating a thread
    socket.on('createThread', function(name) {
        db.run("INSERT INTO threads ('name', 'creator') VALUES (?, ?)", name, socket.username);
        db.all('SELECT * FROM threads', function(err, rows) {
            io.emit('printThreads', rows); //update everyone's list upon creation of new one
        });
    });
    
    //on user joining thread
    socket.on('joinThread', function(id) {
        if (socket.rooms.indexOf(id) === -1) {  
            socket.join(id);
            var name;
            db.get('SELECT name FROM threads WHERE id = ?', id, function(err, row) {
                name = row.name;
            });    
            db.all('SELECT content, sender, date FROM messages WHERE thread = ?', id, function(err, messagesRows) {
                socket.emit('printMessages', messagesRows, id, name); //display messages to socket upon joining
            });
        }
    });
    
    //on user leaving thread
    socket.on('leaveThread', function(id) {
        socket.leave(id);
    });
     
    //on message being sent
    socket.on('message', function(thread, content) {
        var d = new Date().toJSON();
        io.in(thread).emit('message', thread, d, socket.username, content);
        io.emit('notifyInThreadList', thread, d, socket.username);
        db.run("INSERT INTO messages ('thread', 'sender', 'content', 'date') VALUES (?, ?, ?, ?)", thread, socket.username, content, d);
        db.run("UPDATE threads SET lastActivity = ? WHERE id = ?", d, thread);
        db.run("UPDATE threads SET lastSender = ? WHERE id = ?", socket.username, thread);
    });
    
    //on disconnect of socket    
    socket.on('disconnect', function() {
        console.log(socket.username + ' disconnected');
    });  
  });
}
