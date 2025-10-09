#!/bin/bash

MONGODB1=mongo1
MONGODB2=mongo2
MONGODB3=mongo3

echo "**********************************************"
echo "Waiting for MongoDB instances to be ready..."
for HOST in ${MONGODB1} ${MONGODB2} ${MONGODB3}; do
    until curl http://${HOST}:27017/serverStatus\?text\=1 2>&1 | grep uptime | head -1; do
        printf '.'
        sleep 1
    done
    echo "${HOST} is ready."
done

echo "**********************************************"
echo "SETUP.sh time now: `date +"%T"`"

mongosh --host ${MONGODB1}:27017 <<EOF
var cfg = {
    "_id": "rs0",
    "protocolVersion": 1,
    "version": 1,
    "members": [
        { "_id": 0, "host": "${MONGODB1}:27017", "priority": 2 },
        { "_id": 1, "host": "${MONGODB2}:27017", "priority": 0 },
        { "_id": 2, "host": "${MONGODB3}:27017", "priority": 0 }
    ],
    settings: { chainingAllowed: true }
};
rs.initiate(cfg);
db.getMongo().setReadPref('nearest');
EOF

if [ $? -eq 0 ]; then
    echo "Replica set initialized successfully."
else
    echo "Replica set initialization failed!"
    exit 1
fi
