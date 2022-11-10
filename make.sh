#!/bin/sh
docker build -t tricycle:v1.0 .
docker run -dit --name tricycle-app -p 8080:80 tricycle