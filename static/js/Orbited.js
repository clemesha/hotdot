
// NOTE: to log/debug with Orbited, there are two methods:
//        Use firebug
//        1) include Orbited.js (and not Log4js)
//        2) Orbited.loggers[LOGGERNAME].enabled = true
//        And it should do logging for that logger
//        Use log4js
//        1) include log4js.js BEFORE including Orbited.js
//        2) Orbited.loggers[LOGGERNAME].setLevel(Log4js.Level.ALL)
//        3) Orbited.loggers[LOGGERNAME].addAppender(new Log4js.ConsoleAppender())
//        Note: Other levels and appenders can be set as well (see Log4js docs)
//
//     For either method to work, you must set Orbited.settings.log to true.
//
//     When you are making a call to the logger, prefix the line (first three
//     Characters) with ;;; which we will strip out at build time. So if you
//     have an if statement thats logging specific, start that line with ;;;
//     as well. If you do a try/catch thats specific to logging, prefix all
//     lines involved with ;;;. You'll want to put the try closing } and the
//     catch statement on the same line, or this won't work.
//
//     the logging functions (info, warn, debug, error, etc.) take any number
//     of arguments, like in firebug. If you're using firebug for the logging,
//     you'll actually be able to inspect the objects that you log. Therefore
//     don't do logger.debug(obj1 + " -> " + obj2); as this will convert both
//     objects to strings and not allow you to inspect them in firebug.
//     Instead call logger.debug(obj1, "->" obj2); Of course, for the Log4js
//     back-end, it will still toString the objects.

(function() {

    
    var HANDSHAKE_TIMEOUT = 30000;
    var RETRY_INTERVAL = 250;
    var RETRY_TIMEOUT = 30000;
    
    Orbited = {};
    
    Orbited.settings = {};
    Orbited.settings.hostname = document.domain;
    Orbited.settings.port = (location.port.length > 0) ? location.port : 80;
    Orbited.settings.protocol = location.protocol.slice(0, -1);
    Orbited.settings.log = false;
    Orbited.settings.streaming = true;
    Orbited.settings.HEARTBEAT_TIMEOUT = 6000;
    Orbited.settings.POLL_INTERVAL = 2000;
    Orbited.settings.pageLoggerHeight = '200px';
    Orbited.settings.pageLoggerWidth = null;
    Orbited.settings.enableFFPrivileges = false;
    Orbited.singleton = {};
    
    
    // Orbited CometSession Errors
    Orbited.Errors = {};
    Orbited.Errors.ConnectionTimeout = 101;
    Orbited.Errors.InvalidHandshake = 102;
    Orbited.Errors.UserConnectionReset = 103;
    Orbited.Errors.Unauthorized = 106;
    Orbited.Errors.RemoteConnectionFailed = 108;
    
    Orbited.Statuses = {};
    Orbited.Statuses.ServerClosedConnection = 201;
    Orbited.Statuses.SocketControlKilled = 301;
    
    Orbited.util = {};
    
    Orbited.util.browser = null;
    if (typeof(ActiveXObject) != "undefined") {
        Orbited.util.browser = 'ie';
    } else if (navigator.userAgent.indexOf('WebKit') != -1 || navigator.userAgent.indexOf('Konqueror') != -1) {
        Orbited.util.browser = 'webkit';
    } else if (navigator.product == 'Gecko' && window.find && !navigator.savePreferences) {
        Orbited.util.browser = 'firefox';
    } else if((typeof window.addEventStream) === 'function') {
        Orbited.util.browser = 'opera';
    }
    

    ////
    // NB: Base64 code was borrowed from Dojo; we had to fix decode for not
    //     striping NULs though.  Tom Trenka from Dojo wont fix this because
    //     he claims it helped to detect and avoid broken encoded data.
    //     See http://svn.dojotoolkit.org/src/dojox/trunk/encoding/base64.js
    //     See http://bugs.dojotoolkit.org/ticket/7400
    (function(){
        Orbited.base64 = {};
        
        var p = "=";
        var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        
        if (window.btoa && window.btoa('1') == 'MQ==') {
            Orbited.base64.encode = function(data) { return btoa(data); };
            Orbited.base64.decode = function(data) { return atob(data); };
            return;
        }
        
        Orbited.base64.encode=function(/* String */ba){
            //  summary
            //  Encode a string as a base64-encoded string
            var s=[];
            var l=ba.length;
            var rm=l%3;
            var x=l-rm;
            for (var i=0; i<x;){
            var t=ba.charCodeAt(i++)<<16|ba.charCodeAt(i++)<<8|ba.charCodeAt(i++);
            s.push(tab.charAt((t>>>18)&0x3f));
            s.push(tab.charAt((t>>>12)&0x3f));
            s.push(tab.charAt((t>>>6)&0x3f));
            s.push(tab.charAt(t&0x3f));
            }
            //  deal with trailers, based on patch from Peter Wood.
            switch(rm){
            case 2:
            t=ba.charCodeAt(i++)<<16|ba.charCodeAt(i++)<<8;
            s.push(tab.charAt((t>>>18)&0x3f));
            s.push(tab.charAt((t>>>12)&0x3f));
            s.push(tab.charAt((t>>>6)&0x3f));
            s.push(p);
            break;
            case 1:
            t=ba.charCodeAt(i++)<<16;
            s.push(tab.charAt((t>>>18)&0x3f));
            s.push(tab.charAt((t>>>12)&0x3f));
            s.push(p);
            s.push(p);
            break;
            }
            return s.join("");  //    string
        };
        
        
        Orbited.base64.decode=function(/* string */str){
            //  summary
            //  Convert a base64-encoded string to an array of bytes
            var s=str.split("");
            var out=[];
            var l=s.length;
            var tl=0;
            while(s[--l]==p){ ++tl; }   //    strip off trailing padding
            for (var i=0; i<l;){
            var t=tab.indexOf(s[i++])<<18;
            if(i<=l){ t|=tab.indexOf(s[i++])<<12; }
            if(i<=l){ t|=tab.indexOf(s[i++])<<6; }
            if(i<=l){ t|=tab.indexOf(s[i++]); }
            out.push(String.fromCharCode((t>>>16)&0xff));
            out.push(String.fromCharCode((t>>>8)&0xff));
            out.push(String.fromCharCode(t&0xff));
            }
            // strip off trailing padding
            while(tl--){ out.pop(); }
            return out.join(""); //     string
        };
    })();
    



    Orbited.loggers = {};
    Orbited.Loggers = {};
    Orbited.util.loggingSystem = null;
    
    if (window.Log4js) {
        Orbited.util.loggingSystem = 'log4js';
    }
    else if (window.console && console.firebug && console.firebug != "1.3.0") {
        Orbited.util.loggingSystem = 'firebug';
    }
    
    Orbited.getLogger = function(name) {
        if (!Orbited.loggers[name]) {
            var logger = null;
            switch (Orbited.util.loggingSystem) {
            case 'firebug':
            logger = new Orbited.Loggers.FirebugLogger(name);
            break;
            case 'log4js':
            logger = new Orbited.Loggers.Log4jsLogger(name);
            break;
            
            default:
            logger = new Orbited.Loggers.PageLogger(name);
            break;
            }
            Orbited.loggers[name] = logger;
        }
        return Orbited.loggers[name];
    };
    
    // TODO: is it confusing to have Orbited.Loggers be the various logging classes
    //     and Orbited.loggers be actual instances of logging classes?
    
    Orbited.Loggers.FirebugLogger = function(name) {
        var self = this;
        self.name = name;
        self.enabled = false;
        var padArgs = function(args) {
            var newArgs = [ name + ":" ];
            for (var i = 0; i < args.length; ++i) {
            newArgs.push(args[i]);
            }
            return newArgs;
        };
        self.log = function() {
            if (!self.enabled) { return; }
            console.log.apply(this, padArgs(arguments));
        };
        self.debug = function() {
            if (!self.enabled) { return; }
            console.debug.apply(this, padArgs(arguments));
        };
        self.info = function() {
            if (!self.enabled) { return; }
            console.info.apply(this, padArgs(arguments));
        };
        self.warn = function() {
            if (!self.enabled) { return; }
            console.warn.apply(this, padArgs(arguments));
        };
        self.error = function() {
            if (!self.enabled) { return; }
            console.error.apply(this, padArgs(arguments));
        };
        self.assert = function() {
            if (!self.enabled) { return; }
            var newArgs = [arguments[0], name + ":" ];
            for (var i = 1; i < arguments.length; ++i) {
            newArgs.push(arguments[i]);
            }
            console.assert.apply(this, newArgs);
        };
        self.trace = function() {
            if (!self.enabled) { return; }
            console.trace.apply(this, padArgs(arguments));
        };
    };
    Orbited.singleton.pageLoggerPane = null;

    Orbited.Loggers.PageLogger = function(name) {
        var self = this;
        self.enabled = false;
        self.name = name;

        var checkPane = function() {
            if (!Orbited.singleton.pageLoggerPane) {
            var p = document.createElement("div");
            p.border = "1px solid black";
            if(Orbited.settings.pageLoggerHeight) {
                p.style.height = Orbited.settings.pageLoggerHeight;
            }
            if(Orbited.settings.pageLoggerWidth) {
                p.style.height = Orbited.settings.pageLoggerWidth;
            }
            
            p.style.overflow = "scroll";
            document.body.appendChild(p);
            Orbited.singleton.pageLoggerPane = p;
            }
        };
        var show = function(data) {
            checkPane();
            var d = document.createElement('div');
            d.innerHTML = data;
            Orbited.singleton.pageLoggerPane.appendChild(d);
            Orbited.singleton.pageLoggerPane.scrollTop = Orbited.singleton.pageLoggerPane.scrollHeight;
        };
        self.log = function() {
            if (!self.enabled) { return; }
            var newArgs = [ "log", new Date(), "debug", "<b>" + name + "</b>" ];
            for (var i = 0; i < arguments.length; ++i) {
            newArgs.push(arguments[i]);
            }
            show(newArgs.join(", "));
        };
        self.debug = function() {
            if (!self.enabled) { return; }
            var newArgs = [ new Date(), "debug", "<b>" + name + "</b>" ];
            for (var i = 0; i < arguments.length; ++i) {
            newArgs.push(arguments[i]);
            }
            show(newArgs.join(", "));
        };
        self.info = function() {
            if (!self.enabled) { return; }
            var newArgs = [ new Date(), "info", "<b>" + name + "</b>" ];
            for (var i = 0; i < arguments.length; ++i) {
            newArgs.push(arguments[i]);
            }
            show(newArgs.join(", "));
        };
        self.warn = function() {
        };
        self.error = function() {
        };
        self.assert = function() {
        };
        self.trace = function() {
        };
    };


    Orbited.Loggers.Log4jsLogger = function(name) {
        var self = this;
        self.name = name;
        // NOTE: Why oh WHY doesn't Log4js accept dots in the logger names, and
        //         more importantly, why don't they have reasonble error messages?!
        var log4jsName = name;
        while (log4jsName.indexOf('.') != -1) {
            log4jsName = log4jsName.replace('.', '_');
        }
        var logger = Log4js.getLogger(log4jsName);
        self.logger = logger;
        logger.setLevel(Log4js.Level.OFF);
        
        var generateOutput = function(args) {
            var newArgs = [ name + ":" ];
            for (var i = 0; i < args.length; ++i) {
            newArgs.push(args[i]);
            }
            return newArgs.join(" ");
        };
        
        self.setLevel = function(level) {
            logger.setLevel(level);
        };
        self.addAppender = function(a) {
            logger.addAppender(a);
        };
        self.log= function() {
            // NOTE: log doesn't mean anything in Log4js. mapping it to info
            logger.info(generateOutput(arguments));
        };
        self.debug = function() {
            logger.debug(generateOutput(arguments));
        };
        self.info = function() {
            logger.info(generateOutput(arguments));
        };
        self.warn = function() {
            logger.warn(generateOutput(arguments));
        };
        self.error = function() {
            logger.error(generateOutput(arguments));
        };
        self.assert = function() {
        };
        self.trace = function() {
        };

    };
    Orbited.system = Orbited.getLogger('system');



    Orbited.CometTransports = {};

    Orbited.util.chooseTransport = function() {
        if (Orbited.settings.streaming == false || Orbited.util.browser == "webkit") {
            return Orbited.CometTransports.LongPoll;
        }
        var choices = [];
        for (var name in Orbited.CometTransports) {
            var transport = Orbited.CometTransports[name];
            if (typeof(transport[Orbited.util.browser]) == "number") {
                Orbited.system.log('viable transport: ', name);
                choices.push(transport);
            }
        }
        // TODO: sort the choices by the values of transport[Orbited.util.browser]
        //         and return the transport with the highest value.
        //    return XHRStream
        return choices[0];
    };



    var createXHR = function () {
        try { return new XMLHttpRequest(); } catch(e) {}
        try { return new ActiveXObject('MSXML3.XMLHTTP'); } catch(e) {}
        try { return new ActiveXObject('MSXML2.XMLHTTP.3.0'); } catch(e) {}
        try { return new ActiveXObject('Msxml2.XMLHTTP'); } catch(e) {}
        try { return new ActiveXObject('Microsoft.XMLHTTP'); } catch(e) {}
        throw new Error('Could not find XMLHttpRequest or an alternative.');
    };


    Orbited.legacy = {};
    //Orbited.web.connect = function() {
    //
    //}

    Orbited.CometSession = function() {
        var self = this;
        self.readyState = self.READY_STATE_INITIALIZED;
        self.onopen = function() {};
        self.onread = function() {};
        self.onclose = function() {};
        var sessionUrl = null;
        var sessionKey = null;
        var sendQueue = [];
        var packetCount = 0;
        var xhr = null;
        var handshakeTimer = null;
        var cometTransport = null;
        var pingInterval = 30000;
        var pingTimeout = 30000;
        var timeoutTimer = null;
        var lastPacketId = 0;
        var sending = false;
        var xsdClose = null;

        /*
     * This will always fire same-domain and cross-subdomain.
     * It will fire most of the time cross-port, but it's not
     * strictly guaranteed.
     * -mario
     */
        var hardClose = function() {
            var tdata = encodePackets([[++packetCount, "close"]]);
            if (xsdClose) {
                xsdClose.contentWindow.sendCloseFrame(sessionUrl.render(),tdata);
            }
            else {
                xhr.open('POST', sessionUrl.render(), !sessionUrl.isSameDomain(location.href));
                xhr.send(tdata);
            }
        }

        /*
     * self.open can only be used when readyState is INITIALIZED. Immediately
     * following a call to self.open, the readyState will be OPENING until a
     * connection with the server has been negotiated. self.open takes a url
     * as a single argument which desiginates the remote url with which to
     * establish the connection.
     */
        self.open = function(_url) {
;;;         self.logger.debug('open');
            self.readyState = self.READY_STATE_OPENING;
            sessionUrl = new Orbited.URL(_url);
            if (sessionUrl.isSameDomain(location.href)) {
                xhr = createXHR();
            }
            else {
                xhr = new Orbited.XSDR();
                if (sessionUrl.isSamePort(location.href)) {
                    xsdClose = document.createElement('iframe');
                    xsdClose.style.display = 'block';
                    xsdClose.style.width = '0';
                    xsdClose.style.height = '0';
                    xsdClose.style.border = '0';
                    xsdClose.style.margin = '0';
                    xsdClose.style.padding = '0';
                    xsdClose.style.overflow = 'hidden';
                    xsdClose.style.visibility = 'hidden';
                    var ifUrl = new Orbited.URL("");
                    ifUrl.protocol = Orbited.settings.protocol;
                    ifUrl.domain = Orbited.settings.hostname;
                    ifUrl.port = Orbited.settings.port;
                    ifUrl.path = '/static/xsdClose.html';
                    ifUrl.hash = document.domain;
                    xsdClose.src = ifUrl.render();
                    document.body.appendChild(xsdClose);
                }
            }
            if (Orbited.settings.enableFFPrivileges) {
                try {
                    netscape.security.PrivilegeManager.enablePrivilege('UniversalBrowserRead');
                } catch (ex) { }
            }

            xhr.open('GET', _url, true);
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4) {
                    if (xhr.status == 200) {
                        sessionKey = xhr.responseText;
;;;                     self.logger.debug('session key is: ', sessionKey);
                        resetTimeout();
                        // START new URL way
                        //              sessionUrl.extendPath(sessionKey)
                        // END: new URL way
                        
                        // START: old URL way
                        if (sessionUrl.path[sessionUrl.path.length] != '/') {
                            sessionUrl.path += '/';
                        }
                        sessionUrl.path += sessionKey;
                        // END: old Url way
                        var transportClass = Orbited.util.chooseTransport();
                        cometTransport = new transportClass();
                        cometTransport.timeoutResetter = resetTimeout;
                        cometTransport.isSubDomain = sessionUrl.isSubDomain(location.href);
                        cometTransport.onReadFrame = transportOnReadFrame;
                        cometTransport.onclose = transportOnClose;
                        cometTransport.connect(sessionUrl.render());
                    } else {
                        xhr = null;
                        self.readyState = self.READY_STATE_CLOSED;
                        self.onclose(Orbited.Errors.InvalidHandshake);
                    }
                }
            };
            xhr.send(null);
        };
        
        /*
     * self.send is only callable when readyState is OPEN. It will queue the data
     * up for delivery as soon as the upstream xhr is ready.
     */
        self.send = function(data) {
;;;         self.logger.debug('send', data);
            if (self.readyState != self.READY_STATE_OPEN) {
                throw new Error("Invalid readyState");
            }

//            if (cometTransport.limbo) {
//;;;             self.logger.debug('limbo is true. setting sending to false');
  //              sending = false;
    //        }

            data = Orbited.base64.encode(data);
            sendQueue.push([++packetCount, "data", data]);
;;;         self.logger.debug('sending ==', sending);
            if (!sending) {
;;;             self.logger.debug('starting send');
                doSend();
            }
        };
        
        /*
     * self.close sends a close frame to the server, at the end of the queue.
     * It also sets the readyState to CLOSING so that no further data may be
     * sent. onclose is not called immediately -- it waits for the server to
     * send a close event.
     */
        self.close = function() {
            switch(self.readyState) {
                case self.READY_STATE_CLOSING:
                case self.READY_STATE_CLOSED:
                    return;
                case self.READY_STATE_INITIALIZED:
                    // TODO: call onclose here?
                    self.readyState = self.READY_STATE_CLOSED;
                    return;
                default:
                    break;
            }
            self.readyState = self.READY_STATE_CLOSING;
            sendQueue.push([++packetCount, "close"]);
            if (!sending) {
                doSend();
            }
        };
        
        /* self.reset is a way to close immediately. The send queue will be discarded
     * and a close frame will be sent to the server. onclose is called immediately
     * without waiting for a reply from the server.
     */
        self.reset = function() {
;;;         self.logger.debug('reset');
            var origState = self.readyState;
            self.readyState = self.READY_STATE_CLOSED;
            switch(origState) {
                case self.READY_STATE_INITIALIZED:
                    self.onclose(Orbited.Errors.UserConnectionReset);
                    break;
                case self.READY_STATE_OPENING:
                    xhr.onreadystatechange = function() {};
                    xhr.abort();
                    self.onclose(Orbited.Errors.UserConnectionReset);
                    break;
                case self.READY_STATE_OPEN:
                    self.sendQueue = [];
                    self.sending = false;
                    if (xhr.readyState < 4) {
                        xhr.onreadystatechange = function() {};
                        xhr.abort();
                    }
                    doClose(Orbited.Errors.UserConnectionReset);
                    hardClose();
                    break;
                case self.READY_STATE_CLOSING:
                    // TODO: Do nothing here?
                    //     we need to figure out if we've attempted to send the close
                    //     frame yet or not If not, we do something similar to case
                    //     OPEN. either way, we should kill the transport and
                    //     trigger onclose
                    //     -mcarter 7-29-08
                    break;
                
                case self.READY_STATE_CLOSED:
                    break;
            }
        };
        
        self.cleanup = function() {
            self.readyState = self.READY_STATE_CLOSED;
            cometTransport.close();
        }
        
        var transportOnReadFrame = function(frame) {
;;;         self.logger.debug('transportOnReadFrame');
;;;         self.logger.debug('READ FRAME: ', frame.id, frame.name, frame.data ? frame.data.length : '');
            if (!isNaN(frame.id)) {
                lastPacketId = Math.max(lastPacketId, frame.id);
            }
;;;         self.logger.debug(frame);
            switch(frame.name) {
                case 'close':
                    if (self.readyState < self.READY_STATE_CLOSED) {
                        doClose(Orbited.Statuses.ServerClosedConnection);
                    }
                    break;
                case 'data':
;;;                 self.logger.debug('base64 decoding ' + frame.data.length + ' bytes of data');
                    var data = Orbited.base64.decode(frame.data);
;;;                 self.logger.debug('decode complete');
                    self.onread(data);
                    break;
                case 'open':
                    if (self.readyState == self.READY_STATE_OPENING) {
                        self.readyState = self.READY_STATE_OPEN;
;;;                     self.logger.debug('Call self.onopen()');
                        self.onopen();
                    }
                    else {
                        //TODO Throw and error?
                    }
                    break;
                case 'ping':
                    // TODO: don't have a third element (remove the null).
                    // NOTE: don't waste a request when we get a longpoll ping.
                    switch(cometTransport.name) {
                        case 'longpoll':
                            break;
                        case 'poll':
                            break;
                        default:
                            sendQueue.push([++packetCount, "ping", null]);
                            if (!sending) {
                                doSend();
                            }
                            break;
                    }
                    break;
                case 'opt':
                    var args = frame.data.split(',');
                    switch(args[0]) {
                        case 'pingTimeout':
                            pingTimeout = parseInt(args[1])*1000;
                            break;
                        case 'pingInterval':
                            pingInterval = parseInt(args[1])*1000;
                            break;
                        default:
;;;                         self.logger.warn('unknown opt key', args[0]);
                            break;
                    }
                    break;
            }
;;;         self.logger.debug("resetting timeout from transportOnReadFrame");
            resetTimeout();
        };
        var transportOnClose = function() {
;;;         self.logger.debug('transportOnClose');
            if (self.readyState < self.READY_STATE_CLOSED) {
                try {
                    doClose(Orbited.Statuses.ServerClosedConnection);
                }
                catch(e) {
                    //        Fix for navigation-close
                    return;
                }
            }
        };
        var encodePackets = function(queue) {
            //TODO: optimize this.
            var output = [];
            for (var i =0; i < queue.length; ++i) {
                var frame = queue[i];
                for (var j =0; j < frame.length; ++j) {
                    var arg = frame[j];
                    if (arg == null) {
                        arg = "";
                    }
                    if (j == frame.length-1) {
                        output.push('0');
                    }
                    else {
                        output.push('1');
                    }
                    output.push(arg.toString().length);
                    output.push(',');
                    output.push(arg.toString());
                }
            }
            return output.join("");
        };

        var doSend = function(retries) {
;;;         self.logger.debug('in doSend');
            if (typeof(retries) == "undefined") {
                retries = 0;
            }
            // TODO: I don't think this timeout formula is quite right...
            //     -mcarter 8-3-08
            if (retries*RETRY_INTERVAL >= RETRY_TIMEOUT) {
                doClose(Orbited.Errors.ConnectionTimeout);
                sending = false;
                return;
            }
            if (sendQueue.length == 0) {
;;;             self.logger.debug('sendQueue exhausted');
                sending = false;
                return;
            }
            sending = true;
;;;         self.logger.debug('setting sending=true');
            var numSent = sendQueue.length;
            sessionUrl.setQsParameter('ack', lastPacketId);
            var tdata = encodePackets(sendQueue);
;;;         self.logger.debug('post', retries, tdata);
            if (Orbited.settings.enableFFPrivileges) {
                try {
                    netscape.security.PrivilegeManager.enablePrivilege('UniversalBrowserRead');
                } catch (ex) { }
            }
            xhr.open('POST', sessionUrl.render(), true);
            // NB: its awkard, but for reusing the XHR object in IE (7 at least),
            //     we can only reset the onreadystatechange *after* we call open;
            //     if we don't do this, the XHR will stop sending data.
            // See "Reusing XMLHttpRequest Object in IE"
            //     at http://keelypavan.blogspot.com/2006/03/reusing-xmlhttprequest-object-in-ie.html
            xhr.onreadystatechange = function() {
;;;             self.logger.debug('doSend onreadystatechange');
                switch(xhr.readyState) {
                    case 4:
                        if (xhr.status == 200) {
                            resetTimeout();
                            sendQueue.splice(0, numSent);
                            return doSend();
                        }
                        else {
                            //TODO: implement retry back-off;
                            window.setTimeout(function(){doSend(++retries);},RETRY_INTERVAL);
                        }
                        break;
                }
            };
            xhr.send(tdata);
        };

        var doClose = function(code) {
;;;         self.logger.debug('doClose', code);
            unsetTimeout();
            self.readyState = self.READY_STATE_CLOSED;
            if (cometTransport != null) {
                // TODO: is this line necessary?
                cometTransport.onReadFrame = function() {};
                cometTransport.onclose = function() { };
                cometTransport.close();
            }
            self.onclose(code);
            
        };

        var resetTimeout = function() {
;;;         self.logger.debug('reset Timeout', pingInterval+pingTimeout);
            unsetTimeout();
            timeoutTimer = window.setTimeout(timedOut, pingInterval + pingTimeout);
        };
        var unsetTimeout = function() {
            window.clearTimeout(timeoutTimer);
            
        };
        var timedOut = function() {
;;;         self.logger.debug('timed out!');
            doClose(Orbited.Errors.ConnectionTimeout);
        };
    };
    Orbited.CometSession.prototype.logger = Orbited.getLogger("Orbited.CometSession");
    Orbited.CometSession.prototype.READY_STATE_INITIALIZED    = 1;
    Orbited.CometSession.prototype.READY_STATE_OPENING    = 2;
    Orbited.CometSession.prototype.READY_STATE_OPEN        = 3;
    Orbited.CometSession.prototype.READY_STATE_CLOSING    = 4;
    Orbited.CometSession.prototype.READY_STATE_CLOSED    = 5;
    
    var currentTCPSocketId = 0;
    var openSockets = {};

    Orbited.test = {};
    Orbited.test.logger = Orbited.getLogger("Orbited.test");

    Orbited.test.socketcontrol = {};
    Orbited.test.socketcontrol.kill = function(t) {
;;;     Orbited.test.logger.debug("kill ordered for socket:", t);
        if (openSockets[t.id]) {
            openSockets[t.id](Orbited.Statuses.SocketControlKilled);
            t = null;
;;;         Orbited.test.logger.debug("socket killed");
        }
        else {
;;;         Orbited.test.logger.debug("socket not found");
        }
    };

    Orbited.test.stompdispatcher = {};
    Orbited.test.stompdispatcher.send = function(dest, msg) {
;;;     Orbited.test.logger.debug("stompdispatcher dispatching "+msg+" to "+dest);
        var s = document.createElement('script');
        s.src = "http://"+Orbited.settings.hostname+":"+Orbited.settings.port+"/system/test/stomp?";
        s.src += "msg="+msg;
        s.src += "&dest="+dest;
        document.body.appendChild(s);
    };

    Orbited.TCPSocket = function() {
        var self = this;
        self.id = ++currentTCPSocketId;

        // So we don't completely ambush people used to the 0.5 api...
        if (arguments.length > 0) {
            throw new Error("TCPSocket() accepts no arguments");
        }
        self.readyState = self.READY_STATE_INITIALIZED;
        self.onopen = function() { };
        self.onread = function() { };
        self.onclose = function() { };
        var onCloseTriggered = false;
        var buffer = "";
        var session = null;
        var binary = false;
        var handshakeState = null;
        var hostname = null;
        var port = null;

        /* self.open attempts to establish a tcp connection to the specified remote
     * hostname on the specified port. When specified as true, the optional
     * argument, isBinary, will cause onread to return byte arrays, and send
     * will only accept a byte array.
     */
        self.open = function(_hostname, _port, isBinary) {
            if (self.readyState != self.READY_STATE_INITIALIZED) {
                // TODO: allow reuse from readyState == self.READY_STATE_CLOSED?
                //         Re-use makes sense for xhr due to memory concerns, but
                //         probably not for tcp sockets. How often do you reconnect
                //         in the same page?
                //         -mcarter 7-30-08
                throw new Error("Invalid readyState");
            }
            if (_hostname == false) {
                throw new Error("No hostname specified");
            }
            if (isNaN(_port)) {
                throw new Error("Invalid port specified");
            }
            // handle isBinary undefined/null case
            binary = !!isBinary;
            self.readyState = self.READY_STATE_OPENING;
            hostname = _hostname;
            port = _port;
            session = new Orbited.CometSession();
            var sessionUrl = new Orbited.URL('/tcp');
            sessionUrl.domain = Orbited.settings.hostname;
            sessionUrl.port = Orbited.settings.port;
            sessionUrl.protocol = Orbited.settings.protocol;
            sessionUrl.setQsParameter('nocache', Math.random());
            session.open(sessionUrl.render());
            session.onopen = sessionOnOpen;
            session.onread = sessionOnRead;
            session.onclose = sessionOnClose;
            handshakeState = "initial";
        };

        self.close = function() {
            if (self.readyState == self.READY_STATE_CLOSED) {
                return;
            }
            self.readyState = self.READY_STATE_CLOSED;
            doClose(Orbited.Errors.UserConnectionReset);
        };

        /* self.reset closes the connection from this end immediately. The server
     * may be notified, but there is no guarantee. The main purpose of the reset
     * function is for a quick teardown in the case of a user navigation.
     * if reset is not called when IE navigates, for instance, there will be
     * potential issues with future TCPSocket communication.
     */
        self.reset = function() {
            if (session) {session.reset();}
        };

        self.send = function(data) {
            if (self.readyState != self.READY_STATE_OPEN) {
                throw new Error("Invalid readyState");
            }
            if (!binary) {
                data = Orbited.utf8.encode(data);
            }
;;;         self.logger.debug('SEND: ', data);
            //      try {
            session.send(data);
            //      }
            //      catch(e) {
            //      alert("Why sending: typeof(data) = " + typeof(data));
            //}
        };

        var process = function() {
            var result = Orbited.utf8.decode(buffer);
            var data = result[0];
            var i = result[1];
            buffer = buffer.slice(i);
            if (data.length > 0) {
                window.setTimeout(function() { self.onread(data); }, 0);
            }
        };

        var sessionOnRead = function(data) {
            switch(self.readyState) {
                case self.READY_STATE_OPEN:
;;;                 self.logger.debug('READ: ', data);
                    if (binary) {
                        window.setTimeout(function() { self.onread(data); }, 0);
                    }
                    else {
;;;                     self.logger.debug('start buffer size:', buffer.length);
                        buffer += data;
                        process();
;;;                     self.logger.debug('end buffer size:', buffer.length);
                    }
                    break;
                case self.READY_STATE_OPENING:
                    switch(handshakeState) {
                        case 'initial':
                            // NOTE: we should only get complete payloads during
                            //     the handshake. no need to buffer, then parse
                            data = Orbited.utf8.decode(data)[0];
;;;                         self.logger.debug('initial');
;;;                         self.logger.debug('data', data);
;;;                         self.logger.debug('len', data.length);
;;;                         self.logger.debug('typeof(data)', typeof(data));
;;;                         self.logger.debug('data[0] ', data.slice(0,1));
;;;                         self.logger.debug('type ', typeof(data.slice(0,1)));
                            var result = (data.slice(0,1) == '1');
;;;                         self.logger.debug('result', result);
                            if (!result) {
;;;                             self.logger.debug('!result');
                                var errorCode = data.slice(1,4);
                                doClose(parseInt(errorCode));
                            }
                            if (result) {
                                self.readyState = self.READY_STATE_OPEN;
;;;                             self.logger.debug('tcpsocket.onopen..');
                                self.onopen();
;;;                             self.logger.debug('did onopen');
                            }
                            break;
                    }
                    break;
            }
        };
        var doClose = function(code) {
;;;         self.logger.debug('doClose', code);
            if (session) {
                if (code == Orbited.Statuses.ServerClosedConnection || code == Orbited.Errors.Unauthorized || code == Orbited.Errors.RemoteConnectionFailed) {
                    session.cleanup();
                }
                else {
                    sessionOnClose = function() {};
                    session.close();
                }
                session = null;
            }
;;;         self.logger.debug('onCloseTriggered', onCloseTriggered);
            if (!onCloseTriggered) {
;;;             self.logger.debug('triggerClose timer', code);
                onCloseTriggered = true;
                window.setTimeout(function() {
;;;                 self.logger.debug('onclose!', code);
                    self.onclose(code);
                }, 0);
            }
        };

        openSockets[self.id] = doClose;

        var sessionOnOpen = function(data) {
            // TODO: TCPSocket handshake
            var payload = hostname + ':' + port + '\n';
;;;         self.logger.debug('sessionOpen; sending:', payload);
            payload = Orbited.utf8.encode(payload);
;;;         self.logger.debug('encoded payload:', payload);
            X = payload;
            session.send(payload);
            handshakeState = 'initial';
        };

        var sessionOnClose = function(code) {
;;;         self.logger.debug('sessionOnClose');
            // If we are in the OPENING state, then the handshake code should
            // handle the close
            doClose(code);
        };
    };
    Orbited.TCPSocket.prototype.toString = function() {
        return "<Orbited.TCPSocket " + this.id + ">";
    };
    Orbited.TCPSocket.prototype.logger = Orbited.getLogger("Orbited.TCPSocket");
    Orbited.TCPSocket.prototype.READY_STATE_INITIALIZED  = 1;
    Orbited.TCPSocket.prototype.READY_STATE_OPENING         = 2;
    Orbited.TCPSocket.prototype.READY_STATE_OPEN         = 3;
    Orbited.TCPSocket.prototype.READY_STATE_CLOSING         = 4;
    Orbited.TCPSocket.prototype.READY_STATE_CLOSED         = 5;





    // XXX: the Orbited.XSDR stuff (presumably) doesn't work yet.
    //    mcarter - 8-9-08 (~rev 476)

    Orbited.singleton.XSDR = {
        receiveCbs: {},
        queues: {},
        iframes: {},
        id: 0,
        register: function(receive, queue) {
            var id = ++Orbited.singleton.XSDR.id;
            Orbited.singleton.XSDR.receiveCbs[id] = receive;
            Orbited.singleton.XSDR.queues[id] = queue;
;;;         Orbited.system.debug('id is', id);
            return id;
        }
    };
    Orbited.XSDR = function() {
        var self = this;
        var ifr = null;
        var url;
        var method;
        var data;
        var requestHeaders;
        var queue = [];
        var id = Orbited.singleton.XSDR.register(function(data) { receive(data); },queue);
        var bridgeUrl = new Orbited.URL("");
        bridgeUrl.domain = Orbited.settings.hostname;
        bridgeUrl.port = Orbited.settings.port;
        bridgeUrl.path = '/static/xsdrBridge.html';
        bridgeUrl.hash = id.toString();
        bridgeUrl.protocol = Orbited.settings.protocol;
;;;     self.logger.debug('bridgeUrl.hash is', bridgeUrl.hash);
;;;     self.logger.debug('bridgeUrl.path is', bridgeUrl.path);
;;;     self.logger.debug('bridgeUrl is', bridgeUrl.render());
        var reset = function() {
            self.responseText = "";
            self.status = null;
            self.readyState = 0;
            url = null;
            method = null;
            data = null;
            requestHeaders = {};
        };
        reset();
        self.onreadystatechange = function() { };
        self.open = function(_method, _url, async) {
            if (self.readyState == 4) {
                reset();
            }
            if (self.readyState != 0) {
                throw new Error("Invalid readyState");
            }
            if (!async) {
                throw new Error("Only Async XSDR supported");
            }
;;;         self.logger.debug('open', _method, _url, async);
            self.readyState = 1;
            url = _url;
            method = _method;
        };

        self.send = function(data) {
            if (self.readyState != 1) {
                throw new Error("Invalid readyState");
            }
;;;         self.logger.debug('send', data);
            if (!ifr) {
;;;             self.logger.debug('creating iframe');
                ifr = document.createElement("iframe");
                hideIframe(ifr);
                ifr.src = bridgeUrl.render();
;;;             self.logger.debug('set ifr.src to', ifr.src);
                document.body.appendChild(ifr);
                Orbited.singleton.XSDR.iframes[id] = ifr;
            }
            else {
                queue.push([method, url, data, requestHeaders]);
            }
        };

        self.abort = function() {
            if (self.readyState > 0 && self.readyState < 4) {
                // TODO: push an ABORT command (so as not to reload the iframe)
                //          queue.push(['ABORT']);
;;;             self.logger.debug('ABORT called');
                ifr.src = "about:blank";
                document.body.removeChild(ifr);
                ifr = null;
                self.readyState = 4;
                self.onreadystatechange();
            }
        };


        //    self.abort = function() {
        //      if (self.readyState > 0 && self.readyState < 4) {
        //          queue.push(['ABORT']);
        //      }
        //    }

        self.setRequestHeader = function(key, val) {
            if (self.readyState != 0) {
                throw new Error("Invalid readyState");
            }
            requestHeaders[key] = val;
        };

        self.getResponseHeader = function() {
            if (self.readyState < 2) {
                throw new Error("Invalid readyState");
            }
            return responseHeaders[key];
        };

        var receive = function(payload) {
;;;         self.logger.debug('received', payload);
            switch(payload[0]) {
                case 'initialized':
                    queue.push([method, url, data, requestHeaders]);
;;;                 self.logger.debug('queue is', queue);
;;;                 self.logger.debug('Orbited.singleton.XSDR.queues[id] is', Orbited.singleton.XSDR.queues[id]);
                    break;
                case 'readystatechange':
                    data = payload[1];
                    self.readyState = data.readyState;
;;;                 self.logger.debug('readystatechange', self.readyState);
                    if (data.status) {
                        self.status = data.status;
;;;                     self.logger.debug('status', data.status);
                    }
                    if (data.responseText) {
                        self.responseText += data.responseText;
;;;                     self.logger.debug('responseText', data.responseText);
                    }
;;;                 self.logger.debug('doing trigger');
                    self.onreadystatechange();
;;;                 self.logger.debug('trigger complete');
                    break;
            }
        };

        var hideIframe =function (ifr) {
            ifr.style.display = 'block';
            ifr.style.width = '0';
            ifr.style.height = '0';
            ifr.style.border = '0';
            ifr.style.margin = '0';
            ifr.style.padding = '0';
            ifr.style.overflow = 'hidden';
            ifr.style.visibility = 'hidden';
        };

    };

    if (Orbited.util.browser == "opera") {
        var pmLocation = window.postMessage && "contentWindow" || "document";
        (window.postMessage && window || document).addEventListener('message', function(e) {
            var msg = e.data.split(" ");
            var cmd = msg.shift();
            if (cmd == "event") {
                var id = msg.shift();
                var dataString = msg.join(" ");
                var data = Orbited.JSON.parse(dataString);
                Orbited.singleton.XSDR.receiveCbs[id](data);
            }
            if (cmd == "queues") {
                id = msg.shift();
                var queue = Orbited.singleton.XSDR.queues[id];
                if (queue.length > 0) {
                    data = queue.shift();
                    Orbited.singleton.XSDR.iframes[id][pmLocation].postMessage(Orbited.JSON.stringify(data), e.origin);
                }
            }
        }, false);
    }

    Orbited.XSDR.prototype.logger = Orbited.getLogger("Orbited.XSDR");
    Orbited.singleton.XSDRBridgeLogger = Orbited.getLogger('XSDRBridge');

    /* Comet Transports!
 */
    var CT_READYSTATE_INITIAL = 0;
    var CT_READYSTATE_OPEN      = 1;
    var CT_READYSTATE_CLOSED  = 2;

    Orbited.CometTransports.XHRStream = function() {
        var self = this;
        self.name = 'xhrstream';
        var url = null;
        var xhr = null;
        var ackId = null;
        var offset = 0;
        var heartbeatTimer = null;
        var retryTimer = null;
        var buffer = "";
        var retryInterval = 50;
        self.readyState = CT_READYSTATE_INITIAL;
        self.onReadFrame = function(frame) {};
        self.onread = function(packet) { self.onReadFrame(packet); };
        self.onclose = function() { };

        self.close = function() {
            if (self.readyState == CT_READYSTATE_CLOSED) {
                return;
            }
            if (xhr != null && (xhr.readyState > 1 || xhr.readyState < 4)) {
                xhr.onreadystatechange = function() { };
                xhr.abort();
                xhr = null;
            }
            self.readyState = CT_READYSTATE_CLOSED;
            window.clearTimeout(heartbeatTimer);
            window.clearTimeout(retryTimer);
            self.onclose();
        };

        self.connect = function(_url) {
            if (self.readyState == CT_READYSTATE_OPEN) {
                throw new Error("Already Connected");
            }
            url = new Orbited.URL(_url);
            if (xhr == null) {
                if (url.isSameDomain(location.href)) {
                    xhr = createXHR();
                }
                else {
                    xhr = new Orbited.XSDR();
                }
            }
            url.path += '/xhrstream';
            //      url.setQsParameter('transport', 'xhrstream')
            self.readyState = CT_READYSTATE_OPEN;
            open();
        };
        var open = function() {
            try {
                if (typeof(ackId) == "number") {
                    url.setQsParameter('ack', ackId);
                }
                if (typeof(xhr)== "undefined" || xhr == null) {
                    throw new Error("how did this happen?");
                }
                if (Orbited.settings.enableFFPrivileges) {
                    try {
                        netscape.security.PrivilegeManager.enablePrivilege('UniversalBrowserRead');
                    }
                    catch (ex) { }
                }

                xhr.open('GET', url.render(), true);
                xhr.onreadystatechange = function() {
;;;                 self.logger.debug(xhr.readyState);
                    if (self.readyState == CT_READYSTATE_CLOSED) {
                        return;
                    }
                    switch(xhr.readyState) {
                        case 2:
                            // If we can't get the status, then we didn't actually
                            // get a valid xhr response -- we got a network error
                            try {
                                var status = xhr.status;
                            }
                            catch(e) {
                                return;
                            }
                            // If we got a 200, then we're in business
                            if (status == 200) {
                                try {
                                    heartbeatTimer = window.setTimeout(heartbeatTimeout, Orbited.settings.HEARTBEAT_TIMEOUT);
                                }
                                catch(e) {
                                //                 Happens after navigation
                                    self.close();
                                    return;
                                }
                                var testtimer = heartbeatTimer;
                            }
                            // Otherwise, case 4 should handle the reconnect,
                            // so do nothing here.
                            break;
                        case 3:
                            // If we can't get the status, then we didn't actually
                            // get a valid xhr response -- we got a network error
                            try {
                                var status = xhr.status;
                            }
                            catch(e) {
                                return;
                            }
                            // We successfully established a connection, so put the
                            // retryInterval back to a short value
                            if (status == 200) {
                                retryInterval = 50;
                                process();
                            }
                            break;
                        case 4:
                            var doReconnect = true;
                            try {
                                if (xhr.status === null) {
                                    doReconnect = true;
                                }
                                else {
                                    doReconnect = false;
                                }
                            }
                            catch(e) {
                            }
                            if (doReconnect) {
                                // Expoential backoff: Every time we fail to
                                // reconnect, double the interval.
                                // TODO cap the max value.
                                retryInterval *= 2;
                                //                  self.logger.debug('retryInterval', retryInterval)
                                window.clearTimeout(heartbeatTimer);
                                retryTimer = window.setTimeout(reconnect, retryInterval);
                                return;
                            }
                            switch(xhr.status) {
                                case 200:
                                    //                  alert('finished, call process');
                                    //                 if (typeof(Orbited) == "undefined") {
                                    //                      alert('must have reloaded')
                                    //                      break
                                    //                  }
                                    //                  alert('a');
                                    //                  alert('stream over ' +  typeof(console) + ' ' + typeof(Orbited) + ' ' + Orbited + ' ...');
                                    process();
                                    offset = 0;
                                    setTimeout(open, 0);
                                    window.clearTimeout(heartbeatTimer);
                                    break;
                                case 404:
                                    self.close();
                                    break;
                                default:
                                    self.close();
                                    break;
                            }
                            break;
                    }
                };
                xhr.send(null);
            }
            catch(e) {
                self.close();
            }
        };

        var reconnect = function() {
;;;         self.logger.debug('reconnect...')
            if (xhr.readyState < 4 && xhr.readyState > 0) {
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4) {
                reconnect();
                }
            };
;;;         self.logger.debug('do abort..')
            xhr.abort();
            window.clearTimeout(heartbeatTimer);
            }
            else {
;;;         self.logger.debug('reconnect do open');
            offset = 0;
            setTimeout(open, 0);
            }
        };
        // 12,ab011,hello world
        var commaPos = -1;
        var argEnd = null;
        var frame = [];
        var process = function() {
            var stream = xhr.responseText;
            receivedHeartbeat();

            // ignore leading whitespace, such as at the start of an xhr stream
            while (stream[offset] == ' ') {
            offset += 1;
            }
            // ignore leading whitespace, such as at the start of an xhr stream
            while (stream[offset] == 'x') {
            offset += 1;
            }

            var k = 0;
            while (true) {
            k += 1;
            if (k > 2000) {
                throw new Error("Borked XHRStream transport");
            }
            if (commaPos == -1) {
                commaPos = stream.indexOf(',', offset);
            }
            if (commaPos == -1) {
                return;
            }
            if (argEnd == null) {
                argSize = parseInt(stream.slice(offset+1, commaPos));
                argEnd = commaPos +1 + argSize;
            }
            
            if (stream.length < argEnd) {
                return;
            }
            var data = stream.slice(commaPos+1, argEnd);
            frame.push(data);
            var isLast = (stream.charAt(offset) == '0');
            offset = argEnd;
            argEnd = null;
            commaPos = -1;
            if (isLast) {
                var frameCopy = frame;
                frame = [];
                receivedPacket(frameCopy);
            }
            }

        };
        var receivedHeartbeat = function() {
            window.clearTimeout(heartbeatTimer);
;;;         self.logger.debug('clearing heartbeatTimer', heartbeatTimer);
            try {
            heartbeatTimer = window.setTimeout(function() {
;;;             self.logger.debug('timer', testtimer, 'did it');
                heartbeatTimeout();
            }, Orbited.settings.HEARTBEAT_TIMEOUT);
            }
            catch(e) {
            return;
            }
            var testtimer = heartbeatTimer;

;;;         self.logger.debug('heartbeatTimer is now', heartbeatTimer);
        };
        var heartbeatTimeout = function() {
;;;         self.logger.debug('heartbeat timeout... reconnect');
            reconnect();
        };
        var receivedPacket = function(args) {
            var testAckId = parseInt(args[0]);
            if (!isNaN(testAckId)) {
            ackId = testAckId;
            }
            var packet = {
            id: testAckId,
            name: args[1],
            data: args[2]
            };
            // TODO: shouldn't we put this in a window.setTimeout so that user
            //     code won't mess up our code?
            self.onread(packet);
        };
    };
    Orbited.CometTransports.XHRStream.prototype.logger = Orbited.getLogger("Orbited.CometTransports.XHRStream");
    // XHRStream supported browsers
    Orbited.CometTransports.XHRStream.firefox = 1.0;
    Orbited.CometTransports.XHRStream.firefox2 = 1.0;
    Orbited.CometTransports.XHRStream.firefox3 = 1.0;
    Orbited.CometTransports.XHRStream.safari2 = 1.0;
    Orbited.CometTransports.XHRStream.safari3 = 1.0;





    Orbited.CometTransports.LongPoll = function() {
        var self = this;
        self.name = 'longpoll';
        var url = null;
        var xhr = null;
        var ackId = null;
        var retryTimer = null;
        var buffer = "";
        var retryInterval = 50;
        self.readyState = CT_READYSTATE_INITIAL;
        self.onReadFrame = function(frame) {};
        self.onclose = function() { };

        self.close = function() {
;;;         self.logger.debug('close');
            if (self.readyState == CT_READYSTATE_CLOSED) {
                return;
            }
            if (xhr != null && (xhr.readyState > 1 || xhr.readyState < 4)) {
                xhr.onreadystatechange = function() { };
                xhr.abort();
                xhr = null;
            }
;;;         self.logger.debug('close! self.readyState now is 2');
            self.readyState = CT_READYSTATE_CLOSED;
            window.clearTimeout(retryTimer);
            self.onclose();
        };

        self.connect = function(_url) {
;;;         self.logger.debug('connect');
            if (self.readyState == CT_READYSTATE_OPEN) {
                throw new Error("Already Connected");
            }
            url = new Orbited.URL(_url);
            if (xhr == null) {
                if (url.isSameDomain(location.href)) {
                    xhr = createXHR();
                }
                else {
                    xhr = new Orbited.XSDR();
                }
            }
            url.path += '/longpoll';
            //      url.setQsParameter('transport', 'xhrstream')
            self.readyState = CT_READYSTATE_OPEN;
            open();
        };
        var open = function() {
;;;         self.logger.debug('open... self.readyState = ' + self.readyState);
            if (self.readyState == CT_READYSTATE_CLOSED) {
                return;
            }
            try {
                if (typeof(ackId) == "number") {
                    url.setQsParameter('ack', ackId);
                }
                if (typeof(xhr)== "undefined" || xhr == null) {
                    throw new Error("how did this happen?");
                }
                if (Orbited.settings.enableFFPrivileges) {
                    try {
                        netscape.security.PrivilegeManager.enablePrivilege('UniversalBrowserRead');
                    }
                    catch (ex) { }
                }
                xhr.open('GET', url.render(), true);
                xhr.onreadystatechange = function() {
;;;                 self.logger.debug('readystate', xhr.readyState);
                    switch(xhr.readyState) {
                        case 4:
                            try {
                                var test = xhr.status;
                            }
                            catch(e) {
                                // Exponential backoff: Every time we fail to
                                // reconnect, double the interval.
                                // TODO cap the max value.
;;;                             self.logger.debug("start reconnect Timer (couldn't access xhr.status)");
                                retryInterval *= 2;
                                window.setTimeout(reconnect, retryInterval);
                                return;
                            }
                            switch(xhr.status) {
                                case 200:
                                    self.timeoutResetter();
                                    process();
;;;                                 self.logger.debug("completed request, reconnect immediately");
                                    setTimeout(open, 0);
                                    break;
                                case 404:
                                    self.close();
                                    break;
                                case null:
                                    // NOTE: for the XSDR case:
                                    // (we can always get status, but maybe its null)
                                    retryInterval *= 2;
;;;                                 self.logger.debug("start reconnect Timer (null xhr.status)");
                                    window.setTimeout(reconnect, retryInterval);
                                    break;
                                default:
                                    // TODO: do we want to retry here?
;;;                                 self.logger.debug("something broke, xhr.status=", xhr.status);
                                    self.close();
                                    break;
                            }
                            break;
                    }
                };
                xhr.send(null);
            }
            catch(e) {
                self.close();
            }
        };

        var reconnect = function() {
;;;         self.logger.debug('reconnect...');
            if (xhr.readyState < 4 && xhr.readyState > 0) {
                xhr.onreadystatechange = function() {
                    if (xhr.readyState == 4) {
                        reconnect();
                    }
                };
;;;             self.logger.debug('do abort..');
                xhr.abort();
                window.clearTimeout(heartbeatTimer);
            }
            else {
;;;             self.logger.debug('reconnect do open');
                offset = 0;
                setTimeout(open, 0);
            }
        };
        // ( ab,hello world)
        // 12,ab011,hello world
        var process = function() {
;;;         self.logger.debug('process');
            var commaPos = -1;
            var argEnd = null;
            var argSize;
            var frame = [];
            var stream = xhr.responseText;
            var offset = 0;


            var k = 0;
            while (true) {
                k += 1;
                if (k > 2000) {
                    throw new Error("Borked XHRStream transport");
                }
                if (commaPos == -1) {
                    commaPos = stream.indexOf(',', offset);
                }
                if (commaPos == -1) {
;;;                 self.logger.debug('no more commas. offset:', offset, 'stream.length:', stream.length);
                    return;
                }
                if (argEnd == null) {
                    argSize = parseInt(stream.slice(offset+1, commaPos));
                    argEnd = commaPos +1 + argSize;
                }
;;;             self.logger.assert(true);
                /*          if (stream.length < argEnd) {
    //;;;        self.logger.debug('how did we get here? stream.length:', stream.length, 'argEnd:', argEnd, 'offset:', offset)
                return
                }*/
                var data = stream.slice(commaPos+1, argEnd);
;;;             self.logger.assert(data.length == argSize, 'argSize:', argSize, 'data.length', data.length);
                if (data.length != argSize) {
                    DEBUGDATA = stream;
                }
                frame.push(data);
                var isLast = (stream.charAt(offset) == '0');
                offset = argEnd;
                argEnd = null;
                commaPos = -1;
                if (isLast) {
                    var frameCopy = frame;
                    frame = [];
                    receivedPacket(frameCopy);
                }
            }

        };
        var receivedPacket = function(args) {
            var testAckId = parseInt(args[0]);
;;;         self.logger.debug('args', args);
            if (!isNaN(testAckId)) {
                ackId = testAckId;
            }
;;;         self.logger.debug('testAckId', testAckId, 'ackId', ackId);
            var packet = {
                id: testAckId,
                name: args[1],
                data: args[2]
            };
            // TODO: shouldn't we put this in a window.setTimeout so that user
            //     code won't mess up our code?
            self.onReadFrame(packet);
        };
    };
    Orbited.CometTransports.LongPoll.prototype.logger = Orbited.getLogger("Orbited.CometTransports.LongPoll");
    // LongPoll supported browsers
    /*
Orbited.CometTransports.LongPoll.firefox = 0.9
Orbited.CometTransports.LongPoll.firefox2 = 0.9
Orbited.CometTransports.LongPoll.firefox3 = 0.9
Orbited.CometTransports.LongPoll.safari2 = 0.9
Orbited.CometTransports.LongPoll.safari3 = 0.9
Orbited.CometTransports.LongPoll.opera = 0.9
Orbited.CometTransports.LongPoll.ie = 0.9
*/



    Orbited.CometTransports.Poll = function() {
        var self = this;
        self.name = 'poll';

//        self.limbo = false;

        var url = null;
        var xhr = null;
        var ackId = null;
        var retryTimer = null;
        var buffer = "";
        var baseRetryInterval = Orbited.settings.POLL_INTERVAL;
        var retryInterval = baseRetryInterval;
        self.readyState = CT_READYSTATE_INITIAL;
        self.onReadFrame = function(frame) {};
        self.onclose = function() { };

        self.close = function() {
;;;         self.logger.debug('close...');
            if (self.readyState == CT_READYSTATE_CLOSED) {
                return;
            }
            if (xhr != null && (xhr.readyState > 1 || xhr.readyState < 4)) {
                xhr.onreadystatechange = function() { };
                xhr.abort();
                xhr = null;
            }
            self.readyState = CT_READYSTATE_CLOSED;
            window.clearTimeout(retryTimer);
            self.onclose();
        };

        self.connect = function(_url) {
;;;         self.logger.debug('connect...');
            if (self.readyState == CT_READYSTATE_OPEN) {
                throw new Error("Already Connected");
            }
            url = new Orbited.URL(_url);
            if (xhr == null) {
                if (url.isSameDomain(location.href)) {
                    xhr = createXHR();
                }
                else {
                    xhr = new Orbited.XSDR();
                }
            }
            url.path += '/poll';
            //      url.setQsParameter('transport', 'xhrstream')
            self.readyState = CT_READYSTATE_OPEN;
            open();
        };
        var open = function() {
;;;         self.logger.debug('open...');
            try {
                if (typeof(ackId) == "number") {
                    url.setQsParameter('ack', ackId);
                }
                if (typeof(xhr)== "undefined" || xhr == null) {
                    throw new Error("how did this happen?");
                }
                
                if (Orbited.settings.enableFFPrivileges) {
                    try {
                        netscape.security.PrivilegeManager.enablePrivilege('UniversalBrowserRead');
                    } catch (ex) { }
                }
                xhr.open('GET', url.render(), true);
                xhr.onreadystatechange = function() {
                    switch(xhr.readyState) {
                        case 4:
                            try {
                                var test = xhr.status;
                            }
                            catch(e) {
                                // Exponential backoff: Every time we fail to
                                // reconnect, double the interval.
                                // TODO cap the max value.
                                retryInterval *= 2;
                                window.setTimeout(reconnect, retryInterval);
                                return;
                            }
                            switch(xhr.status) {
                                case 200:
                                    self.timeoutResetter();
                                    retryInterval = baseRetryInterval;
                                    process();
                                    setTimeout(open, retryInterval);
                                    break;
                                case 404:
                                    self.close();
                                    break;
                                case null:
                                    // NOTE: for the XSDR case: Long
                                    // (we can always get status, but maybe its null)
                                    retryInterval *= 2;
                                    window.setTimeout(reconnect, retryInterval);
                                    break;
                                default:
                                    // TODO: do we want to retry here?
                                    self.close();
                                    break;
                            }
                            break;
                    }
                };
                xhr.send(null);
            }
            catch(e) {
                self.close();
            }
        };
        
        var reconnect = function() {
;;;         self.logger.debug('reconnect...');
            if (xhr.readyState < 4 && xhr.readyState > 0) {
                xhr.onreadystatechange = function() {
                    if (xhr.readyState == 4) {
                        reconnect();
                    }
                };
;;;             self.logger.debug('do abort..');
                xhr.abort();
                window.clearTimeout(heartbeatTimer);
            } else {
;;;             self.logger.debug('reconnect do open');
                offset = 0;
                setTimeout(open, 0);
            }
        };
        // 12,ab011,hello world
        var process = function() {
;;;         self.logger.debug('process...');
            var commaPos = -1;
            var argEnd = null;
            var argSize;
            var frame = [];
            var stream = xhr.responseText;
            var offset = 0;

            var k = 0;

            while (true) {
                k += 1;
                if (k > 2000) {
                    throw new Error("Borked XHRStream transport");
                }
                if (commaPos == -1) {
                    commaPos = stream.indexOf(',', offset);
                }
                if (commaPos == -1) {
;;;                 self.logger.debug('no more commas. offset:', offset, 'stream.length:', stream.length);
//                    if (offset == 0 && stream.length == 0) {
//;;;                     self.logger.debug('setting limbo to true');
  //                      self.limbo = true;
    //                }
                    return;
                }
//;;;             self.logger.debug('setting limbo to false');
  //              self.limbo = false;

                if (argEnd == null) {
                    argSize = parseInt(stream.slice(offset+1, commaPos));
                    argEnd = commaPos +1 + argSize;
                }
                //;;;        self.logger.assert(true);
                /*          if (stream.length < argEnd) {
    //;;;        self.logger.debug('how did we get here? stream.length:', stream.length, 'argEnd:', argEnd, 'offset:', offset)
                return
                }*/
                var data = stream.slice(commaPos+1, argEnd);
;;;             self.logger.assert(data.length == argSize, 'argSize:', argSize, 'data.length', data.length);
                if (data.length != argSize) {
                    DEBUGDATA = stream;
                }
                frame.push(data);
                var isLast = (stream.charAt(offset) == '0');
                offset = argEnd;
                argEnd = null;
                commaPos = -1;
                if (isLast) {
                    var frameCopy = frame;
                    frame = [];
                    receivedPacket(frameCopy);
                }
            }
            
        };
        var receivedPacket = function(args) {
;;;         self.logger.debug('receivedPacket...');
            var testAckId = parseInt(args[0]);
;;;         self.logger.debug('args', args);
            if (!isNaN(testAckId)) {
            ackId = testAckId;
            }
;;;         self.logger.debug('testAckId', testAckId, 'ackId', ackId);
            var packet = {
            id: testAckId,
            name: args[1],
            data: args[2]
            };
            // TODO: shouldn't we put this in a window.setTimeout so that user
            //     code won't mess up our code?
            self.onReadFrame(packet);
        };
    };
    Orbited.CometTransports.Poll.prototype.logger = Orbited.getLogger("Orbited.CometTransports.Poll");

    // Poll supported browsers
    /*Orbited.CometTransports.Poll.firefox = 0.5
Orbited.CometTransports.Poll.opera = 0.5
Orbited.CometTransports.Poll.ie = 0.5
*/





    Orbited.CometTransports.HTMLFile = function() {
        var self = this;
        self.name = 'htmlfile';
        var id = ++Orbited.singleton.HTMLFile.i;
        Orbited.singleton.HTMLFile.instances[id] = self;
        var htmlfile = null;
        var ifr = null;
        var url = null;
        var restartUrl = null;
        var restartTimer = null;
        // TODO: move constant to Orbited.settings
        var baseRestartTimeout = 2000;
        var restartTimeout = baseRestartTimeout;
        self.onReadFrame = function(frame) {};
        self.onread = function(packet) { self.onReadFrame(packet); };
        self.onclose = function() { };
        self.connect = function(_url) {
            if (self.readyState == CT_READYSTATE_OPEN) {
            throw new Error("Already Connected");
            }
            self.logger.debug('self.connect', _url);
            url = new Orbited.URL(_url);
            url.path += '/htmlfile';
            url.setQsParameter('frameID', id.toString());
            self.readyState = CT_READYSTATE_OPEN;
            doOpen(url.render());
        };

        var doOpenIfr = function() {

            var ifr = document.createElement('iframe');
            ifr.src = url.render();
            document.body.appendChild(ifr);
        };

        var doOpen = function(_url) {
;;;         self.logger.debug('doOpen', _url);
            htmlfile = new ActiveXObject('htmlfile'); // magical microsoft object
            htmlfile.open();
            if (self.isSubDomain) {
                htmlfile.write('<html><script>' + 'document.domain="' + document.domain + '";' + '</script></html>');
            }
            else {
                htmlfile.write('<html></html>');
            }
            htmlfile.parentWindow.Orbited = Orbited;
            htmlfile.close();
            var iframe_div = htmlfile.createElement('div');
            htmlfile.body.appendChild(iframe_div);
            ifr = htmlfile.createElement('iframe');
            iframe_div.appendChild(ifr);
            ifr.src = _url;
            restartUrl = _url;
            restartTimer = window.setTimeout(reconnect, restartTimeout);
        };

        // TODO: expose this in another way besides the public api
        self.restartingStream = function(_url) {
            restartUrl = _url;
            restartTimer = window.setTimeout(reconnect, restartTimeout);
        };

        var reconnect = function() {
;;;         self.logger.debug('doing reconnect... ' + restartTimeout);
            restartTimeout*=2;
            ifr.src = restartUrl;
          restartTimer = window.setTimeout(reconnect, restartTimeout);
        };

        self.streamStarted = function() {
;;;         self.logger.debug('stream started..');
            window.clearTimeout(restartTimer);
            restartTimer = null;
            restartTimeout = baseRestartTimeout;
        };

        self.streamClosed = function() {
;;;         self.logger.debug('stream closed!');
            window.clearTimeout(restartTimer);
            self.close();
        };

        self.receive = function(id, name, data) {
            packet = {
            id: id,
            name: name,
            data: data
            };
            self.onread(packet);
        };

        self.close = function() {
            if (self.readyState == CT_READYSTATE_CLOSED) {
            return;
            }
;;;         self.logger.debug('close called, clearing timer');
            window.clearTimeout(restartTimer);
            self.readyState = CT_READYSTATE_CLOSED;
            ifr.src = 'about:blank';
            htmlfile = null;
            CollectGarbage();
            self.onclose();
        };

    };
    Orbited.CometTransports.HTMLFile.prototype.logger = Orbited.getLogger("Orbited.CometTransports.HTMLFile");
    // HTMLFile supported browsers
    Orbited.CometTransports.HTMLFile.ie = 1.0;
    Orbited.singleton.HTMLFile = {
        i: 0,
        instances: {}
    };




    Orbited.CometTransports.SSE = function() {
        var self = this;
        self.name = 'sse';
        self.onReadFrame = function(frame) {};
        self.onclose = function() { };
        self.readyState = CT_READYSTATE_INITIAL;
        var heartbeatTimer = null;
        var source = null;
        var url = null;
        var lastEventId = -1;

        self.close = function() {
            if (self.readyState == CT_READYSTATE_CLOSED) {
                return;
            }
            // TODO: can someone test this and get back to me? (No opera at the moment)
            //     : -mcarter 7-26-08
            self.readyState = CT_READYSTATE_CLOSED;
            doClose();
            self.onclose();
        };

        self.connect = function(_url) {
            if (self.readyState == CT_READYSTATE_OPEN) {
                throw new Error("Already Connected");
            }
            url = new Orbited.URL(_url);
            url.path += '/sse';
            self.readyState = CT_READYSTATE_OPEN;
            doOpen();
        };
        doClose = function() {
            source.removeEventSource(source.getAttribute('src'));
            source.setAttribute('src',"");
            if (opera.version() < 9.5) {
                document.body.removeChild(source);
            }
            source = null;
        };
        doOpen = function() {
            /*
        if (typeof(lastEventId) == "number") {
            url.setQsParameter('ack', lastEventId)
        }
*/
            source = document.createElement("event-source");
            source.setAttribute('src', url.render());
            // NOTE: without this check opera 9.5 would make two connections.
            if (opera.version() < 9.5) {
            document.body.appendChild(source);
            }
            source.addEventListener('payload', receivePayload, false);
            
            //      source.addEventListener('heartbeat', receiveHeartbeat, false);
            // start up the heartbeat timer...
            //      receiveHeartbeat();
        };
        
        var receivePayload = function(event) {
            var data = eval(event.data);
            if (typeof(data) != 'undefined') {
            for (var i = 0; i < data.length; ++i) {
                var packet = data[i];
                receive(packet[0], packet[1], packet[2]);
            }
            }
            
        };
        /*    var receiveHeartbeat = function() {
               window.clearTimeout(heartbeatTimer);
               heartbeatTimer = window.setTimeout(reconnect, Orbited.settings.HEARTBEAT_TIMEOUT)
              }      */
        var receive = function(id, name, data) {
            var tempId = parseInt(id);
            if (!isNaN(tempId)) {
            // NOTE: The old application/x-dom-event-stream transport doesn't
            //         allow us to put in the lastEventId on reconnect, so we are
            //         bound to get double copies of some of the events. Therefore
            //         we are going to throw out the duplicates. Its not clear to
            //         me that this is a perfect solution.
            //         -mcarter 8-9-08
            //          if (tempId <= lastEventId) {
            //          return
            //          }
            lastEventId = tempId;
            }
            // NOTE: we are dispatching null-id packets. Is this correct?
            //     -mcarter 9-8-08
            packet = {
            id: id,
            name: name,
            data: data
            };
            self.onReadFrame(packet);
        };
    };
    Orbited.CometTransports.SSE.prototype.logger = Orbited.getLogger("Orbited.CometTransports.SSE");
    
    Orbited.CometTransports.SSE.opera = 1.0;
    Orbited.CometTransports.SSE.opera8 = 1.0;
    Orbited.CometTransports.SSE.opera9 = 1.0;
    Orbited.CometTransports.SSE.opera9_5 = 0.8;



    /* This is an old implementation of the URL class. Jacob is cleaning it up
 * -mcarter, 7-30-08
 *
 * Jacob is actually throwing this away and rewriting from scratch
 * -mcarter 11-14-08
 */
    Orbited.URL = function(_url) {
        var self = this;
        var protocolIndex = _url.indexOf("://");
        if (protocolIndex != -1) self.protocol = _url.slice(0,protocolIndex);
        else protocolIndex = -3;

        var domainIndex = _url.indexOf('/', protocolIndex+3);
        if (domainIndex == -1) domainIndex=_url.length;
            
        var hashIndex = _url.indexOf("#", domainIndex);
        if (hashIndex != -1) self.hash = _url.slice(hashIndex+1);
        else hashIndex = _url.length;
            
        var uri = _url.slice(domainIndex, hashIndex);
        var qsIndex = uri.indexOf('?');
        if (qsIndex == -1) qsIndex=uri.length;

        self.path = uri.slice(0, qsIndex);
        self.qs = uri.slice(qsIndex+1);
        if (self.path == "") self.path = "/";
            
        var domain = _url.slice(protocolIndex+3, domainIndex);
        var portIndex = domain.indexOf(":");
        if (portIndex == -1) {
            self.port = 80;
            portIndex = domain.length;
        }
        else {
            self.port = parseInt(domain.slice(portIndex+1));
        }
        if (isNaN(this.port)) throw new Error("Invalid _url");
            
        self.domain = domain.slice(0, portIndex);

        self.render = function() {
            var output = "";
            if (typeof(self.protocol) != "undefined")
            output += self.protocol + "://";
            output += self.domain;
            if (self.port != 80 && typeof(self.port) != "undefined" && self.port != null)
            if (typeof(self.port) != "string" || self.port.length > 0)
                output += ":" + self.port;
            if (typeof(self.path) == "undefined" || self.path == null)
            output += '/';
            else
            output += self.path;
            if (self.qs.length > 0)
            output += '?' + self.qs;
            if (typeof(self.hash) != "undefined" && self.hash.length > 0)
            output += "#" + self.hash;
            return output;
        };
        self.isSamePort = function(_url) {
            _url = new Orbited.URL(_url);
            return _url.port == self.port;
        }
        self.isSameDomain = function(_url) {
            _url = new Orbited.URL(_url);
            
            if (!_url.domain || !self.domain)
            return true;
            return (_url.port == self.port && _url.domain == self.domain);
        };
        self.isSameParentDomain = function(_url) {
            _url = new Orbited.URL(_url);
            if (_url.domain == self.domain) {
            return true;
            }
            var orig_domain = _url.domain;
            var parts = document.domain.split('.');
            //      var orig_domain = document.domain
            for (var i = 0; i < parts.length-1; ++i) {
            var new_domain = parts.slice(i).join(".");
            if (orig_domain == new_domain)
                return true;
            }
            return false;
        };
        self.isSubDomain = function(_url) {
            _url = new Orbited.URL(_url);
            if (!_url.domain || !self.domain) {
                return false;
            }
            return (_url.port == self.port && self.domain.indexOf("."+_url.domain) > 0);
//            return (_url.port == self.port && _url.domain == self.domain.split('.').slice(1).join('.'));
        };
        var decodeQs = function(qs) {
            //      alert('a')
            if (qs.indexOf('=') == -1) return {};
            var result = {};
            var chunks = qs.split('&');
            for (var i = 0; i < chunks.length; ++i) {
            var cur = chunks[i];
            var pieces = cur.split('=');
            result[pieces[0]] = pieces[1];
            }
            return result;
        };
        var encodeQs = function(o) {
            var output = "";
            for (var key in o)
            output += "&" + key + "=" + o[key];
            return output.slice(1);
        };
        self.setQsParameter = function(key, val) {
            var curQsObj = decodeQs(self.qs);
            curQsObj[key] = val;
            self.qs = encodeQs(curQsObj);
        };

        self.mergeQs = function(qs) {
            var newQsObj = decodeQs(qs);
            for (key in newQsObj) {
            curQsObj[key] = newQsObj[key];
            }
        };
        self.removeQsParameter = function(key) {
            var curQsObj = decodeQs(self.qs);
            delete curQsObj[key];
            self.qs = encodeQs(curQsObj);
        };

        self.merge = function(targetUrl) {
            if (typeof(self.protocol) != "undefined" && self.protocol.length > 0) {
            self.protocol = targetUrl.protocol;
            }
            if (targetUrl.domain.length > 0) {
            self.domain = targetUrl.domain;
            self.port = targetUrl.port;
            }
            self.path = targetUrl.path;
            self.qs = targetUrl.qs;
            self.hash = targetUrl.hash;
        };

    };

    Orbited.utf8 = {};
    Orbited.utf8.decode = function(s) {
        var ret = [];
        var j = 0;
        function pad6(str) {
            while(str.length < 6) { str = "0" + str; } return str;
        }
        for (var i=0; i < s.length; i++) {
            if ((s.charCodeAt(i) & 0xf8) == 0xf0) {
                if (s.length -j < 4) { break; }
                j+=4;
                ret.push(String.fromCharCode(parseInt(
                    (s.charCodeAt(i) & 0x07).toString(2) +
                    pad6((s.charCodeAt(i+1) & 0x3f).toString(2)) +
                    pad6((s.charCodeAt(i+2) & 0x3f).toString(2)) +
                    pad6((s.charCodeAt(i+3) & 0x3f).toString(2))
                    , 2)));
                i += 3;
            } else if ((s.charCodeAt(i) & 0xf0) == 0xe0) {
                if (s.length -j < 3) { break; }
                j+=3;
                ret.push(String.fromCharCode(parseInt(
                    (s.charCodeAt(i) & 0x0f).toString(2) +
                    pad6((s.charCodeAt(i+1) & 0x3f).toString(2)) +
                    pad6((s.charCodeAt(i+2) & 0x3f).toString(2))
                    , 2)));
                i += 2;
            } else if ((s.charCodeAt(i) & 0xe0) == 0xc0) {
                if (s.length -j < 2) { break }
                j+=2;
                ret.push(String.fromCharCode(parseInt(
                    (s.charCodeAt(i) & 0x1f).toString(2) +
                    pad6((s.charCodeAt(i+1) & 0x3f).toString(2), 6)
                    , 2)));
                i += 1;
            } else {
                j+=1;
                ret.push(String.fromCharCode(s.charCodeAt(i)));
            }
        }
        return [ret.join(""), j];
    };
    
    // TODO rename to encode
    Orbited.utf8.encode = function(text) {
        var ret = [];

        function pad(str, len) {
            while(str.length < len) { str = "0" + str; } return str;
        }
        var e = String.fromCharCode;
        for (var i=0; i < text.length; i++) {
            var chr = text.charCodeAt(i);
            if (chr <= 0x7F) {
            ret.push(e(chr));
            } else if(chr <= 0x7FF) {
            var binary = pad(chr.toString(2), 11);
            ret.push(e(parseInt("110"    + binary.substr(0,5), 2)));
            ret.push(e(parseInt("10"    + binary.substr(5,6), 2)));
            } else if(chr <= 0xFFFF) {
            var binary = pad(chr.toString(2), 16);
            ret.push(e(parseInt("1110"    + binary.substr(0,4), 2)));
            ret.push(e(parseInt("10"    + binary.substr(4,6), 2)));
            ret.push(e(parseInt("10"    + binary.substr(10,6), 2)));
            } else if(chr <= 0x10FFFF) {
            var binary = pad(chr.toString(2), 21);
            ret.push(e(parseInt("11110" + binary.substr(0,3), 2)));
            ret.push(e(parseInt("10"    + binary.substr(3,6), 2)));
            ret.push(e(parseInt("10"    + binary.substr(9,6), 2)));
            ret.push(e(parseInt("10"    + binary.substr(15,6), 2)));
            }
        }
        return ret.join("");
    };

        /*
         * We create Orbited.JSON whether or not some other JSON
         * exists. This is because Orbited.JSON is compatible with
         * JSON.js (imported by xsdrBridge), whereas various other
         * JSONs, including the one that ships with Prototype, are
         * not, leading to dumb errors.
         *     -mario
         */

        Orbited.JSON = function () {

            function f(n) {
            // Format integers to have at least two digits.
            return n < 10 ? '0' + n : n;
            }

            Date.prototype.toJSON = function (key) {

            return this.getUTCFullYear()   + '-' +
                f(this.getUTCMonth() + 1) + '-' +
                f(this.getUTCDate())       + 'T' +
                f(this.getUTCHours())       + ':' +
                f(this.getUTCMinutes())   + ':' +
                f(this.getUTCSeconds())   + 'Z';
            };

            String.prototype.toJSON =
            Number.prototype.toJSON =
            Boolean.prototype.toJSON = function (key) {
                return this.valueOf();
            };

            var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
            escapeable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
            gap,
            indent,
            meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
            },
            rep;


            function quote(string) {
            
            // If the string contains no control characters, no quote characters, and no
            // backslash characters, then we can safely slap some quotes around it.
            // Otherwise we must also replace the offending characters with safe escape
            // sequences.
            
            escapeable.lastIndex = 0;
            return escapeable.test(string) ?
                '"' + string.replace(escapeable, function (a) {
                var c = meta[a];
                if (typeof c === 'string') {
                    return c;
                }
                return '\\u' + ('0000' +
                        (+(a.charCodeAt(0))).toString(16)).slice(-4);
                }) + '"' :
            '"' + string + '"';
            }
            

            function str(key, holder) {

            // Produce a string from holder[key].

            var i,        // The loop counter.
            k,        // The member key.
            v,        // The member value.
            length,
            mind = gap,
            partial,
            value = holder[key];

            // If the value has a toJSON method, call it to obtain a replacement value.

            if (value && typeof value === 'object' &&
                typeof value.toJSON === 'function') {
                value = value.toJSON(key);
            }

            // If we were called with a replacer function, then call the replacer to
            // obtain a replacement value.

            if (typeof rep === 'function') {
                value = rep.call(holder, key, value);
            }

            // What happens next depends on the value's type.

            switch (typeof value) {
            case 'string':
                return quote(value);

            case 'number':

                // JSON numbers must be finite. Encode non-finite numbers as null.

                return isFinite(value) ? String(value) : 'null';

            case 'boolean':
            case 'null':

                // If the value is a boolean or null, convert it to a string. Note:
                // typeof null does not produce 'null'. The case is included here in
                // the remote chance that this gets fixed someday.

                return String(value);

                // If the type is 'object', we might be dealing with an object or an array or
                // null.

            case 'object':

                // Due to a specification blunder in ECMAScript, typeof null is 'object',
                // so watch out for that case.

                if (!value) {
                return 'null';
                }

                // Make an array to hold the partial results of stringifying this object value.

                gap += indent;
                partial = [];

                // If the object has a dontEnum length property, we'll treat it as an array.

                if (typeof value.length === 'number' &&
                !(value.propertyIsEnumerable('length'))) {

                // The object is an array. Stringify every element. Use null as a placeholder
                // for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }

                // Join all of the elements together, separated with commas, and wrap them in
                // brackets.

                v = partial.length === 0 ? '[]' :
                    gap ? '[\n' + gap +
                    partial.join(',\n' + gap) + '\n' +
                    mind + ']' :
                    '[' + partial.join(',') + ']';
                gap = mind;
                return v;
                }

                // If the replacer is an array, use it to select the members to be stringified.

                if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    k = rep[i];
                    if (typeof k === 'string') {
                    v = str(k, value);
                    if (v) {
                        partial.push(quote(k) + (gap ? ': ' : ':') + v);
                    }
                    }
                }
                } else {

                // Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.hasOwnProperty.call(value, k)) {
                    v = str(k, value);
                    if (v) {
                        partial.push(quote(k) + (gap ? ': ' : ':') + v);
                    }
                    }
                }
                }

                // Join all of the member texts together, separated with commas,
                // and wrap them in braces.

                v = partial.length === 0 ? '{}' :
                gap ? '{\n' + gap + partial.join(',\n' + gap) + '\n' +
                mind + '}' : '{' + partial.join(',') + '}';
                gap = mind;
                return v;
            }
            }

            // Return the JSON object containing the stringify and parse methods.

            return {
            stringify: function (value, replacer, space) {

                // The stringify method takes a value and an optional replacer, and an optional
                // space parameter, and returns a JSON text. The replacer can be a function
                // that can replace values, or an array of strings that will select the keys.
                // A default replacer method can be provided. Use of the space parameter can
                // produce text that is more easily readable.

                var i;
                gap = '';
                indent = '';

                // If the space parameter is a number, make an indent string containing that
                // many spaces.

                if (typeof space === 'number') {
                for (i = 0; i < space; i += 1) {
                    indent += ' ';
                }

                // If the space parameter is a string, it will be used as the indent string.

                } else if (typeof space === 'string') {
                indent = space;
                }

                // If there is a replacer, it must be a function or an array.
                // Otherwise, throw an error.

                rep = replacer;
                if (replacer && typeof replacer !== 'function' &&
                (typeof replacer !== 'object' ||
                 typeof replacer.length !== 'number')) {
                throw new Error('JSON.stringify');
                }

                // Make a fake root object containing our value under the key of ''.
                // Return the result of stringifying the value.

                return str('', {'': value});
            },


            parse: function (text, reviver) {

                // The parse method takes a text and an optional reviver function, and returns
                // a JavaScript value if the text is a valid JSON text.

                var j;

                function walk(holder, key) {

                // The walk method is used to recursively walk the resulting structure so
                // that modifications can be made.

                var k, v, value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                    if (Object.hasOwnProperty.call(value, k)) {
                        v = walk(value, k);
                        if (v !== undefined) {
                        value[k] = v;
                        } else {
                        delete value[k];
                        }
                    }
                    }
                }
                return reviver.call(holder, key, value);
                }


                // Parsing happens in four stages. In the first stage, we replace certain
                // Unicode characters with escape sequences. JavaScript handles many characters
                // incorrectly, either silently deleting them, or treating them as line endings.

                cx.lastIndex = 0;
                if (cx.test(text)) {
                text = text.replace(cx, function (a) {
                    return '\\u' + ('0000' +
                            (+(a.charCodeAt(0))).toString(16)).slice(-4);
                });
                }

                // In the second stage, we run the text against regular expressions that look
                // for non-JSON patterns. We are especially concerned with '()' and 'new'
                // because they can cause invocation, and '=' because it can cause mutation.
                // But just to be safe, we want to reject all unexpected forms.

                // We split the second stage into 4 regexp operations in order to work around
                // crippling inefficiencies in IE's and Safari's regexp engines. First we
                // replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
                // replace all simple value tokens with ']' characters. Third, we delete all
                // open brackets that follow a colon or comma or that begin the text. Finally,
                // we look to see that the remaining characters are only whitespace or ']' or
                // ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

                if (/^[\],:{}\s]*$/.
                test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@').
replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
                             replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

                    // In the third stage we use the eval function to compile the text into a
                    // JavaScript structure. The '{' operator is subject to a syntactic ambiguity
                    // in JavaScript: it can begin a block or an object literal. We wrap the text
                    // in parens to eliminate the ambiguity.

                    j = eval('(' + text + ')');

                    // In the optional fourth stage, we recursively walk the new structure, passing
                    // each name/value pair to a reviver function for possible transformation.

                    return typeof reviver === 'function' ?
                    walk({'': j}, '') : j;
                }

                          // If the text is not JSON parseable, then a SyntaxError is thrown.

                          throw new SyntaxError('JSON.parse');
                         }
                    };
                   }();
            })();


        // Try to auto detect the Orbited port and hostname
        (function() {
            try {
            var scripts = document.getElementsByTagName('script');
            for (var i = 0; i < scripts.length; ++i) {
                var script = scripts[i];
                if (script.src.match('/static/Orbited\.js$')) {
                var url = new Orbited.URL(script.src);
                if (url.render().indexOf('http') != 0) {
                    var url = new Orbited.URL(window.location.toString());
                }
                Orbited.settings.hostname = url.domain;
                Orbited.settings.port = url.port;
                break;
                }
            }
            } catch(e) {
            //    alert("Error! " + e.name + ": " + e.message);
            }
        })();
        
