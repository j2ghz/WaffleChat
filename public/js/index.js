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
    content += '<h2>' + name + '</h2>'
    content += '<ul class="messages"></ul>';
    content += '<form class="messageForm" onSubmit="submitMessage(' + id + ');return false;">';
    content += '<input autocomplete="off">';
    content += '<button>Send</button>';
    content += '</form>';
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
});

//styling
var resizeTimer
function ulResize() {
    var h = $(".threadContainer").first().height();
    console.log(h);
    $("#chatContainer ul.messages").height(h - 100);  
}
$(window).resize(function() { 
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(ulResize, 250); //resize throttling
});