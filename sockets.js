var db = require('./database/conn');
var validator = require('validator');
//this file exports the custom socket.io functionality to app.js and is provided the io object by app.js
module.exports = function(io) {
  io.on('connection', function(socket) {
    socket.username = null;
    socket.userid = null;
    var session = socket.request.session;
    
    if (session.passport !== undefined) {
        if (session.passport.user !== undefined) {
            db.get('SELECT username FROM users WHERE id = ?', validator.escape(session.passport.user), function(err, row) {
                if (!row) {
                    console.log('user whose id is not in DB connected');
                } else {
                    socket.username = row.username;
                    socket.userid = session.passport.user;
                    console.log(socket.username + ' connected');
                    socket.emit('setUsername', socket.username); 
                }
            }); 
        } else {
            console.log('previously logged user connected');
        }       
    } else {
        console.log('user connected');
    }
    
    //on connection list all threads
    db.all('SELECT * FROM threads', function(err, rows) {
        socket.emit('printThreads', rows);
    });  
    
    //on user creating a thread
    socket.on('createThread', function(name) {
        name = validator.escape(validator.trim(name));
        
        if (validator.isLength(name, 1, 255)) {
            db.run("INSERT INTO threads ('name', 'creator') VALUES (?, ?)", name, socket.username, function() {
                io.emit('printThread', this.lastID, name, socket.username); //update everyone's list upon creation of new one    
            });
            socket.emit('showSuccess', '', 'You have created a room called ' + name + '.');
        } else {
            if (name === '') {
                socket.emit('showError', '', 'You cannot create a thread with a blank name.');
            } else {
                socket.emit('showError', 'Too long', 'Maximum length is 255 characters.');
            }
            return false;
        }
    });
    
    //on user joining thread
    socket.on('joinThread', function(id) {
        var name = null;
        id = validator.toInt(id);
        
        if (socket.rooms.indexOf(id) === -1) {  
            db.get('SELECT name FROM threads WHERE id = ?', id, function(err, row) { //check if thread exists and if it does, find its name
                if(!row){
                    socket.emit('showError', '', 'This thread no longer exists.');
                    return false;
                } else {
                    socket.join(id);   
                    name = row.name;    
                    db.all('SELECT * FROM messages WHERE thread = ?', id, function(err, messagesRows) {
                        socket.emit('joinThread', messagesRows, id, name); //display messages to socket upon joining
                    });           
                } 
            });
        }     
    });
    
    //on user leaving thread
    socket.on('leaveThread', function(id) {
        id = validator.toInt(id);
        socket.leave(id);
        io.in(id).emit('tempMessage', id, null, socket.username); //hide temp message of user if exists
    });
     
    //on message being sent
    socket.on('message', function(thread, content) {
        var d = new Date().toJSON();
        thread = validator.toInt(thread);
        content = validator.escape(validator.trim(content));
        
        if (content === '') {
            socket.emit('showError', '', 'You cannot send an empty message.');
        } else {
            db.get("SELECT * FROM threads WHERE id = ?", thread, function(err, row) {
                if (!row) {
                    socket.emit('showError', '', 'This thread no longer exists.');
                    return false;
                } else {
                    db.run("INSERT INTO messages ('thread', 'sender', 'content', 'date') VALUES (?, ?, ?, ?)", thread, socket.username, content, d, function() {
                        var id = this.lastID
                        db.run("UPDATE threads SET lastActivity = ? WHERE id = ?", d, thread);
                        db.run("UPDATE threads SET lastSender = ? WHERE id = ?", socket.username, thread);
                        io.in(thread).emit('message', id, thread, d, socket.username, content);
                        io.emit('notifyInThreadList', thread, d, socket.username);
                    });
                }
            });
        }
    });
    
    socket.on('tempMessage', function(thread, content) {
        var d = new Date().toJSON()
        thread = validator.toInt(thread);
        content = validator.escape(validator.trim(content));
        
        io.in(thread).emit('tempMessage', thread, d, socket.username, content);
    })
    
    //thread and message editing and deleting
    socket.on('editThread', function(id, name) {
        id = validator.toInt(id);
        name = validator.escape(validator.trim(name));
        
        if (validator.isLength(name, 1, 255)) {
            db.get('SELECT creator FROM threads WHERE id = ?', id, function(err, row) {
                if (row.creator === socket.username) {
                    db.run("UPDATE threads SET name = ? WHERE id = ?", name, id);
                    socket.emit('showSuccess', 'Thread renamed', 'It is now called ' + name);
                    io.emit('editThread', id, name);
                } else {
                    socket.emit('showError', '', 'You can only rename threads which you have created.');
                    return false;
                }
            });
        } else {
            if (name === '') {
                socket.emit('showError', '', 'You cannot rename a thread to a blank string.');
            } else {
                socket.emit('showError', 'Too long', 'Maximum length is 255 characters.');
            }
        return false;
        }
    });
    
    socket.on('deleteThread', function(id) {
        id = validator.toInt(id);
        db.get('SELECT lastActivity FROM threads WHERE id = ?', id, function(err, row) {
            if (row.lastActivity === null) {
                db.get('SELECT creator FROM threads WHERE id = ?', id, function(err, row) {
                    if (row.creator === socket.username) {
                        db.run("DELETE FROM threads WHERE id = ?", id);
                        socket.emit('showSuccess', 'Thread deleted', 'Rest in peace.');
                        io.emit('deleteThread', id);
                    } else {
                        socket.emit('showError', '', 'You can only delete threads which you have created.');
                        return false;
                    }
                });     
            } else {
                socket.emit('showError', '', 'You can only delete empty threads.');
            }
        });
    });  
    
    //on disconnect of socket    
    socket.on('disconnect', function() {
        console.log(socket.username + ' disconnected');
    });  
  });
}
