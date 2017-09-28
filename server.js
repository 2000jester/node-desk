function line(){
    console.log("------------------------------------------------------------------");
}
line();
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
// blockednpm(function(ms){
    // console.log('BLOCKED FOR %sms', ms | 0);
// });
var connections = [];
var blocked = [];
var tempBlock = [];
var requests = [];
var dataBaseDetails = null;
fs.readFile("data/blocked.txt", "utf8",function(error,data){
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
fs.readFile("data/dataBaseDetails.txt", "utf8",function(error,data){
    if(error){
        return console.log(error);
    } else {
        dataBaseDetails = JSON.parse(data);
    }
});
console.log(dataBaseDetails);
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
    prepareDesks().then(function(tempDesks){
        res.send(tempDesks);
        res.end();
    });
});
app.post("/sendDataToDataBase", function(req, res){
    var dataToBeSent = req.body;
    var uuid = dataToBeSent.uuid;
    dataToBeSent = dataToBeSent.values;
    var ip = getIP(req);
    checkBlock(ip);
    if(blocked.indexOf(ip) == -1 && tempBlock.indexOf(ip) == -1){
        prepareDesks().then(function(tempDesks){
            if(validateBeforeSubmission(tempDesks, dataToBeSent, ip)){
                submitToDataBase(dataToBeSent, uuid);
            }
        });
    }
    res.end();
});
function submitToDataBase(valuesToSubmit, uuid){
    var promises = [];
    for(var i=0;i<valuesToSubmit.length;i++){
        var myPromise = new Promise((resolve,reject) => {
            var sql = "UPDATE staff SET desk_id = ? WHERE id = ?";
            var inserts = [valuesToSubmit[i].newDeskId, valuesToSubmit[i].staffId];
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
}
function validateBeforeSubmission(referenceValues, valuesToSubmit, ip){
    for(var i = 0; i<referenceValues.length;i++){
        referenceValues[i] = parseInt(referenceValues[i].id)
    }
    for(var i=0;i<valuesToSubmit.length;i++){
        if(referenceValues.indexOf(parseInt(valuesToSubmit[i].newDeskId)) == -1){
            return false;
        }
    }
    if(blocked.indexOf(ip) > -1 || tempBlock.indexOf(ip) > -1){
        return false;
    }
    for(var i=0;i<valuesToSubmit.length;i++){
        for(var j=0;j<valuesToSubmit.length;j++){
            if(i != j && valuesToSubmit[i].newDeskId == valuesToSubmit[j].newDeskId){
                return false;
            }
        }
    }
    return true;
}
function prepareDesks(){
    return new Promise((resolve, reject) => {
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
            resolve(results);
        });
    })
}
function checkBlock(ip){
    var needPush = true;
    for(var i=0;i<requests.length;i++){
        if(requests[i].ip == ip && blocked.indexOf(ip) == -1 && tempBlock.indexOf(ip) == -1){
            if(Date.now() - requests[i].last<500){
                requests[i].smallOffenses++;
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
                fs.writeFile("data/blocked.txt", stringToBeWritten, function(error){
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
};
function getIP(req){
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    ip = ip.split("");
    ip.splice(0,7);
    ip = ip.join("");
    return ip
};