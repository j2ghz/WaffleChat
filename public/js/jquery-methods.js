/* global $thread */
/* global swal */
/* global socket */
(function($) { 
// --- MISC ---
    //kontroluje, zda je nutné scrollovat nebo ne
    $.fn._hasScrollBar = function() {
        var e = this.get(0);
        return {
            vertical: e.scrollHeight > e.clientHeight,
            horizontal: e.scrollWidth > e.clientWidth
        };
    }
    
    //kontrola pozice scrollbaru (pokud je úplně dole nebo scrollbar není, vrátí true)
    $.fn._isAtBottom = function() {
        if (Math.floor(this.scrollTop() + this.height()) === this[0].scrollHeight) {
            return true;
        } else {
            return false;
        }
    }
    
// --- THREAD WINDOW ---
    //cache threadu, tj. uloží se podelementy do vlastnosti objektu cached
    $.fn._cacheThread = function() {
        this.cached = {
            form:$('form', this),
            textarea:$('textarea', this),
            close:$('i.close', this),
            h3:$('h3', this),
            notification:$('i.notification', this),
            messages:$('.messages', this)
        }
        return this;
    }
    
    //cache zprávy
    $.fn._cacheMessage = function() {
        this.cached = {
            content:$('.messageContent', this),
            deleteMessage:$('.deleteMessage', this),
            editMessage:$('.editMessage', this)
        }
        return this;
    }
    
    //zavře okno
    $.fn._close = function() {
        var id = this.data('id');
        socket.emit('leaveThread', id);
        this.remove();
        $thread[id] = undefined;
        return this;
    }
    
    //umožní zavírat okno
    $.fn._makeClosable = function() {
        var _this = this;
        this.cached.close.click(function() { //způsobí funkčnost ikony X
            _this._close();
        });
        return this;
    }
    
    //schová nebo ukáže thread
    $.fn._collapse = function() {
        var id = this.data('id');
        this.toggleClass('collapsed'); //different display of header
        
        if (this.hasClass('collapsed') === false && this.cached.notification.hasClass('fa-comment') === true) { //pokud je notifikace a ukazujeme thread
            this._scrollToLastMessage(true); //scroll dolů
            this._hideNotification(id); //a schovat notifikaci
        }  
        return this;
    }
    
    //umožní schovat nebo ukázat thread
    $.fn._makeCollapsible = function() {
        var id = this.data('id'), _this = this;
        this.cached.h3.click(function() {
            _this._collapse(id);
        });
        return this;
    }
    
    //umožní odesílat thread
    $.fn._makeSubmittable = function() {
        var textarea = this.cached.textarea,
            id = this.data('id'),
            messageTimer;
        
        //při odeslání
        this.cached.form.submit(function (){
            if (textarea.val() !== '') { //pokud není pole prázdné
                socket.emit('message', id, textarea.val()); //odešle se serveru zpráva s id threadu, kam patří
                textarea.val(''); //nastaví se hodnota textarea zpět na nic
            }
            return false;
        });   
            
        //při stisku klávesy
        textarea.keydown(function(e) {
            if ((e.keyCode == 13) && (e.shiftKey === false)) { //pokud nedrží uživatel shift, odešle se zpráva při stisku enteru
                e.preventDefault();  
                $(this.form).submit(); //odešle se formulář
                return false;   
            }           
        });
        
        //po úpravě textového pole se odešle dočasná zpráva
        textarea.on('input', function(e) {
            clearTimeout(messageTimer);
            messageTimer = setTimeout(function() {
                socket.emit('tempMessage', id, textarea.val());
            }, 100);
        })
        return this;
    }
    
    //umožní mazat zprávy
    $.fn._makeMessageDeletable = function() {
        var id = this.data('id');
        this.cached.deleteMessage.click(function(e) {
            swal({
                type:'warning',
                title:'Smazat zprávu?',
                text:'Zpráva nemůže být obnovena.',
                showCancelButton:true,
                confirmButtonText:'Smazat',
                cancelButtonText:'Storno',
                closeOnConfirm:false,
                showLoaderOnConfirm:true,
                allowOutsideClick:true
            }, function(isConfirm) {
                if (isConfirm) {
                    socket.emit('deleteMessage', id);
                }         
            });
        });
    }
    
    //umožní upravovat zprávy
    $.fn._makeMessageEditable = function() {
        var _this = this, id = this.data('id');       
        this.cached.editMessage.click(function(e) {
            var content = _this.cached.content;
            content.attr('contenteditable', 'true');  
            content.focus(); 
            
            content.keydown(function(e) {
                if ((e.keyCode == 13) && (e.shiftKey === false)) {
                    e.preventDefault();  
                    content.attr('contenteditable', 'false'); 
                    socket.emit('editMessage', id, content.html());
                }
                if (e.keyCode == 27) {
                    content.attr('contenteditable', 'false'); 
                }           
            });
        });
    }
    
    //schová notifikaci
    $.fn._hideNotification = function() {
        this.cached.notification.addClass('fa-comment-o');
        this.cached.h3.removeClass('notifying');
        this.cached.notification.removeClass('fa-comment');
        return this;
    }
    
    //ukáže notifikaci
     $.fn._showNotification = function() {
        this.cached.notification.addClass('fa-comment');
        this.cached.h3.addClass('notifying');
        this.cached.notification.removeClass('fa-comment-o');
        return this;
    }
    
    //upozorní uživatele na novou zprávu
    $.fn._notifyOfNewMessage = function() {      
        var _this = this;        
        this._showNotification();
        
        //schování notifikace
        if (this.hasClass('collapsed') === false) { //pokud thread není schovaný
            if ((this.cached.messages._isAtBottom() === true) || (this.cached.messages._hasScrollBar().vertical === false)) {
                //pokud není okno dost velké na to, aby mělo scrollbar nebo je úplně dole
                var notificationTimer;
                clearTimeout(notificationTimer);
                notificationTimer = setTimeout(function() { //notifikace se schová po jedné sekundě
                    _this._hideNotification();
                }, 1000);   
            } else {
                //jinak po doscrollování
                var scrollTimer;
                this.cached.messages.scroll(function() { 
                    clearTimeout(scrollTimer);
                    scrollTimer = setTimeout(function() { //aby se funkce nevolala na každý scroll, tak se vždy počká 250 ms
                        if (_this.cached.messages._isAtBottom()) {
                            _this._hideNotification();
                            _this.cached.messages.off('scroll'); //přestane se kontrolovat scroll po schování notifikace
                        }
                    }, 250);
                });
            }
        }
        return this;
    }
    
    //scrollne úplně dolů
    $.fn._scrollToLastMessage = function(animation) { 
        var duration = 0;
        
        if (animation === true) { duration = 400; } //pokud je argument true, bude to trvat 400 ms
        this.cached.messages.animate({
            scrollTop: this.cached.messages[0].scrollHeight,
        }, duration);
        return this;
    }
    
// --- THREAD LIST ---
    //cache prvku v seznamu threadů
    $.fn._cacheThreadLi = function() {
        this.cached = {
            lastActivity:$('.threadLastActivity .value', this),
            numberOfMessages:$('.threadNewMessages .value', this),
            editThread:$('i.editThread', this),
            deleteThread:$('i.deleteThread', this),
            threadName:$('.threadName', this)
        }
        return this;
    }
    
    //umožní připojovat se do threadu
    $.fn._makeJoinable = function() {
        var id = this.data('id');
        this.click(function(e) { //po kliknutí na thread
            if (e.target.classList[0] !== 'fa') { //a pokud se nekliklo na ikonu
                e.preventDefault();
                if (!$thread[id]) { //pokud ještě v threadu nejsme připojení
                    socket.emit('joinThread', id); 
                } else {
                    $thread[id]._collapse(); //jinak se přepne ukázání
                }
            }
        });
    }
    
    //umožní editovat název threadu
    $.fn._makeThreadEditable = function() {
        var id = this.data('id'), _this = this;
        this.cached.editThread.click(function(e) {
            swal({
                type:'input',
                title:'Změnit jméno',
                text:'Můžeš napsat maximálně 255 znaků.',
                inputValue:_this.cached.threadName.html(),
                showCancelButton:true,
                confirmButtonText:'Změnit',
                cancelButtonText:'Storno',
                closeOnConfirm:false,
                showLoaderOnConfirm:true,
                allowOutsideClick:true
            }, function(inputValue) {
                if (inputValue === false) return false;
                if (inputValue === '') {
                    swal.showInputError("Musíš něco napsat!");
                    return false;
                }
                if (inputValue.length > 255) {
                    swal.showInputError("Maximální délka je 255 znaků.");
                    return false;
                }
                socket.emit('editThread', id, inputValue);           
            });
        });
    }
    
    //umožní mazat thread
    $.fn._makeThreadDeletable = function() {
        var id = this.data('id');
        this.cached.deleteThread.click(function(e) {
            swal({
                type:'warning',
                title:'Smazat thread?',
                text:'Thread nemůže být obnoven.',
                showCancelButton:true,
                confirmButtonText:'Smazat',
                cancelButtonText:'Storno',
                closeOnConfirm:false,
                showLoaderOnConfirm:true,
                allowOutsideClick:true
            }, function(isConfirm) {
                if (isConfirm) {
                    socket.emit('deleteThread', id);
                }         
            });
        });
    }
})(jQuery);
