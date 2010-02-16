/*
 Copyright (C) 2009, 2010 Alex Clemesha <alex@clemesha.org>
 
 This module is part of Hotdot, and is distributed under the terms 
 of the BSD License: http://www.opensource.org/licenses/bsd-license.php
*/
function vote_send_message(){
    var choice = $(this).attr("id");
    var fullmsg = {"type":"vote", "choice":choice};
    fullmsg = JSON.stringify(fullmsg); 
    client.send(fullmsg, CHANNEL_NAME);
}

function vote_handle_message(msg){
    var choice = msg.choice;
    var target = $("#votes_"+choice);
    var current = Number(target.text())+1;
    //console.log("vote_handle_message=> ", choice, current);
    target.text(current);
}

function edit_send_message(evt){
    var evtype = evt.type;
    var choice = $(this).parent().attr("id").split("_")[1];
    var content = $(this).val();
    switch(evtype) {
        case "focus":
            break;
        case "keyup":
            break;
        default:
            break;
    }
    var fullmsg = {"type":"edit", "event":evtype, "choice":choice, "content":content};
    fullmsg = JSON.stringify(fullmsg); 
    client.send(fullmsg, CHANNEL_NAME);
}

function edit_handle_message(msg){
    if (msg.from == USERNAME) return;
    var choice = msg.choice;
    var target = $("#pitch_"+choice+ " textarea");
    switch(msg.event) {
        case "focus":
            break;
            target.append($("<p>").attr("id", "active").text(msg.from+ " is typing..."));
        case "keyup":
            $("<p>").attr("id", "active").remove();
            target.val(msg.content);
            break;
        default:
            break;
    }
}


function handle_incoming_message(msg){
    switch(msg.type) {
        case "vote":
            vote_handle_message(msg);
            break;
        case "edit":
            edit_handle_message(msg);
            break;
        case "chat":
            chat_handle_message(msg); //defined in 'chat.js' TODO: namespace better
            break;
        default:
            //console.log("Unhandled msg.type=> ", msg.type);
            break;
    }
}


function quit_handlers(client) {
    window.onbeforeunload = function() {
    /*The below need to occur at 'onbeforeunload', NOT at window unload.*/ 
        client.disconnect(); //XXX ask User if they want to leave here?
        //Time-filler function to let client correctly disconnect:
        $("#logout").animate({opacity:1.0}, 1000);
    };
    $(window).unload(function() {
        //client.disconnect();
        //$("#logout").animate({opacity:1.0}, 1000);
    });
}

$(document).ready(function(){
    client = new STOMPClient();
    client.onopen = function() { 
        quit_handlers(client);
    };
    client.onclose = function(c) { 
        //TODO: Warn User of lost connection + Disallow editing.
        //console.log('Lost Connection, Code: ' + c);
    };
    client.onerror = function(error) { 
        //console.log("======= onerror =========: " + error); 
    };
    client.onerrorframe = function(frame) { 
        //console.log("======= onerrorframe =========:  " + frame.body); 
    };

    client.onconnectedframe = function() { 
        client.subscribe(CHANNEL_NAME); 
    };

    client.onmessageframe = function(frame) { //check frame.headers.destination?
        //console.log("---onmessageframe ---", frame);
        var msg = JSON.parse(frame.body);
        handle_incoming_message(msg);
    };
    var cookie = $.cookie(SESSION_COOKIE_NAME);
    client.connect(HOST, STOMP_PORT, USERNAME, cookie);
    // Attach all event handlers:
    $(".vote").click(vote_send_message);
    $(".pitch textarea").focus(edit_send_message);
    $(".pitch textarea").keyup(edit_send_message);
});

