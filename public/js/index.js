/* global io from another file, provided by index.jade */
var socket = io();

//on connection
$('button#createThread').click(function() {
	socket.emit('createThread', prompt('Select thread'));
});

socket.on('printThreads', function(threads) {
	$('#threads').text('');
	threads.forEach(function(thread) {
		$('#threads').append('<a href="' + thread.id + '"><li>' + thread.name + '</li></a>');	
	});
	$('#threads a').click(function(e) {
        e.preventDefault();
		socket.emit('joinThread', $(this).attr('href'), $(this).text());
	});
});

//on joinThread
function Thread(id, name) { //creating new element for joining
    var div = $('<div/>', { //create empty div
        class: 'threadContainer',
        id: 'thread' + id
    });
    var content = ''; //insert empty list of messages and form into it
    content += '<h2>' + name + '</h2>';
    content += '<div class="messagesContainer">';
    content += '<ul class="messages"></ul>';
    content += '<form class="messageForm" onSubmit="submitMessage(' + id + ');return false;">';
    content += '<input autocomplete="off">';
    content += '</form></div>';
    div.html(content); //put content inside empty div
    return div;
}

socket.on('createThreadElement', function(id, name) { //upon joining a thread, first create a new Thread div
    $('#chatContainer').append(Thread(id, name)); 
    resizeElements();
    makeCollapsible(id);
});

socket.on('printMessages', function(messages, thread) { //print list of messages in given thread
    var ul = $('#thread' + thread + ' .messages');
    ul.text('');
	messages.forEach(function(message) {
		ul.append('<li>' + message.content + '</li>');	
	});
});

//sending and receiving a message
function submitMessage(thread) { //on form submit
    var input = $('#thread' + thread + ' input'); //find proper input
    if (input.val() !== '') {
        socket.emit('message', input.val(), thread);
        input.val('');
    }
}

socket.on('message', function(content, thread) {
    var $messages = $('#thread' + thread + ' .messages')
    var isAtBottom = false;
    if (($messages.scrollTop() + $messages.height()) === $messages[0].scrollHeight) { //if is scrolled to the bottom, continue showing new messages
        isAtBottom = true;
    }
	$messages.append($('<li>').text(content));
    if (isAtBottom === true) {
        scrollToLastMessage(thread, true);    
    }   
});

//styling
var resizeTimer, $chatContainer = $('#chatContainer'), $footer = $('footer');
function resizeElements() { //get called whenever window is resized
    var h = $chatContainer.height();
    $('.messages').height(h); //set height of messages ul dynamically by container height (which is by 50% of window)
    $('.collapsed h2').css('top', h + $footer.height()); //move collapsed tab when resizing
}

$(window).resize(function() { 
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resizeElements, 250); //resize throttling
});

function scrollToLastMessage(thread, animation) { //scroll to last message in given thread
    var ul = $('#thread' + thread + ' ul'); //find appropriate thread
    var duration = 0;
    if (animation === true) {
        duration = 400;
    }
    ul.animate({
        scrollTop: ul[0].scrollHeight, //scroll to bottom
    }, duration);
}

function makeCollapsible(thread) { //make thread collapsible
    var $thread = $('#thread' + thread);
    var $container = $('.messagesContainer', $thread);
    $('h2', $thread).click(function() {   //when you click tab
        $(this).css('top', $container.height() - 5);   //move whole thread down
        $thread.toggleClass('collapsed');  //hide messages and stuff
    });
}