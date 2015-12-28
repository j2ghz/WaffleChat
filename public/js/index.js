/* global io from another file, provided by index.jade */
var socket = io(),
    $chatContainer = $('#chatContainer'), $threads = $('#threads'), $footer = $('footer'), $thread = [], 
    $messagesContainer = [], $messages = [], $h2 = [], $notification = [], $input = [], $close = [], //caching jquery objects
    myUsername = $('#mainContainer h2').text(), resizeTimer, inputHeight = 27, h2Height = 37;

//Create Thread button functionality
$('button#createThread').click(function() {
	socket.emit('createThread', prompt('Select thread'));
});

//print list of threads and allow user to join them
socket.on('printThreads', function(threads) {
	$threads.text('');
	threads.forEach(function(thread) {
		$threads.append('<a href="' + thread.id + '"><li>' + thread.name + '</li></a>');	
	});
	$('a', $threads).click(function(e) { //when you click on thread, join it
        e.preventDefault();
        var id = $(this).attr('href')
        if ($thread[id] === undefined) { //if not already joined, join
            socket.emit('joinThread', id); 
        } else {
             if ($thread[id].hasClass('collapsed') === true) { //else uncollapse already joined thread
                 collapse(id);
             }
        }
	});
});

//upon joining a thread, first create a new Thread div
socket.on('createThreadElement', function(id, name) {
    $chatContainer.append(Thread(id, name)); 
    cacheObjects(id); //put objects in $variables
    resizeMessages(); //resize elements by window height
    makeCollapsible(id); //collapsing behaviour
    $close[id].click(function() { //close icon functionality
        socket.emit('leaveThread', id);
        $thread[id].remove();
        removeObjects(id);
    });
});

//after joining and creation of element, print all messages
socket.on('printMessages', function(messages, id) {
    $messages[id].text('');
	messages.forEach(function(message) {
		$messages[id].append('<li>' + message.sender + ': ' + message.content + '</li>');	
	});
});

//on receiving a message
socket.on('message', function(content, thread, sender) {
    var wasAtBottom = isAtBottom($messages[thread]); //needs to be determined before appending the new message
    if (myUsername !== sender) { //if someone else sends it, notify
        notifyOfNewMessage(thread);   
    }   
	$messages[thread].append($('<li>').text(sender + ': ' + content));
    if (wasAtBottom === true) { //if you were scrolled to the bottom, scroll back to the bottom again
        scrollToLastMessage(thread, true);    
    }   
});

//styling and display behaviour of app
//caching objects into $variable[threadid] reference
function cacheObjects(thread) {
    $thread[thread] = $('#thread' + thread);
    $messagesContainer[thread] = $('.messagesContainer', $thread[thread]);
    $messages[thread] = $('.messages', $thread[thread]);
    $h2[thread] = $('h2', $thread[thread]);
    $notification[thread] = $('i.notification', $h2[thread]);
    $input[thread] = $('input', $thread[thread]);
    $close[thread] = $('i.close', $h2[thread]);
}

//removing object references and removing thread element on leaving
function removeObjects(thread) {
    $thread[thread].remove();
    $thread[thread] = undefined;
    $messagesContainer[thread] = undefined;
    $messages[thread] = undefined;
    $h2[thread] = undefined;
    $notification[thread] = undefined;
    $input[thread] = undefined;
    $close[thread] = undefined;
}

function Thread(id, name) { //creating new element for joining
    var div = $('<div/>', { //create empty div
        class: 'threadContainer',
        id: 'thread' + id
    });
    var content = ''; //insert empty list of messages and form into it
    content += '<h2><i class="fa fa-comment-o notification"></i> ' + name + '<i class="fa fa-times close"></i></h2>';
    content += '<div class="messagesContainer">';
    content += '<ul class="messages"></ul>';
    content += '<form class="messageForm" onSubmit="submitMessage(' + id + ');return false;">';
    content += '<input autocomplete="off">';
    content += '</form></div>';
    div.html(content); //put content inside empty div
    return div;
}

//sending a message
function submitMessage(id) { //on form submit
    if ($input[id].val() !== '') { //if not empty
        socket.emit('message', $input[id].val(), id); //send value and thread id to server
        $input[id].val(''); //set input value back to nothing
    }
}

//gets called whenever window is resized and upon creation of new thread window
function resizeMessages() { 
    var chatHeight = $chatContainer.height();
    $('.messages').height(chatHeight - h2Height - inputHeight); //set height of all ul.messages dynamically by container height (which is by 50% of window)
    $('.collapsed h2').css('top', chatHeight - h2Height + 2); //move collapsed tab when resizing
}

//resize ul.messages on window resize
$(window).resize(function() { 
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resizeMessages, 250); //resize throttling
});

//scroll to last message in given thread, animation boolean
function scrollToLastMessage(id, animation) { 
    var duration = 0;
    if (animation === true) {
        duration = 400;
    }
    $messages[id].animate({
        scrollTop: $messages[id][0].scrollHeight, //scroll to bottom
    }, duration);
}

//make thread collapsible
function makeCollapsible(id) { 
    $h2[id].click(function() {   //when you click tab, toggle collapsing
        collapse(id);
    });
}

//collapse given thread
function collapse(id){
    $h2[id].css('top', $messagesContainer[id].height());   //move whole thread (if collapsed, height is 0, therefore it will move up and vice versa)
    $thread[id].toggleClass('collapsed');  //hide messages and form
    
    if ($thread[id].hasClass('collapsed') === false && $notification[id].hasClass('fa-comment') === true) { //if notification is up and you uncollapse it
        scrollToLastMessage(id, true); //scroll down and remove notification
        hideNotification(id);
    }  
}

//notify of new message
function notifyOfNewMessage(id) {
    showNotification(id); 
    //removing notifications 
    if ($thread[id].hasClass('collapsed') === false) { //if not collapsed
        if ((isAtBottom($messages[id]) === true) || ($messages[id].hasScrollBar().vertical === false)) {
            // notification will appear briefly if at bottom or thread not big enough to have a scrollbar
            var timer;
            clearTimeout(timer);
            timer = setTimeout(function() { //after 1 second hide
                hideNotification(id);
            }, 1000);   
        } else {
            //else remove notification when you scroll down 
            var scrollTimer;
            $messages[id].scroll(function() { 
                clearTimeout(scrollTimer);
                scrollTimer = setTimeout(function() { //throttling
                    if (isAtBottom($messages[id])) {
                        hideNotification(id);
                        $messages[id].off('scroll'); //remove event listener once notification is removed
                    }
                }, 250);
            });
        }
    }
}

//checks if is scrolled to bottom in given thread
function isAtBottom(messages) {
    if (Math.floor(messages.scrollTop() + messages.height()) === messages[0].scrollHeight) { //if is scrolled to the bottom, continue showing new messages
        return true;
    } else {
        return false;
    }
}

//hides or shows notification in given thread
function hideNotification(id) {
    $notification[id].addClass('fa-comment-o');
    $notification[id].removeClass('fa-comment');
}

function showNotification(id) {
    $notification[id].addClass('fa-comment');
    $notification[id].removeClass('fa-comment-o');
}

//helpful method to determine whether scrolling is possible or not
(function($) { 
    $.fn.hasScrollBar = function() {
        var e = this.get(0);
        return {
            vertical: e.scrollHeight > e.clientHeight,
            horizontal: e.scrollWidth > e.clientWidth
        };
    }
})(jQuery);
