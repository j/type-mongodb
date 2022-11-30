#!/bin/bash

: "${MONGODB_VERSION:=6.0.3}"
: "${MONGODB_PORT:=27017}"

if [[ $1 = "stop" ]]
then
  echo "Stopping MongoDB..."
  mlaunch stop --dir ~/.mongodb/data
elif [[ $1 = "init" ]]
then
  echo "Starting MongoDB ${MONGODB_VERSION}..."
  npm install -g m && m $MONGODB_VERSION
  mkdir -p ~/.mongodb/data/replicaset
  mlaunch init \
    --dir ~/.mongodb/data \
    --bind_ip 0.0.0.0 \
    --replicaset \
    --name replicaset \
    --nodes 2 --arbiter \
    --port $MONGODB_PORT \
    --enableMajorityReadConcern on \
    --binarypath `m bin $MONGODB_VERSION` \
    /
elif [[ $1 = "start" ]]
then
  echo "Starting MongoDB ${MONGODB_VERSION}..."
  mlaunch start --dir ~/.mongodb/data
elif [[ $1 = "list" ]]
then
  mlaunch list --dir ~/.mongodb/data
elif [[ $1 = "kill" ]]
then
  mlaunch kill --dir ~/.mongodb/data
else
  echo "Usage mongodb.sh {init | start | stop | list | kill}..."
  exit 1;
fi

