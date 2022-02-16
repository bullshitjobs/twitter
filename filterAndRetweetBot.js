var colors = require('colors')
var Twit = require('twit')
var config = require('./filterAndRetweetBotConfig.js')
var T = new Twit(config)

//////////////
// API call //
//////////////
var stream = T.stream('statuses/filter', { track: '#bullshitjobs, bullshitjobs,"bullshit jobs", "bullshit-jobs", "bullshit_jobs", #davidgraeber, davidgraeber, "david graeber"' })

stream.on('limit', function (limitMessage) {
  console.log(JSON.stringify(limitMessage))
});

stream.on('disconnect', function (disconnectMessage) {
  console.log(JSON.stringify(disconnectMessage))
})

stream.on('tweet', function (tweet) {
  
  var tweetText = typeof tweet.extended_tweet !== 'undefined' ? tweet.extended_tweet.full_text : tweet.text;
 
  if(typeof tweet.retweeted_status !== 'undefined'){ return 1; }
  if(tweet.lang != 'en')                           { return 1; }
  if(tweet.user.followers_count < 2000)            { return 1; }
  
  /*
  var quoted = tweet.is_quote_status ? ' QUOTED' : '';
  if(tweet.in_reply_to_status_id_str !== null){
  	console.log('REPLY' + quoted);
  }else{
  	console.log('REGULAR ' + quoted);
  }

  */
  const usernamesRegex = new RegExp(/(^|[^\w@/\!?=&])@(\w{1,15})\b/, 'g');
  var tweetTextNoUsers  = tweetText.replace(usernamesRegex, '');

  const bullshitjobsRegex1 = new RegExp(/#bullshitjobs/, 'i');
  const bullshitjobsRegex2 = new RegExp(/bullshitjobs/, 'i');
  const bullshitjobsRegex3 = new RegExp(/bullshit[\s\_\-]jobs/, 'i');
  
  const climateRegex1 = new RegExp(/#climatechange/, 'i');
  const climateRegex2 = new RegExp(/climatechange/, 'i');
  const climateRegex3 = new RegExp(/climate[\s\_\-]change/, 'i');
  
  const davidGraeberRegex1 = new RegExp(/#davidgraeber/, 'i');
  const davidGraeberRegex2 = new RegExp(/davidgraeber/, 'i');
  const davidGraeberRegex3 = new RegExp(/david[\s\_\-]graeber/, 'i');
 
  var bullshitjobsMatches = 0;
  if(bullshitjobsRegex1.test(tweetTextNoUsers)){ bullshitjobsMatches++; }
  if(bullshitjobsRegex2.test(tweetTextNoUsers)){ bullshitjobsMatches++; }
  if(bullshitjobsRegex3.test(tweetTextNoUsers)){ bullshitjobsMatches++; }
 
  var climateMatches      = 0;
  if(climateRegex1.test(tweetTextNoUsers)){ climateMatches++; }
  if(climateRegex2.test(tweetTextNoUsers)){ climateMatches++; }
  if(climateRegex3.test(tweetTextNoUsers)){ climateMatches++; }
  
  var davidGraeberMatches = 0;
  if(davidGraeberRegex1.test(tweetTextNoUsers)){ davidGraeberMatches++; }
  if(davidGraeberRegex2.test(tweetTextNoUsers)){ davidGraeberMatches++; }
  if(davidGraeberRegex3.test(tweetTextNoUsers)){ davidGraeberMatches++; }
  
  if(bullshitjobsMatches > 0 || davidGraeberMatches > 0){
  
    var tweetUrl      = 'https://twitter.com/' + tweet.user.screen_name + '/status/' + tweet.id_str;
    var tweetUrlPrint = 'https://twitter.com/' + tweet.user.screen_name.magenta + '/status/' + tweet.id_str.yellow;
    
    var tweetTextShort = tweetText.substr(0, 160);
    const newlineRegex = new RegExp(/\r?\n|\r/, 'g')
    var tweetTextShortPrint = tweetTextShort.replace(newlineRegex, ' ');
    
    var screenName = tweet.user.screen_name;
    if(tweet.user.verified){
    	screenName = screenName.yellow;
    }
    
    var reaction = 'NONE   ';
    if(bullshitjobsMatches){
      reaction   = 'RETWEET'.magenta;
    }else if(davidGraeberMatches){
    	reaction   = 'LIKE   '.cyan;
    }
  	
  	var out  = '[' + tweet.created_at.cyan + '] ';
  	    out += reaction + ' | '
  	    out += tweetUrlPrint + ' '.repeat(64-tweetUrl.length) + ' | ';
  	    out += ' '.repeat(16-tweet.user.screen_name.length) + tweet.user.screen_name + ' (' + String(tweet.user.followers_count).padStart(8, ' ') + ') | ';
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