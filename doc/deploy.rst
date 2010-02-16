How to deploy Hotdot
====================

TODO: add much more info here.


Nginx as frontend webserver
---------------------------

Example nginx.conf entry::

    server {
        listen 80;
        server_name example.org;
 
        access_log /var/log/nginx/hotdot-access.log;
 
        location /static {
            alias /var/www/hotdot/;
        }
 
        location /tcp {
            proxy_pass http://127.0.0.1:8000/tcp;
            proxy_buffering off;
            tcp_nodelay on;
        }

        location / {
            proxy_pass http://127.0.0.1:8000/;
            proxy_redirect off;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            client_max_body_size 100m;
            client_body_buffer_size 128k;
            proxy_connect_timeout 90;
            proxy_send_timeout 90;
            proxy_read_timeout 90;
            proxy_buffer_size 4k;
            proxy_buffers 4 32k;
            proxy_busy_buffers_size 64k;
            proxy_temp_file_write_size 64k;
        }
    }
    #Example thanks to Skylar Saveland (http://github.com/skyl)
