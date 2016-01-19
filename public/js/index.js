/* global swal */
/* global io */
var socket = io(), myUsername, $chatContainer, $threads, $threadLi, $thread;
  
//po načtení dokumentu se vytvoří proměnné ke cachování jQuery objektů (elementů na stránce, tedy oken, položek v menu atd. pro rychlejší načítání v průběhu)
$(document).ready(function() { 
    $chatContainer = $('#chatContainer');
    $threads = $('#threads');
    $threadLi = [];
    $thread = [];
       
    //kliknutí na tlačítko vytvořit thread   
    $('#createThread').click(function() { 
        swal({
            title:'Napiš jméno threadu',
            text:'Můžeš napsat maximálně 255 znaků.',
            type:'input',
            showCancelButton:true,
            closeOnConfirm:false,
            cancelButtonText:'Storno',
            confirmButtonText:'Vytvořit',
            allowOutsideClick:true,
            showLoaderOnConfirm:true
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
            socket.emit('createThread', inputValue); 
        });	
    });  
    
    //kliknutí na tlačítko schovat všechny thready
    $('#collapseAllThreads').click(function() {
        $thread.forEach(function(obj) {
            if (obj) {
                if(obj.hasClass('collapsed') === false) {
                    obj._collapse();
                }  
            }
        });
    });
    
    //kliknutí na tlačítko ukázat všechny thready
    $('#uncollapseAllThreads').click(function() {
        $thread.forEach(function(obj) {
            if (obj) {
                if (obj.hasClass('collapsed') === true) {
                    obj._collapse();
                }
            }
        });
    });
    
    //zavřít všechny thready
    $('#closeAllThreads').click(function() {
        $thread.forEach(function(obj) {
            if (obj) { 
                obj._close();
            }            
        });
    });
});

//po připojení k serveru se uživateli odešle jeho jméno podle passport sessionu
socket.on('setUsername', function(name) {
    myUsername = name;
});

//poté se uživateli odešle seznam všech threadů, což je pole objektů
socket.on('printThreads', function(threads) {
	$threads.text('');
	threads.forEach(function(thread) {
		$threads.prepend(
            ThreadListItem(thread.id, thread.name, thread.creator, thread.lastActivity, thread.lastSender)
        );	
	});    
});

//po vytvoření threadu některým uživatelem se přidá do seznamu další
socket.on('printThread', function(id, name, creator) {
    $threads.prepend(
        ThreadListItem(id, name, creator, null, null)
    );
});

//po připojení do threadu se uživateli zobrazí všechny zprávy
socket.on('joinThread', function(messages, id, name) {    
    var threadWindow = ThreadWindow(id, name);    
    $chatContainer.append(threadWindow);      
    $thread[id].cached.messages.text('');
	messages.forEach(function(message) {
        $thread[id].cached.messages.append(Message(message.id, message.thread, message.date, message.sender, message.content));	
	});   
    $thread[id]._scrollToLastMessage(false); //scroll dolů bez animace
    $thread[id].cached.textarea.focus(); //automatický focus na textové pole
});

//po obdržení zprávy
socket.on('message', function(id, thread, date, sender, content) {   
    var wasAtBottom = $thread[thread].cached.messages._isAtBottom(), //před obdržením zprávy se zjizdí, zda byl uživatel úplně dole
        temp = $thread[thread].temp; //dočasná zpráva
    
    if (myUsername !== sender) { //pokud zprávu odeslal někdo jiný, ukáže se notifikace
        $thread[thread]._notifyOfNewMessage();   
    }  
    
    if (temp[sender]) { //pokud existuje dočasná zpráva od příslušného uživatele
        temp[sender].remove();
        temp[sender] = undefined;   
    }

	$thread[thread].cached.messages.append( //připojí se zpráva na konec threadu
        Message(id, thread, date, sender, content)
    );   
    if (wasAtBottom === true) { //pokud jsme byli úplně dole, tak se opět scrollne dolů
        $thread[thread]._scrollToLastMessage(true);
    }   
});

//při obdržení dočasné zprávy (tedy každé úpravě textového pole některého z uživatelů)
socket.on('tempMessage', function(thread, sender, content) {
    var temp = $thread[thread].temp;

    if ((content === '') || !content) { //pokud je textové pole odesílatele prázdné
        if (temp[sender]) { //tak se dočasná zpráva smaže pokud existuje
            temp[sender].remove();
            temp[sender] = undefined;    
        }       
    } else {  //pokud jsme obdrželi nějaký obsah
        var wasAtBottom = $thread[thread].cached.messages._isAtBottom(),
            message = Message(null, thread, null, sender, content); //vytvoří se nová zpráva bez ID a data
        
        if (!temp[sender]) { //pokud žádná dočasná zpráva ještě neexistuje      
            temp[sender] = message.appendTo($thread[thread].cached.messages); //připojí se na konec
        } else {
            temp[sender].html(message.html()); //jinak nahradí původní zprávu
        }
        
        if (wasAtBottom === true) { //scroll dolů pokud jsme byli dole
            $thread[thread]._scrollToLastMessage(true);
        }  
    }
});

//při obdržení zprávy se navíc úplně všem upraví seznam threadů
socket.on('notifyInThreadList', function(thread, date, sender) { 
    date = new Date(date); 
    var $lastActivity = $threadLi[thread].cached.lastActivity,
        $numberOfMessages = $threadLi[thread].cached.numberOfMessages;
    
    if ($lastActivity.eq(0).text() === '') {
        $threadLi[thread].cached.deleteThread.remove();
    }
    $lastActivity.eq(0).text(showDate(date) + ' ' + showTime(date)); //zobrazí se nové datum poslední zprávy
    $lastActivity.eq(1).html(sender); //odesílatel
    $numberOfMessages.text(Number($numberOfMessages.text()) + 1); //inkrementace počtu nových zpráv
});

//při úpravě threadu se změní jméno jak v seznamu, tak pokud jsme do threadu připojení
socket.on('editThread', function(id, name) {
    $('.threadName', $threadLi[id]).html(name);
    if ($thread[id]) {
        $('.threadHeaderName', $thread[id].cached.h3).html(name);
    }
});

//při smazání threadu
socket.on('deleteThread', function(id) {
    $threadLi[id].remove();
    if ($thread[id]) {
        $thread[id]._close();
    }
});

//při smazání zprávy
socket.on('deleteMessage', function(id, thread) {
    var message = $thread[thread].message[id].cached;
    if (message) {
        message.content.addClass('deleted'); //textu se přidá classa deleted (šedá kurzíva)
        message.content.text('smazáno'); //obsah zprávy se nastaví na smazáno
        message.deleteMessage.remove();  
        message.editMessage.remove(); 
    }
});

//při úpravě zprávy
socket.on('editMessage', function(id, thread, content) {
    var wasAtBottom = $thread[thread].cached.messages._isAtBottom(), message = $thread[thread].message[id].cached;
    if (message) {
        message.content.removeClass('deleted');
        message.content.html(content);   
        if (wasAtBottom === true) {
            $thread[thread]._scrollToLastMessage(true);    
        }        
    }  
});

//při zobrazení chybné hlášky se ukáže sweetalert
socket.on('showError', function(header, message) {
    setTimeout(function() {
        swal({
            type:'error',
            title: header,
            text: message,
            allowOutsideClick:true
        });
    }, 250);
});

//při zobrazení úspěšné akce
socket.on('showSuccess', function(header, message) {
    setTimeout(function() {
        swal({
            type:'success',
            title: header,
            text: message,
            allowOutsideClick:true
        });
    }, 250);
});

//vytvoří nový element do seznamu threadů
function ThreadListItem(id, name, creator, lastActivity, lastSender) {
    lastActivity = new Date(lastActivity);
    var li = $('<li/>').attr('data-id', id), //vytvoří se nový, prázdný jquery objekt - element li
        html = ''; //prázný obsah, který budeme naplňovat
    html += '<div class="threadName">' + name + '</div><div class="threadFlex">';
    html += '<span class="threadCreator">Vytvořil: <span class="value">' + creator + '</span></span>';
    html += '<span class="threadLastActivity">Poslední zpráva: <span class="value">';
    if (lastSender === null) { //pokud není zatím žádná zpráva v threadu
        html += '</span> - <span class="value">';   
    } else {
        html += showDate(lastActivity) + ' ' + showTime(lastActivity) + '</span> - <span class="value">' + lastSender; 
    }
    html += '</span></span>';
    html += '<span class="threadNewMessages">Nové zprávy od načtení: <span class="value">0</span></span></div>';
    if (creator === myUsername) {
        html += '<i class="fa fa-pencil editThread"></i>';
        if (lastSender === null) {
            html += '<i class="fa fa-trash deleteThread"></i>'; 
        }
    }
    li.html(html); //obsah html, který jsme právě vygenerovali, se vloží do li
    $threadLi[id] = li; //cache tohoto elementu
    li._cacheThreadLi(); 
    li._makeJoinable(); //možnost připojení se do threadu
    if (creator === myUsername) {
        li._makeThreadEditable(); //možnost úpravy a smazání threadu
        li._makeThreadDeletable();
    }
    return li;
}

//vytvoří nové okno threadu po připojení do threadu
function ThreadWindow(id, name) {
    var div = $('<div/>', { //vytvoří se prázdný div
            class: 'threadContainer',
        }).attr('data-id', id),
        html = '';
    html += '<h3 title="' + name + '"><i class="fa fa-comment-o notification"></i><span class="threadHeaderName">' + name + '</span><i class="fa fa-times close"></i></h3>';
    html += '<ul class="messages"></ul>';
    html += '<form class="messageForm" data-id="' + id + '">';
    html += '<textarea autocomplete="off" placeholder="Sem napiš svou zprávu."></textarea>';
    html += '</form>';
    div.html(html);  
    $thread[id] = div;
    $thread[id].temp = [];
    $thread[id].message = [];
    $thread[id].lastDate = null;
    div._cacheThread();  
    div._makeCollapsible(); //schovávání a zobrazování (minimalizace)
    div._makeClosable(); //zavírání
    div._makeSubmittable(); //aby šlo posílat zprávy
    return div;
}

//vytvoří nový element pro zprávu
function Message(id, thread, date, sender, content) {
    date = new Date(date);
    var li = $('<li/>').attr('data-id', id),
        d = showDate(date),
        html = '';
        
    if (($thread[thread].lastDate !== d) && (id !== null)) { //shows date if it's different to the message before and is not a temp message
        $thread[thread].lastDate = d;
        html += '<div class="messageDate">' + d + '</div>';   
    }

    html += (id === null ? '<div class="messageFlex temp">' : '<div class="messageFlex">');  //pokud je id null, jedná se o dočasnou zprávu
    html += '<span class="messageContainer"><span class="messageSender">' + sender + '</span>';
    html += (content === null ? '<span class="deleted messageContent">smazáno' : '<span class="messageContent">' + content); //pokud je obsah null, jedná se o smazanou zprávu
    html += '</span></span><span class="messageTime">';
    if (id === null) { //pokud je id null, jedná se o dočasnou zprávu
        html += 'píše...';
    } else {
        if ((sender === myUsername) && content)  { //ukázat ikony mazání a úpravy jen uživateli, který zprávu odeslal a pokud není smazána
            html += '<i class="fa fa-trash-o deleteMessage"></i>';
            html += '<i class="fa fa-pencil editMessage"></i>';
        }
        html += showTime(date)
    }
    html += '</span></div>';
    li.html(html);
    $thread[thread].message[id] = li; //cache
    li._cacheMessage();
    li._makeMessageDeletable(); //aby šla zpráva mazat a upravovat
    li._makeMessageEditable();
    li.linkify(); //knihovna linkifyjs vytvoří odkazy ze všech url
    return li;        
}

//vytvoří text v českém formátu z data
function showDate(date) {
    return date.getDate() + '.' + (date.getMonth() + 1) + '.' + date.getFullYear() + ' ';
}

function showTime(date) {
    var html = '';
    html += (date.getHours() < 10 ? '0' + date.getHours() : date.getHours()); //returns 03:04 instead of 3:4
    html += ':';
    html += (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes());
    return html;
}
