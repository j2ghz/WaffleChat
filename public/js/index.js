/* global io from another file, provided by index.jade */
var socket = io();
var m = $('#messageInput');

$("button#joinThread").click(function(){
	socket.emit('joinThread', prompt("Select thread"));
});
$('#messageForm').submit(function(){
	if(m.val()!==""){
		socket.emit('chatMessage', m.val());
		m.val('');
	}
	return false;
});
socket.on('chatMessage', function(msg){
	$('#messages').append($('<li>').text(msg));
});
socket.on('printThreads',function(data){
	$("#threads").text("");
	data.forEach(function(entry){
		$("#threads").append("<a href='#' class='joinThread' data-id='"+entry.id+"'>"+entry.name+"</a><br>");	
	});
	$("a.joinThread").click(function(){
	socket.emit('joinThread',$(this).data('id'));
});
});