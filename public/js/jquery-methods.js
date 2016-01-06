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
    //make thread closable
    $.fn._makeClosable = function() {
        var id = this.data('id');
        $('i.close', this).click(function() { //close icon functionality
            socket.emit('leaveThread', id);
            myThreads.splice(myThreads.indexOf(id), 1);
            $thread[id].remove();
        });
        return this;
    }
    
    //collapse given thread
    $.fn._collapse = function() {
        var id = this.data('id');
        this.toggleClass('collapsed'); //different display of header
        
        if (this.hasClass('collapsed') === true) {
            this.css('top', $messagesContainer[id].height());    
        } else {
            this.css('top', 0);  
        }
        
        if (this.hasClass('collapsed') === false && $('.notification', this).hasClass('fa-comment') === true) { //if notification is up and you uncollapse it
            scrollToLastMessage(id, true); //scroll down and remove notification
            this._hideNotification(id);
        }  
        return this;
    }
    
    $.fn._makeCollapsible = function() {
        var id = this.data('id');
        $('h3', this).click(function() {   //when you click tab, toggle collapsing
            $thread[id]._collapse(id);
        });
        return this;
    }
    
    $.fn._makeSubmittable = function() {
        $('textarea', this).keydown(function(e) {
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
        var $h3 = $('h3', this),
            $notification = $('i.notification', this);
        $notification.addClass('fa-comment-o');
        $h3.removeClass('notifying');
        $notification.removeClass('fa-comment');
    }

     $.fn._showNotification = function() {
        var $h3 = $('h3', this),
            $notification = $('i.notification', this);
        $notification.addClass('fa-comment');
        $h3.addClass('notifying');
        $notification.removeClass('fa-comment-o');
    }
    
    //notify of new message
    $.fn._notifyOfNewMessage = function() {     
        var $messages = $('.messages', this);
         
        this._showNotification(); 
        
        //removing notifications 
        if (this.hasClass('collapsed') === false) { //if not collapsed
        var _this = this;
            if (($messages._isAtBottom() === true) || ($messages._hasScrollBar().vertical === false)) {
                // notification will appear briefly if at bottom or thread not big enough to have a scrollbar
                var notificationTimer;
                clearTimeout(notificationTimer);
                notificationTimer = setTimeout(function() { //after 1 second hide
                    _this._hideNotification();
                }, 1000);   
            } else {
                //else remove notification when you scroll down 
                var scrollTimer;
                $messages.scroll(function() { 
                    clearTimeout(scrollTimer);
                    scrollTimer = setTimeout(function() { //throttling
                        if ($messages._isAtBottom()) {
                            _this._hideNotification();
                            $messages.off('scroll'); //remove event listener once notification is removed
                        }
                    }, 250);
                });
            }
        }
    }
})(jQuery);
