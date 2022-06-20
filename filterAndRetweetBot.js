#!/usr/bin/node
//
// A simple Twitter bot that uses the 'statuses/filter' Twitter API endpoint
// in order to retweet tweets from users with enough followers.
//
// TODO: API Error handling.
// 
var colors = require('colors');
var Twit = require('twit');
var credentials = require('./filterAndRetweetBotConfig.js');

var argv = require('yargs/yargs')(process.argv.slice(2))
    .usage('Usage: $0 --profile=<name of profile>')
    .demandOption(['profile'])
    .argv;

var twitterUser;
var minFollowers;
var track;

var ignoreRepliesBy = {
  '3308920474': 'bullshitjobs',
}

var ignoreEverythingBy = {

             '14446807' : 'thatinterlace',
             '14617332' : 'figgityfigs',
             '65493023' : 'SarahPalinUSA',
             '88174963' : 'csdrake',
            '136080626' : 'golikehellmachi',
            '187719856' : 'draglikepull',            
            '319988364' : 'AlexGodofsky',
            '397782926' : 'hillelogram',
            '398413123' : 'cojobrien',
            '410151321' : 'Chican3ry',
            '599755262' : 'blairreeves',
            '823328503' : 'matthewdownhour',            
            '892767878' : 'nikicaga',
            '896384784' : 'StephenPiment',
           '1254412448' : 'BeijingPalmer',
           '2725273267' : 'alth0u',
           '2900768928' : 'provisionalidea',
           '3315205122' : 'deepfates',
           '3419028987' : 'sgodofsk',
   '767323848161320965' : 'MonniauxD',
   '791112163507044353' : 'astratelates',
  '1019515949450514432' : 'gfmindset',
  '1237544283743432704' : 'powerbottomdad1',
  '1320344445288632321' : 'metakuna',
  '1352845902113869824' : 'CJackson818',
  '1364159160267530241' : 'linmanuelrwanda',
  '1418495302168891393' : 'tweets_of_oscar',
  '1431830721635753990' : 'lawyerbrandy',
  '1481645017726799888' : 'MonetaristMaia',
       
}

////////////
// CONFIG //
////////////

if(argv.profile === '_'){
	twitterUser = 'bullshitjobs_';
	minFollowers = 2000;
	track = 'climatechange, climate change, bullshitjobs, bullshit jobs, nonsense employment, davidgraeber, david graeber, basicincome, basic income'; // the streaming app does not seem to support quoted search phrases
}else if(argv.profile === '__'){
	twitterUser = 'bullshitjobs__';
  minFollowers = 2000;
  track = 'bullshitjobs, bullshit jobs, nonsense employment';
}else{
  console.log('Unknown profile "' + argv.profile + '" specified via the --profile command line option: ' + argv.profile + '. Aborting ...');
  process.exit(1);
}

if(!twitterUser in credentials){
	console.log('No credentials found for user: ' + twitterUser + '. Aborting ...');
  process.exit(1);
}
credentials = credentials[twitterUser];
var T = new Twit(credentials);

//////////////
// API call //
//////////////
var stream = T.stream('statuses/filter', { track: track}); 

stream.on('limit', function (limitMessage) {
  console.log(JSON.stringify(limitMessage));
});

stream.on('disconnect', function (disconnectMessage) {
  console.log(JSON.stringify(disconnectMessage));
})

stream.on('tweet', function (tweet) {
  
  var tweetText = typeof tweet.extended_tweet !== 'undefined' ? tweet.extended_tweet.full_text : tweet.text;
  tweetText = Buffer.from(tweetText, 'utf-8').toString();

  if(typeof tweet.retweeted_status !== 'undefined'){ return 1; }
  if(tweet.lang != 'en')                           { return 1; }
  if(tweet.user.followers_count < minFollowers)    { return 1; }

  // see: https://stackoverflow.com/questions/2304632/regex-for-twitter-username#comment81834127_13396934
  // see: https://github.com/twitter/twitter-text/tree/master/js
  const     usernamesRegex = new RegExp(/(^|[^\w@/\!?=&])@(\w{1,15})\b/, 'ig');
  const       hashTagRegex = new RegExp(/(^|[^\w#/\!?=&])#(\w{1,15})\b/, 'ig');

  const      climateRegex1 = new RegExp(/(climate(?:[\s\-])?change)/,  'ig');
  const bullshitjobsRegex1 = new RegExp(/(bullshit(?:[\s\-])?jobs)/,   'ig');
  const bullshitjobsRegex2 = new RegExp(/(nonsense[\s\-]employment)/,  'ig');
  const davidGraeberRegex1 = new RegExp(/(david(?:[\s\-])?graeber)/,   'ig');
  const  basicincomeRegex1 = new RegExp(/(basic[\s\-]income)/,  'ig');
  
  var tweetTextNoUsers = tweetText.replace(usernamesRegex, '');
  
  var bullshitjobsMatches = 0;
  var      climateMatches = 0;
  var davidGraeberMatches = 0;
  var  basicincomeMatches = 0;
  if(     climateRegex1.test(tweetTextNoUsers)){      climateMatches++; }
  if(bullshitjobsRegex1.test(tweetTextNoUsers)){ bullshitjobsMatches++; }
  if(bullshitjobsRegex2.test(tweetTextNoUsers)){ bullshitjobsMatches++; }
  if(davidGraeberRegex1.test(tweetTextNoUsers)){ davidGraeberMatches++; }
  if( basicincomeRegex1.test(tweetTextNoUsers)){  basicincomeMatches++; }

  if(bullshitjobsMatches > 0 || davidGraeberMatches > 0 || climateMatches > 0 || basicincomeMatches > 0){

    const unixTime = Date.parse(tweet.created_at);
    const dateObject = new Date(unixTime);

    var boolRetweet = false;
    var boolLike = false;
    
    var reaction = '   NONE';
    
    if(tweet.user.id_str in ignoreEverythingBy){
      reaction = ' IGNORE';
    }else if(tweet.in_reply_to_status_id_str !== null && tweet.user.id_str in ignoreRepliesBy){
      reaction = ' IGNORE';
    }else if(bullshitjobsMatches > 0){
      boolRetweet = true;
      reaction    = 'RETWEET'.magenta;
    //}else if(davidGraeberMatches > 0 || basicincomeMatches > 0){
    }else if(davidGraeberMatches > 0){
      //boolLike = true;
      reaction = '   LIKE'.cyan;
    }

    var tweetUrl      = 'https://twitter.com/' + tweet.user.screen_name + '/status/' + tweet.id_str;
    var tweetUrlPrint = 'https://twitter.com/' + tweet.user.screen_name.magenta + '/status/' + tweet.id_str.yellow;

    var screenName = tweet.user.screen_name;
    if(tweet.user.verified){
      screenName = screenName.yellow;
    }  

    var tweetType = 'T'.green;
    if(tweet.in_reply_to_status_id_str !== null){
      tweetType   = '@'.yellow;
    }else if(typeof tweet.retweeted_status !== 'undefined'){
      tweetType   = 'R'.magenta;
    }
    var quotedStatus = ' ';
    if(tweet.is_quote_status){
      quotedStatus   = 'Q'.cyan;
    }
    //console.log(tweet.entities);
    var numberOfUsersMentioned = tweet.entities.user_mentions.length.toString();

    var tweetTextShort = tweetText.substr(0, 185);
    tweetTextShort = tweetTextShort.replace(    usernamesRegex, function(m){ return colors.cyan(m);    });
    tweetTextShort = tweetTextShort.replace(      hashTagRegex, function(m){ return colors.cyan(m);    });
    tweetTextShort = tweetTextShort.replace(     climateRegex1, function(m){ return colors.green(m);   });
    tweetTextShort = tweetTextShort.replace(bullshitjobsRegex1, function(m){ return colors.magenta(m); });
    tweetTextShort = tweetTextShort.replace(bullshitjobsRegex2, function(m){ return colors.magenta(m); });
    tweetTextShort = tweetTextShort.replace(davidGraeberRegex1, function(m){ return colors.yellow(m);  });
    tweetTextShort = tweetTextShort.replace( basicincomeRegex1, function(m){ return colors.red(m);     });
    
    const newlineRegex = new RegExp(/\r?\n|\r/, 'g')
    var tweetTextShortPrint = tweetTextShort.replace(newlineRegex, '\\');

    var out  = '[' + dateObject.toLocaleString(
      undefined, {
        hour:   '2-digit',
        minute: '2-digit',
      }
    ).cyan + '] ';
        out += reaction + ' | ';
        out += tweetUrlPrint + ' '.repeat(62-tweetUrl.length) + ' | ';
        out += ' '.repeat(15-tweet.user.screen_name.length) + screenName + ' (' + String(tweet.user.followers_count).padStart(8, ' ') + ') | ';
        out += tweetType + quotedStatus + ' | ';
        out += numberOfUsersMentioned.padStart(2, ' ') + ' | ';
        out += tweetTextShortPrint;
    console.log(out);
    
    ///////////////
    // <retweet> //    
    if(boolRetweet){
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
    }
    // </retweet> //
    ////////////////

    ////////////
    // <like> //    
    if(boolLike){
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
    }
    // </like> //
    /////////////

  }
})