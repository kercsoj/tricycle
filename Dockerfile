FROM httpd:2.4
COPY *.js /usr/local/apache2/htdocs/
COPY assets/ /usr/local/apache2/htdocs/
COPY style.css /usr/local/apache2/htdocs/
COPY index.html /usr/local/apache2/htdocs/
