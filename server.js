function line(){
    console.log("------------------------------------------------------------------");
}
line();
function getIP(req){
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    ip = ip.split("");
    ip.splice(0,7);
    ip = ip.join("");
    return ip
}
const app = require('express')();
const cors = require('cors');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const bodyParser = require('body-parser');
const uuid = require('uuid/v4');
const mysql = require('mysql');
const fs = require('fs');
const _ = require("lodash");
const blockednpm = require("blocked");
console.log("Server Initialised Correctly");
line();
server.listen(3000);
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
blockednpm(function(ms){
    console.log('BLOCKED FOR %sms', ms | 0);
});
var connections = [];
var blocked = [];
var tempBlock = [];
var requests = [];
fs.readFile("blocked.txt", "utf8",function(error,data){
    if(error){
        return console.log(error);
    } else if(data.length > 0){
        data = _.trimEnd(data, ',');
        blocked = data.split(",")
        if(blocked[0] != ""){
            console.log("Blocked IPs")
            for(var i = 0;i<blocked.length;i++){
                console.log(blocked[i])
            }
            line();
        }
    }
});
var mysqlConnection = mysql.createConnection({
    host        : "localhost",
    user        : "admin",
    password    : "admin",
    database    : "desk",
});

app.get("/connect", function(req,res){
    tempUUID = uuid();
    connections.push({
        uuid: tempUUID,
    });
    res.send(tempUUID);
    res.end();
});
app.post("/disconnect", function(req, res){
    for(var i=0;i<connections.length;i++){
        if(connections[i].uuid == req.body.uuid){
            connections.splice(i,1);
            break;
        }
    }
    res.end();
});
app.get("/getStaff", function(req, res){
    mysqlConnection.query("SELECT s.id, s.name, s.desk_id FROM staff s ORDER BY `name`", function(error,results,fields){
        if(error){
            console.log(error)
            res.status(404);
            res.send(error);
            res.end();
            return;
        }
        for(var i=0;i<results.length;i++){
            results[i].deskId = results[i].desk_id
            delete results[i].desk_id
        }
        res.send(results);
        res.end();
    });
});
app.get("/getDesks", function(req, res){
    mysqlConnection.query("SELECT d.id, d.desk_code FROM desks d", function(error,results,fields){
        if(error){
            console.log(error)
            res.status(404);
            res.send(error);
            res.end();
            return;
        }
        for(var i=0;i<results.length;i++){
            results[i].deskCode = results[i].desk_code
            delete results[i].desk_code
        }
        res.send(results);
        res.end();
    });
});
