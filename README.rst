Hotdot - Realtime webapp using Django + Orbited + Twisted
=========================================================


What is `Hotdot`?
-----------------
A very complete example of how to a create a
realtime web application using Django + Orbited + Twisted.

Currently the example is: 
*Realtime Voting Both: Collaborative Realtime Voting, Chatting, and Editing Polls.*


Is `Hotdot` a 'Realtime Web Framework'?
---------------------------------------
Not currently. Maybe it should turn into one? 

For comparison, consider Tornado (http://www.tornadoweb.org),
which is the 'realtime web framework' used to build FriendFeed.
Tornado is minimal and clean, and does include some very nice
features beyond just being a non-blocking webserver.

My proposition with `Hotdot` is that the combination of
Django, Orbited, and Twisted results in a more 
'full-featured realtime web framework', with a greater
community and total features, than can be found in Tornado.


How and Why?
------------
The combination of Django + Orbited + Twisted is everything
you need to make a 'real-world' realtime web application with Python.

Their roles:
    - Django: Excellent web framework for creating the backbone of a great web application.
    - Orbited: Realtime web (Comet) library to build the realtime components with.
    - Twisted: Scalable asynchronous network lib, for serving Orbited (and Django too, with WSGI!)

Other reasons for `Hotdot`: 
    - Incorporate core bits into http://codenode.org (http://github.com/codenode/codenode) to make it realtime.
    - My personal education on this awesome topic.


Install
-------
#. Recommended: Use a ``virtualenv`` and install with ``pip``, to get them type::

    easy_install virtualenv pip


#. Create a fresh ``virtualenv``::
    
    virtualenv --no-site-packages hotdot_env


#. Install dependencies into your ``virtualenv``::
    
    #You must have Django 1.0+ and Twisted 9.0+
    
    pip -E hotdot_env install django orbited twisted simplejson


#. Move into your ``virtualenv`` and `activate` it::
    
    $ cd hotdot_env
    $ source bin/activate


#. Get a copy of `Hotdot` from here::

    curl http://github.com/clemesha/hotdot/tarball/master

    #Or clone a copy:
    
    $ git clone git://github.com/clemesha/hotdot.git


Usage
-----
#. In the directory ``hotdot/djangoweb``, type::

    django-admin.py syncdb --pythonpath='.' --settings='settings'

#. In the toplevel directory ``hotdot``, type::

    twistd -ny server.py 

- Now open browser to http://localhost:8000/
- Also see config options in `server.py`.


Tests
-----
#. In the directory ``hotdot/djangoweb``, type::

    django-admin.py test --pythonpath='.' --settings='settings'


Details of how `Hotdot` works
-----------------------------
(WORK IN PROGRESS)

- Orbited as a Twisted Service
- Django running from twisted.web.wsgi
- Authentication using Twisted Cred+Django models
- Filtering + modification + logging of in-transit Orbited messages
- STOMP as the default, example protocol.


Why the name `Hotdot`?
----------------------
'Hot' as in the latest goodness.
'Dot' as in _D_jango + _O_rbited + _T_wisted.


License, Questions, Contact
---------------------------
`Hotdot` is licensed under the BSD.
Please fork a copy here!: http://github.com/clemesha/hotdot
Contact: Alex Clemesha <alex@clemesha.org> | http://twitter.com/clemesha
