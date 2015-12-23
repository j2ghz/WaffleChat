/* global io from another file, provided by index.jade */
var socket = io();

//on connection
$('button#createThread').click(function() {
	socket.emit('createThread', prompt('Select thread'));
});

socket.on('printThreads', function(threads) {
	$('#threads').text('');
	threads.forEach(function(thread) {
		$('#threads').append('<li><a href="' + thread.id + '">' + thread.name + '</a></li>');	
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
    content += '<h2>' + name + '</h2><div class="messagesContainer">'
    content += '<ul class="messages"></ul>';
    content += '<form class="messageForm" onSubmit="submitMessage(' + id + ');return false;">';
    content += '<input autocomplete="off">';
    content += '<button>Send</button>';
    content += '</form></div>';
    div.html(content); //put content inside empty div
    return div;
}

socket.on('createThreadElement', function(id, name) { //upon joining a thread, first create a new Thread div
    $('#chatContainer').append(Thread(id, name)); 
    ulResize();
});

socket.on('printMessages', function(messages, thread) { //print list of messages in given thread
    var ul = $('#thread' + thread + ' .messages');
    ul.text('');
	messages.forEach(function(message) {
		ul.append('<li>' + message.content + '</li>');	
	});
    scrollToLastMessage(thread);
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
	$('#thread' + thread + ' .messages').append($('<li>').text(content));
    scrollToLastMessage(thread);
});

//styling
var resizeTimer, heightOfRest = 60, padding = 5;

function ulResize() {
    var h = $(".threadContainer").first().height();
    $("#chatContainer ul.messages").height(h - heightOfRest - padding);  
}

$(window).resize(function() { 
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(ulResize, 250); //resize throttling
});

function scrollToLastMessage(thread) {
    var $thread = $('#thread' + thread + ' ul');
    $thread.animate({
        scrollTop: $thread.height()
    });
}