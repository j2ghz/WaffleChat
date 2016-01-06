(function($) { 
    // --- MISC ---
    //determine whether scrolling is possible or not
    $.fn._hasScrollBar = function() {
        var e = this.get(0);
        return {
            vertical: e.scrollHeight > e.clientHeight,
            horizontal: e.scrollWidth > e.clientWidth
        };
    }
    
    // --- THREAD WINDOW ---
    $.fn._cache = function() {
        this.cached = {
            textarea:$('textarea', this),
            close:$('i.close', this),
            messagesContainer:$('.messagesContainer', this),
            h3:$('h3', this),
            notification:$('i.notification', this),
            messages:$('.messages', this)
        }
        return this;
    }
    
    //make thread closable
    $.fn._makeClosable = function() {
        var id = this.data('id'), _this = this;
        this.cached.close.click(function() { //close icon functionality
            socket.emit('leaveThread', id);
            myThreads.splice(myThreads.indexOf(id), 1);
            _this.remove();
        });
        return this;
    }
    
    //collapse given thread
    $.fn._collapse = function() {
        var id = this.data('id');
        this.toggleClass('collapsed'); //different display of header
        
        if (this.hasClass('collapsed') === true) {
            this.css('top', this.cached.messagesContainer.height());    
        } else {
            this.css('top', 0);  
        }
        
        if (this.hasClass('collapsed') === false && this.cached.notification.hasClass('fa-comment') === true) { //if notification is up and you uncollapse it
            scrollToLastMessage(id, true); //scroll down and remove notification
            this._hideNotification(id);
        }  
        return this;
    }
    
    $.fn._makeCollapsible = function() {
        var id = this.data('id'), _this = this;
        this.cached.h3.click(function() {   //when you click tab, toggle collapsing
            _this._collapse(id);
        });
        return this;
    }
    
    $.fn._makeSubmittable = function() {
        this.cached.textarea.keydown(function(e) {
            if (e.keyCode == 13) {
                e.preventDefault();
                if (e.shiftKey === false) {
                    $(this.form).submit()
                    return false;   
                } else {
                    var s = $(this).val();
                    $(this).val(s + "\n");
                }       
            }
        });
        return this;
    }
    
    $.fn._isAtBottom = function() {
        if (Math.floor(this.scrollTop() + this.height()) === this[0].scrollHeight) { //if is scrolled to the bottom, continue showing new messages
            return true;
        } else {
            return false;
        }
    }
    
    $.fn._hideNotification = function() {
        this.cached.notification.addClass('fa-comment-o');
        this.cached.h3.removeClass('notifying');
        this.cached.notification.removeClass('fa-comment');
    }

     $.fn._showNotification = function() {
        this.cached.notification.addClass('fa-comment');
        this.cached.h3.addClass('notifying');
        this.cached.notification.removeClass('fa-comment-o');
    }
    
    //notify of new message
    $.fn._notifyOfNewMessage = function() {      
        var _this = this;        
        this._showNotification();
        
        //removing notifications 
        if (this.hasClass('collapsed') === false) { //if not collapsed
            if ((this.cached.messages._isAtBottom() === true) || (this.cached.messages._hasScrollBar().vertical === false)) {
                // notification will appear briefly if at bottom or thread not big enough to have a scrollbar
                var notificationTimer;
                clearTimeout(notificationTimer);
                notificationTimer = setTimeout(function() { //after 1 second hide
                    _this._hideNotification();
                }, 1000);   
            } else {
                //else remove notification when you scroll down 
                var scrollTimer;
                this.cached.messages.scroll(function() { 
                    clearTimeout(scrollTimer);
                    scrollTimer = setTimeout(function() { //throttling
                        if (_this.cached.messages._isAtBottom()) {
                            _this._hideNotification();
                            _this.cached.messages.off('scroll'); //remove event listener once notification is removed
                        }
                    }, 250);
                });
            }
        }
    }
})(jQuery);
