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
    console.log("vote_handle_message=> ", choice, current);
    target.text(current);
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
        //XXX Warn User of lost connection. Disallow editing?
        console.log('Lost Connection, Code: ' + c);
    };
    client.onerror = function(error) { console.log("======= onerror =========: " + error); };
    client.onerrorframe = function(frame) { console.log("======= onerrorframe =========:  " + frame.body); };

    client.onconnectedframe = function() { 
        client.subscribe(CHANNEL_NAME); 
    };

    client.onmessageframe = function(frame) { //check frame.headers.destination?
        console.log("---onmessageframe ---", frame);
        var msg = JSON.parse(frame.body);
        switch(msg.type) {
            case "chat":
                chat_handle_message(msg);
                break;
            case "vote":
                vote_handle_message(msg);
                break;
            default:
                console.log("Unhandled msg.type=> ", msg.type);
                break;
        }
    };
    var cookie = $.cookie(SESSION_COOKIE_NAME);
    client.connect(HOST, STOMP_PORT, USERNAME, cookie);
    $(".vote").click(vote_send_message);
});

