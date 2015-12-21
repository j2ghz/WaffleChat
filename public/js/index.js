/* global io from another file, provided by index.jade */
var socket = io();
var m = $('#messageInput');

$("button#createThread").click(function(){
	socket.emit('createThread', prompt("Select thread"));
});

$('#messageForm').submit(function(){
	if(m.val()!==""){
		socket.emit('message', m.val());
		m.val('');
	}
	return false;
});

socket.on('message', function(msg){
	$('#messages').append($('<li>').text(msg));
});

socket.on('printMessages',function(data){
	$("#messages").text("");
	data.forEach(function(entry){
		$("#messages").append("<li>"+entry.content+"</li>");	
	});
});

socket.on('printThreads',function(data){
	$("#threads").text("");
	data.forEach(function(entry){
		$("#threads").append("<li><a href='"+entry.id+"'>"+entry.name+"</a></li>");	
	});
	$("#threads a").click(function(e){
        e.preventDefault();
		socket.emit('joinThread',$(this).attr('href'));
	});
});

socket.on('threadJoined',function(data){
    $("span#currentThread").text(data);
});