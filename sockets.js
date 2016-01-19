var db = require('./database/conn');
var validator = require('validator');
//tento soubor exportuje vlastní socket.io funkce do app.js a od app.js dostává io objekt
module.exports = function(io) {
  io.on('connection', function(socket) {
    socket._name = null;
    socket._id = null;
    socket._threads = [];
    var session = socket.request.session;
    
    //po připojení se nastaví na serveru jméno a id každého socketu na základě passport sessionu
    if (session.passport !== undefined) {
        if (session.passport.user !== undefined) {
            db.get('SELECT username FROM users WHERE id = ?', validator.escape(session.passport.user), function(err, row) {
                if (!row) {
                    console.log('user whose id is not in DB connected');
                } else {
                    socket._name = row.username;
                    socket._id = session.passport.user;
                    console.log(socket._name + ' connected');
                    socket.emit('setUsername', socket._name); 
                }
            }); 
        } else {
            console.log('previously logged user connected');
        }       
    } else {
        console.log('user connected');
    }
    
    //po připojení se odešle seznam všech threadů uživateli
    db.all('SELECT * FROM threads', function(err, rows) {
        socket.emit('printThreads', rows);
    });  
    
    //když uživatel vytvoří thread
    socket.on('createThread', function(name) {
        name = validator.escape(validator.trim(name));
        
        if (validator.isLength(name, 1, 255)) {
            db.run("INSERT INTO threads ('name', 'creator') VALUES (?, ?)", name, socket._name, function() {
                io.emit('printThread', this.lastID, name, socket._name); //všem ostatním se odešle vytvoření nového threadu   
            });
            socket.emit('showSuccess', '', 'Vytvořil jsi thread se jménem ' + name + '.');
        } else {
            if (name === '') {
                socket.emit('showError', '', 'Nemůžeš vytvořit thread beze jména.');
            } else {
                socket.emit('showError', 'Příliš mnoho znaků', 'Maximální délka je 255 znaků.');
            }
            return false;
        }
    });
    
    //když se uživatel připojí do threadu
    socket.on('joinThread', function(id) {
        var name = null;
        id = validator.toInt(id);
        
        if (socket.rooms.indexOf(id) === -1) {   //pokud ještě ve threadu není
            db.get('SELECT name FROM threads WHERE id = ?', id, function(err, row) { //najde se jméno threadu
                if(!row){
                    socket.emit('showError', '', 'Tento thread již neexistuje.');
                    return false;
                } else {
                    socket.join(id);   //socket se připojí do threadu
                    socket._threads.push(id);
                    name = row.name;    //nastaví se jméno threadu pro zobrazení v klientovi
                    db.all('SELECT * FROM messages WHERE thread = ?', id, function(err, messagesRows) {
                        socket.emit('joinThread', messagesRows, id, name); //display messages to socket upon joining                                             
                    });           
                } 
            });
        }     
    });
    
    //když uživatel zavře thread
    socket.on('leaveThread', function(id) {
        id = validator.toInt(id);
        socket.leave(id);
        socket._threads.splice(socket._threads.indexOf(id), 1);       
        io.in(id).emit('tempMessage', id, socket._name, null); //hide temp message of user if exists
    });
     
    //když odešle zprávu
    socket.on('message', function(thread, content) {
        var d = new Date().toJSON();
        thread = validator.toInt(thread);
        content = validator.escape(validator.trim(content));
        
        if (content === '') { //pokud je zpráva prázdná
            socket.emit('showError', '', 'Nemůžeš poslat prázdnou zprávu.');
        } else {
            db.get("SELECT * FROM threads WHERE id = ?", thread, function(err, row) {
                if (!row) { //pokud se nenajde thread, kam má být zpráva odeslána
                    socket.emit('showError', '', 'Tento thread již neexistuje.');
                    return false;
                } else {
                    db.run("INSERT INTO messages ('thread', 'sender', 'content', 'date') VALUES (?, ?, ?, ?)", thread, socket._name, content, d, function() {
                        var id = this.lastID //vytvoří se id posledního message pro pozdější případné úpravy či mazání zpráv
                        db.run("UPDATE threads SET lastActivity = ? WHERE id = ?", d, thread);
                        db.run("UPDATE threads SET lastSender = ? WHERE id = ?", socket._name, thread);
                        io.in(thread).emit('message', id, thread, d, socket._name, content); //odešle se zpráva všem uživatelům, kteří jsou v threadu připojení
                        io.emit('notifyInThreadList', thread, d, socket._name); //zobrazí se také upozornění na novou zprávu v seznamu threadů (nové zprávy od načtení)
                    });
                }
            });
        }
    });
    
    //po každé úpravě textového pole se odešle dočasná zpráva, která ostatním uživatelům zobrazí, co právě dotyčný píše
    socket.on('tempMessage', function(thread, content) {
        thread = validator.toInt(thread);
        content = validator.escape(validator.trim(content));
        
        io.in(thread).emit('tempMessage', thread, socket._name, content);
    });
    
    //při smazání zprávy
    socket.on('deleteMessage', function(id) {
        id = validator.toInt(id);
        db.get('SELECT sender, thread FROM messages WHERE id = ?', id, function(err, row) {   
            if (!row) {
                socket.emit('showError', '', 'Tato zpráva již neexistuje.');
                return false;
            } else {
                if (row.sender === socket._name) { //kontrola, zda uživatel je odesílatelem mazané zprávy
                    db.run("UPDATE messages SET content = ? WHERE id = ?", null, id);
                    socket.emit('showSuccess', 'Zpráva smazána', '');
                    io.in(row.thread).emit('deleteMessage', id, row.thread);
                } else {
                    socket.emit('showError', '', 'Můžeš smazat jen své vlastní zprávy.');
                    return false;
                }
            }
        });
    });
    
    //při úpravě zprávy
    socket.on('editMessage', function(id, content) {
       id = validator.toInt(id);
       content = validator.escape(validator.trim(content)); 
       
       db.get('SELECT sender, thread FROM messages WHERE id = ?', id, function(err, row) { 
            if (!row) {
                socket.emit('showError', '', 'Tato zpráva již neexistuje.');
                return false;
            } else {
                if (row.sender === socket._name) {
                    if (!content || (content === '')) { //pokud zpráva je prázdná
                        db.run("UPDATE messages SET content = ? WHERE id = ?", null, id);
                        socket.emit('showSuccess', 'Zpráva smazána', 'Prázdné zprávy nejsou přípustné.');
                        io.in(row.thread).emit('deleteMessage', id, row.thread);
                    } else {
                        db.run("UPDATE messages SET content = ? WHERE id = ?", content, id);
                        socket.emit('showSuccess', 'Zpráva upravena', '');
                        io.in(row.thread).emit('editMessage', id, row.thread, content);
                    }
                } else {
                    socket.emit('showError', '', 'Můžeš upravovat jen své vlastní zprávy.');
                    return false;
                }
            }
       });
    });
    
    //při úpravě názvu threadu
    socket.on('editThread', function(id, name) {
        id = validator.toInt(id);
        name = validator.escape(validator.trim(name));
        
        if (validator.isLength(name, 1, 255)) {
            db.get('SELECT creator FROM threads WHERE id = ?', id, function(err, row) {
                if (row.creator === socket._name) {
                    db.run("UPDATE threads SET name = ? WHERE id = ?", name, id);
                    socket.emit('showSuccess', 'Thread přejmenován', 'Nyní se jmenuje ' + name);
                    io.emit('editThread', id, name);
                } else {
                    socket.emit('showError', '', 'Můžeš přejmenovat jen své vlastní thready.');
                    return false;
                }
            });
        } else {
            if (name === '') {
                socket.emit('showError', '', 'Nemůžeš přejmenovat thread na prázdné pole.');
            } else {
                socket.emit('showError', 'Příliš mnoho znaků', 'Maximální délka je 255 znaků.');
            }
        return false;
        }
    });
    
    //při mazání threadu
    socket.on('deleteThread', function(id) {
        id = validator.toInt(id);
        db.get('SELECT lastActivity FROM threads WHERE id = ?', id, function(err, row) {
            if (row.lastActivity === null) { //pokud je thread prázdný
                db.get('SELECT creator FROM threads WHERE id = ?', id, function(err, row) {
                    if (row.creator === socket._name) {
                        db.run("DELETE FROM threads WHERE id = ?", id);
                        socket.emit('showSuccess', 'Thread smazán', '');
                        io.emit('deleteThread', id);
                    } else {
                        socket.emit('showError', '', 'Můžeš smazat jen své vlastní thready.');
                        return false;
                    }
                });     
            } else {
                socket.emit('showError', '', 'Můžeš smazat jen thread bez zpráv.');
            }
        });
    });  
    
    //při odpojení socketu
    socket.on('disconnect', function() {
        var room = null;
        while(socket._threads.length > 0) {
            room = socket._threads.pop();
            io.in(room).emit('tempMessage', room, socket._name, null); //smažou se veškeré dočasné zprávy od uživatele
        }
        console.log(socket._name + ' disconnected');
    });  
  });
}
