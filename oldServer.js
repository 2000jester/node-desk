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
//console.log('Express successful')
const cors = require('cors');
// console.log('Cors successful')
const server = require('http').createServer(app);
// console.log('HTTP successful')
const io = require('socket.io')(server);
// console.log('Socket.io successful')
const bodyParser = require('body-parser');
// console.log('Body-parser successful')
const uuid = require('uuid/v4');
// console.log('UUID/v4 successful')
const mysql = require('mysql');
// console.log('MYSQL successful')
const fs = require('fs');
// console.log('FS successful');
const _ = require("lodash");
// console.log('Lodash successful');
const blockednpm = require("blocked");
console.log("Server Initialised Correctly");
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
line();
var connections = [];
var blocked = [];
var tempBlock = [];
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
var requests = ["XXX"];
var mysqlConnection = mysql.createConnection({
    host        : "localhost",
    user        : "admin",
    password    : "admin",
    database    : "desk",
});
function validate(results, desks, uuid, req){
    for(var i = 0; i<results.length;i++){
        results[i] = parseInt(results[i].id)
    }
    if(typeof desks === 'undefined'){
        console.trace(desks)
    }
    for(var i=0;i<desks.length;i++){
        if(results.indexOf(parseInt(desks[i].new_desk_id)) == -1){
            console.log("ERROR, did not update")
            return
        }
    }
    if(blocked.indexOf(getIP(req)) >= 0){
        return
    }
    if(tempBlock.indexOf(getIP(req)) >= 0){
        return
    }
    for(var i = 0;i<desks.length;i++){
        for(var j = 0 ;j<desks.length;j++){
            if(i != j && desks[i].new_desk_id == desks[j].new_desk_id){
                return
            }
        }
    }
    var promises = [];
    for(var i = 0; i<desks.length;i++){
        var myPromise = new Promise((resolve,reject) => {
            var sql = "UPDATE staff SET desk_id = ? WHERE id = ?";
            var inserts = [desks[i].new_desk_id, desks[i].staff_id];
            sql = mysqlConnection.format(sql, inserts);
            mysqlConnection.query(sql, function(error,qResults,fields){
                if(error){
                    reject(error); return;
                }
                resolve(qResults);
            });
        });
        promises.push(myPromise);
    }
    Promise.all(promises)
        .then(qResults => {
            io.emit('change', uuid);
        })
        .catch(err => {
            console.log(err)
        });
    io.emit("enableSubmit");
};
function getDesks(desks,uuid, req){
    mysqlConnection.query("SELECT d.id, d.desk_code FROM desks d", function(error,results,fields){
        if(error){
            console.log(error)
            res.status(404);
            res.send(error);
            res.end();
            return;
        }
        validate(results, desks, uuid, req);
    });
};
app.post("/sendDataToDataBase", function(req,res){
    var data = req.body
    var uuid = data.uuid;
    data = data.values;
    for(var i =0;i<9999999;i++){
        
    }
    ip = getIP(req);
    var needPush = true;
    for(var i=1;i<requests.length;i++){
        if(requests[i].ip == ip && blocked.indexOf(ip) == -1 && tempBlock.indexOf(ip) == -1){
            if(Date.now()-requests[i].last<500){
                requests[i].smallOffenses++
            }
            if(requests[i].smallOffenses > 4 && tempBlock.indexOf(ip) == -1){
                console.log("IP: "+ip+" has been banned for 3 minutes")
                line();
                requests[i].offenses++
                tempBlock.push(ip)
                setTimeout(function(){
                    console.log("IP: "+ip+" has been allowed access")
                    line();
                    tempBlock.splice(tempBlock.indexOf(ip),1)
                }, 180000)//3 mins
            }
            if(requests[i].offenses > 4 && blocked.indexOf(ip) == -1){
                blocked.push(ip)
                console.log("IP: "+ip+" has been blocked")
                line();
                var stringToBeWritten = "";
                for(var i = 0;i<blocked.length;i++){
                    stringToBeWritten = stringToBeWritten + blocked[i] + ","
                }
                fs.writeFile("blocked.txt", stringToBeWritten, function(error){
                    if(error){
                        return console.log(error)
                    }
                })
            }
            requests[i].last = Date.now()
            needPush = false;
        }
    }
    if(needPush == true){
        requests.push({
            ip: ip,
            last: Date.now(),
            offenses: 0,
            smallOffenses: 0,
        });
    }
    if(blocked.indexOf(ip) == -1 && tempBlock.indexOf(ip) == -1){
        getDesks(data,uuid, req);
    }
    res.end();
});
app.post("/connect",function(req, res){
    tempUUID = uuid();
    connections.push({
        username: req.body.username,
        uuid: tempUUID,
    });
    res.send(tempUUID);
    console.log("New Connection : "+tempUUID)
    line();
    res.end();
});
app.post("/disconnect",function(req, res){
    for(var i = 0;i<connections.length;i++){
        if(connections[i].uuid == req.body.uuid){
            console.log("User Disconnected : "+connections[i].username)
            line();
            var tempDisconnect = connections.splice(i,1);
            break;
        }
    }
    res.end();
});
app.get("/getStaff",function(req, res){
    mysqlConnection.query("SELECT s.id, s.name, s.desk_id FROM staff s ORDER BY `name`", function(error,results,fields){
        if(error){
            console.log(error)
            res.status(404);
            res.send(error);
            res.end();
            return;
        }
        res.send(results);
        res.end();
    });
});
app.get("/getDesks",function(req, res){
    mysqlConnection.query("SELECT d.id, d.desk_code FROM desks d", function(error,results,fields){
        if(error){
            console.log(error)
            res.status(404);
            res.send(error);
            res.end();
            return;
        }
        res.send(results);
        res.end();
    });
});

blockednpm(function(ms){
    console.log('BLOCKED FOR %sms', ms | 0);
});