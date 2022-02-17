#!/usr/bin/node
//
// A simple Twitter bot that uses the 'statuses/filter' Twitter API endpoint
// in order to retweet tweets from users with enough followers.
//
// TODO: API Error handling.
// 
var colors = require('colors');
var Twit = require('twit');
var config = require('./filterAndRetweetBotConfig.js');
var T = new Twit(config);

//////////////
// API call //
//////////////
var stream = T.stream('statuses/filter', { track: 'climatechange, climate change, bullshitjobs, bullshit jobs, davidgraeber, david graeber' }); // the streaming app does not seem to support quoted search phrases

stream.on('limit', function (limitMessage) {
  console.log(JSON.stringify(limitMessage));
});

stream.on('disconnect', function (disconnectMessage) {
  console.log(JSON.stringify(disconnectMessage));
})

stream.on('tweet', function (tweet) {
  
  var tweetText = typeof tweet.extended_tweet !== 'undefined' ? tweet.extended_tweet.full_text : tweet.text;
  //tweetText = utf8.encode(tweetText);
  tweetText = Buffer.from(tweetText, 'utf-8').toString();

  if(typeof tweet.retweeted_status !== 'undefined'){ return 1; }
  if(tweet.lang != 'en')                           { return 1; }
  if(tweet.user.followers_count < 2000)            { return 1; }

  // see: https://stackoverflow.com/questions/2304632/regex-for-twitter-username#comment81834127_13396934
  // see: https://github.com/twitter/twitter-text/tree/master/js
  const usernamesRegex     = new RegExp(/(^|[^\w@/\!?=&])@(\w{1,15})\b/, 'ig');
  const hashTagRegex       = new RegExp(/(^|[^\w#/\!?=&])#(\w{1,15})\b/, 'ig');  

  const climateRegex1      = new RegExp(/(climate(?:[\s\_\-])?change)/,  'ig');
  const bullshitjobsRegex1 = new RegExp(/(bullshit(?:[\s\_\-])?jobs)/,   'ig');
  const davidGraeberRegex1 = new RegExp(/(david(?:[\s\_\-])?graeber)/,   'ig');
  
  var tweetTextNoUsers = tweetText.replace(usernamesRegex, '');
  
  var bullshitjobsMatches = 0;
  var climateMatches      = 0;
  var davidGraeberMatches = 0;
  if(     climateRegex1.test(tweetTextNoUsers)){      climateMatches++; }
  if(bullshitjobsRegex1.test(tweetTextNoUsers)){ bullshitjobsMatches++; }
  if(davidGraeberRegex1.test(tweetTextNoUsers)){ davidGraeberMatches++; }

  if(bullshitjobsMatches > 0 || davidGraeberMatches > 0 || climateMatches > 0){

    var tweetUrl      = 'https://twitter.com/' + tweet.user.screen_name + '/status/' + tweet.id_str;
    var tweetUrlPrint = 'https://twitter.com/' + tweet.user.screen_name.magenta + '/status/' + tweet.id_str.yellow;

    var reaction = 'NONE   ';
    if(bullshitjobsMatches > 0){
      reaction   = 'RETWEET'.magenta;
    }else if(davidGraeberMatches > 0){
      reaction   = 'LIKE   '.cyan;
    }
  
    var screenName = tweet.user.screen_name;
    if(tweet.user.verified){
      screenName = screenName.yellow;
    }  

    var tweetTextShort = tweetText.substr(0, 160);  
    tweetTextShort = tweetTextShort.replace(usernamesRegex,     function(m){ return colors.cyan(m);    });
    tweetTextShort = tweetTextShort.replace(hashTagRegex,       function(m){ return colors.cyan(m);    });
    tweetTextShort = tweetTextShort.replace(climateRegex1,      function(m){ return colors.green(m);   });
    tweetTextShort = tweetTextShort.replace(bullshitjobsRegex1, function(m){ return colors.magenta(m); });
    tweetTextShort = tweetTextShort.replace(davidGraeberRegex1, function(m){ return colors.yellow(m);  });
    
    const newlineRegex = new RegExp(/\r?\n|\r/, 'g')
    var tweetTextShortPrint = tweetTextShort.replace(newlineRegex, ' ');

    var out  = '[' + tweet.created_at.cyan + '] ';
        out += reaction + ' | '
        out += tweetUrlPrint + ' '.repeat(64-tweetUrl.length) + ' | ';
        out += ' '.repeat(16-tweet.user.screen_name.length) + screenName + ' (' + String(tweet.user.followers_count).padStart(8, ' ') + ') | ';
        out += tweetTextShortPrint;
    console.log(out);
    
    if(bullshitjobsMatches > 0){
      
      ///////////////
      // <retweet> //
      
      //////////////
      // API call //
      //////////////
      T.post('statuses/retweet', { id: tweet.id_str }, retweeted)
      function retweeted(err, data, response) {
        if (err) {
          console.log('Error: ' + err.message);
        } else {
          //console.log('Success: ' + tweet.id_str);
        }
      }
      // </retweet> //
      ////////////////
      
    }else if(davidGraeberMatches > 0){
      
      ////////////
      // <like> //

      ///////////////
      /// API call //
      ///////////////
      T.post('favorites/create', { id: tweet.id_str }, liked)
      function liked(err, data, response) {
        if(err === undefined && data == ''){
          console.log('RATE LIMIT!');
        }else if (err) {
          console.log('Error: ' + err.message);
        } else {
          //console.log('Success: ' + tweet.id_str);
        }
      }
      // </like> //
      /////////////
    
    }

  }
})