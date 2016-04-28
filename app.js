var parseString = require('xml2js').parseString,
    request = require('request'),
    auth = require('http-auth'),
    _ = require("underscore")._,
    https = require('https'),
    cron = require('cron'),
    express = require('express'),
    scribe = require('scribe-js')(),
    app = express(),
    console = process.console;

var basicAuth = auth.basic({
  realm: "ScribeJS WebPanel",
  file: __dirname + "/users.htpasswd"
});


app.use('/logs', auth.connect(basicAuth), scribe.webPanel());

app.get('/', function (req, res) {
    // redirects to log to show all logs.
    res.redirect("/logs");
});


// message predefined structure just missing is text
var message = { 
  app_id: "c4ec5a38-cefa-42a1-9783-c103cf6d96fb",
  headings: {"en": "PlayWin Notifications"},
  small_icon: "notification",
  large_icon: "icon"
};


// the notitifaction sheet with all game id & names
var notifyScheduleSheet = [
  {"GameID" : 1,"Game_Name" : "Thursday Super Lotto"},
  {"GameID" : 2,"Game_Name" : "ThunderBall"},
  {"GameID" : 3,"Game_Name" : "Fast Digit Lottery"},
  {"GameID" : 4,"Game_Name" : "Saturday Super Lotto"},
  {"GameID" : 5,"Game_Name" : "Jaldi 5 Lottery"},
  {"GameID" : 9,"Game_Name" : "Playwin Keno"},
  {"GameID" : 11,"Game_Name" : "Jaldi 5 double lotto"},
]



// cron to run everyday morning at 9:30
var cronJobGame = cron.job("0 30 09 * * *", function(){
  switch(new Date().getDay()){
    case 0:
      // log.debug('Sunday case notification triggered');
      //sendPushForGame(11);
    break;
    case 1:
      // log.debug('Monday case notification triggered');
      //sendPushForGame(9);
    break;
    case 2:
      console.info('Tuesday case notification triggered at '+new Date());
      sendPushForGame(2);
    break;
    case 3:
      console.info('Wednesday case notification triggered at '+new Date());
      sendPushForGame(11);
    break;
    case 4:
      console.info('Thursday case notification triggered at '+new Date());
      sendPushForGame(1);
    break;
    case 5:
      console.info('Friday case notification triggered at '+new Date());
      sendPushForGame(5);
    break;
    case 6:
      console.info('Saturday case notification triggered at '+new Date());
      sendPushForGame(4);
    break;
  }
}); 


var cronJobResults = cron.job("*/2 * * * * *", function(){
  sendPushForResults(getDateForCheck());
}); 

// get formatted date for result push notification
function getDateForCheck(){
  var date = new Date();
  var dt = (date.getDate().toString().length > 1) ? date.getDate().toString() : "0"+date.getDate().toString();
  var mn = (date.getMonth().toString().length > 1) ? date.getMonth().toString() : "0"+date.getMonth().toString();
  var yr = (date.getFullYear().toString().length > 1) ? date.getFullYear().toString() : "0"+date.getFullYear().toString();
  var hrs = (date.getHours().toString().length > 1) ? date.getHours().toString() : "0"+date.getHours().toString();
  var min = (date.getMinutes().toString().length > 1) ? date.getMinutes().toString() : "0"+date.getMinutes().toString();
  return(dt + "/" + mn + "/" + yr + " " + hrs + ":" + min+":00");
}

// get reuslt and match with our date if matches fire the notification
function sendPushForResults(datestmp){
  request('https://www.myplaywin.com/PlaywinResultXML.aspx', function (error, response, body) {
    if (!error && response.statusCode == 200) {
      parseString(body, function (err, result) {
        var respData = _.find(result.Results.GameResult, function(data){return data.DrawDate[0] == datestmp ;});
        if(respData != undefined){
          console.info("Sending result >>>> "+respData.Game[0]+" -- "+respData.Result[0]+" -- "+respData.DrawDate[0]+" -- "+respData.NextDrawDate[0]+" -- "+respData.NextFirstPrize[0]+" -- "+respData.FirstPrizeHit[0]);
          message.contents = {"en": "Today's "+respData.Game[0]+"\nResult "+respData.DrawDate[0]+" : "+respData.Result[0]+"\nFirst prize "+ ((respData.FirstPrizeHit[0] == "No") ? "Not Hit" : "Hit")+"\nNext draw of Rs "+respData.NextFirstPrize[0]+" on "+respData.NextDrawDate[0]},
          sendNotification(message);
        }
      });
    }
  });
}

// get the playwin game listing info & create messgae as per game id & fire notification.
function sendPushForGame(id){
  request('https://www.myplaywin.com/PlaywinDrawXML.aspx?GameID=0', function (error, response, body) {
    if (!error && response.statusCode == 200) {
      parseString(body, function (err, result) {
        var game_data = _.find(result.Draws.Draw, function(data){return data.GameID[0] == id; });
        var gameName = _.findWhere(notifyScheduleSheet,{"GameID":id}).Game_Name;
        console.info("push daily notification debug >>>> Sending notification for game %s of amount %s",gameName,game_data.JackpotAmount[0]);
        message.contents = {"en": "Play the Game "+gameName+" and you can win "+game_data.JackpotAmount[0]},
        sendNotification(message);
      });
    }
  });
}

// core function to send notification
var sendNotification = function(data) {
  var headers = {
    "Content-Type": "application/json",
    "Authorization": "Basic YWE1OWY3MjYtNzNkNy00YjhiLThjNjMtNTU1M2NkNzU0YmFj"
  };
  var options = {
    host: "onesignal.com",
    port: 443,
    path: "/api/v1/notifications",
    method: "POST",
    headers: headers
  };
  var req = https.request(options, function(res) {  
    res.on('data', function(data) {
    });
  });
  req.on('error', function(e) {
    console.info("Push Error >>>>> "+JSON.stringify(e));
  });
  console.info("Push Response >>>>> "+JSON.stringify(data))
  req.end();
};

// start express at 5020
app.listen(5020, function () {
  console.log('Example app listening on port 9500!');
  console.info("starting cronJob for Game Notifications");
  cronJobGame.start();

  console.info("starting cronJob for Results Notifications");
  cronJobResults.start();
});

