Hotdot - Hot realtime webapps using Django + Orbited + Twisted
==============================================================


What is Hotdot?
---------------
A *very* complete example of how to a create a
realtime web application using Django + Orbited + Twisted.

Currently the example is: 
"Realtime Voting Both - Realtime Voting, Chatting, and Editing Polls."


Why?
----
The combination of Django + Orbited + Twisted is everything
you need to make a "real-world" realtime web application with Python.

Their roles:
    - Django: Excellent web framework for creating the backbone of a great web application.
    - Orbited: Realtime web (Comet) library to build the realtime components with.
    - Twisted: Scalable asynchronous network lib, for serving Orbited (and Django too, with WSGI!)


Other reasons for Hotdot: 
    - Incorporate core bits into http://codenode.org (http://github.com/codenode/codenode) to make it realtime.
    - My personal education on this awesome topic.


Install
-------
Recommend: Use a `virtualenv`.

*IMPORTANT*: You must currently use the Twisted trunk.

Get the Twisted Trunk and install into your `virtualenv`:
    $ svn co svn://svn.twistedmatrix.com/svn/Twisted/trunk TwistedTrunk

Install deps into your `virtualenv`:
    $ pip -E myvirtenv install orbited django


Usage
-----
In the directory 'djangoweb', type:
    $ django-admin.py syncdb --pythonpath='.' --settings='settings'

See config options in `server.py`, then run:
    $ twistd -ny server.py #open browser to http://localhost:8000/


Tests
-----
In the directory 'djangoweb', type:
    $ django-admin.py test --pythonpath='.' --settings='settings'


The details
-----------
TODO
- Core components to run Orbited as a Twisted Service, using STOMP as the example protocol.



Why the name "Hotdot"?
----------------------
"Hot" as in the latest goodness.
"Dot" as in _D_jango + _O_rbited + _T_wisted.


License, Questions, Contact
---------------------------
Hotdot is licensed under the BSD.
Questions? Contact: Alex Clemesha <alex@clemesha.org> | http://twitter.com/clemesha
