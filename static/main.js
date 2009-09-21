function show_time(data){
 // data = JSON.parse(data);
  console.log(data);
  $("#time").empty().text(data.time);
};
function quit_handlers(client) {
    window.onbeforeunload = function() {
    /*The below need to occur at 'onbeforeunload', 
    NOT at window unload.*/ 
    //XXX ask User if they want to leave here?
        client.unsubscribe(CHANNEL_NAME);
        client.disconnect();
    };
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
       show_time(frame.body);
    };
    var cookie = $.cookie(SESSION_COOKIE_NAME);
    client.connect(HOST, STOMP_PORT, USERNAME, cookie);
});

