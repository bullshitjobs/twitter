#!/usr/bin/perl -w
#
# A simple Twitter bot that uses the 'search/tweets' Twitter API endpoint
# in order to retweet tweets featuring enough likes or retweets.
#
# TODO: API Error handling.
# 
use strict;
use warnings;
use utf8::all;
use Data::Dumper;
use Twitter::API;
use Term::ANSIColor;
use Date::Parse;
use JSON;
use Getopt::Long;

my $interval = 60 * 20; # interval between runs in seconds

my $profile = undef;
GetOptions( 'profile=s' => \$profile );
if(!defined $profile){
  die dateTime() . ' Please use the --profile=<name of profile> command line option to specify a usage profile. Aborting ...' . "\n";
}

my $twitterUser   = undef;
my $min_retweets  = undef;
my $min_favorites = undef;

my $ignoreEverythingBy = {

             '14446807' => 'thatinterlace',
             '14617332' => 'figgityfigs',
             '65493023' => 'SarahPalinUSA',
             '88174963' => 'csdrake',
            '136080626' => 'golikehellmachi',            
            '187719856' => 'draglikepull',
            '319988364' => 'AlexGodofsky',         
            '397782926' => 'hillelogram',
            '398413123' => 'cojobrien',
            '410151321' => 'Chican3ry',
            '599755262' => 'blairreeves',
            '823328503' => 'matthewdownhour',
            '892767878' => 'nikicaga',
            '896384784' => 'StephenPiment',
           '1254412448' => 'BeijingPalmer',
           '2725273267' => 'alth0u',
           '2900768928' => 'provisionalidea',
           '3315205122' => 'deepfates',
           '3419028987' => 'sgodofsk',                    
   '767323848161320965' => 'MonniauxD',
   '791112163507044353' => 'astratelates',
  '1019515949450514432' => 'gfmindset',
  '1237544283743432704' => 'powerbottomdad1',
  '1320344445288632321' => 'metakuna',
  '1352845902113869824' => 'CJackson818',
  '1364159160267530241' => 'linmanuelrwanda',
  '1418495302168891393' => 'tweets_of_oscar',
  '1431830721635753990' => 'lawyerbrandy',
  '1481645017726799888' => 'MonetaristMaia',

};

###########################################
### configure your search profiles here ###
###########################################

if($profile eq 'bot'){
  $twitterUser   = 'bullshitjobsbot';
  $min_retweets  = 10;
  $min_favorites = 10;
}elsif($profile eq 'pop'){
  $twitterUser   = 'bullshitjobspop';
  $min_retweets  = 25;
  $min_favorites = 25;
}elsif($profile eq 'top'){
  $twitterUser   = 'bullshitjobstop';
  $min_retweets  = 100;
  $min_favorites = 100;
}elsif($profile eq 'int'){
  $twitterUser   = 'bullshitjobsint';
  $min_retweets  = 10;
  $min_favorites = 10;
}else{
  die dateTime() . ' Unknown profile "' . $profile . '" specified via the --profile command line option: ' . $profile . '. Aborting ...' . "\n";
}

#########################
### search parameters ###
#########################

my $q = 'bullshitjobs OR "bullshit jobs" OR "bullshit-jobs" OR "nonsense employment" OR "nonsense-employment" min_retweets:' . $min_retweets . ' OR min_faves:' . $min_favorites . ' -filter:retweets'; ### testing
###my $q = '#bullshitjobs OR bullshitjobs OR "bullshit jobs" OR "bullshit-jobs" OR "bullshit_jobs" min_retweets:' . $min_retweets . ' OR min_faves:' . $min_favorites . ' -filter:retweets AND -filter:replies';

my $options = {
  q          => $q,
  tweet_mode => 'extended',
  count      => 100,
};

###################################################
### load authentication credentials from config ###
###################################################

my $credentials = do('./searchAndRetweetBotConfig.pl');
die dateTime() . ' No credentials found for user: ' . $twitterUser . '. Aborting ...' . "\n" if !defined $credentials->{$twitterUser};
$credentials = $credentials->{$twitterUser};

# see https://metacpan.org/pod/Twitter::API::Trait::RetryOnError
# see https://metacpan.org/pod/Twitter::API::Trait::Enchilada
my $client = Twitter::API->new_with_traits(
  traits => [ qw/ApiMethods NormalizeBooleans RetryOnError/ ],
  %{$credentials},
);
 
#################
### main loop ###
#################

my $tweetId2retweetTime = {};

while(1){

  my $potentialTweetIds = searchForTweets($options);
 
  #
  # The results from 'search/tweets' calls do not actually have the .retweeted field set. It's always false/0.
  # This is most likely to prevent search complexity explosions and we need to be doing 'statuses/lookup' calls
  # featuring the ids of our potential tweets. So we know whether we already retweeted them.
  #
  # Another solution would be to try to retweet them anyway and to look for the error.code == 327. Indicating that
  # the tweet got already retweeted by us. But I don't know whether this is considered "good practice" ...
  #
  # See https://twittercommunity.com/t/why-favorited-is-always-false-in-twitter-search-api-1-1/31826
  #

  my $notYetRetweetedIds = filterRetweeted($potentialTweetIds);
  print dateTime() . ' Found ' . color('yellow') . scalar(keys(%{$potentialTweetIds})) . color('reset') . ' potential tweets. Retweeting ' . color('yellow') . scalar(keys(%{$notYetRetweetedIds})) . color('reset') . ' of them.' . "\n";
  
  retweetAction($notYetRetweetedIds);
  
  print dateTime() . ' Sleeping for ' . color('yellow') . $interval . color('reset') . ' seconds. (Next run sheduled for ' . dateTime(time() + $interval) . ')' . "\n";
  sleep($interval);
}

############
### subs ###
############

sub searchForTweets {
  my $options  = shift;
  my $max_id   = undef;
  my $ids      = {};
  do {
    if(defined $max_id){
      $options->{'max_id'} = $max_id;
    }else{
      delete $options->{'max_id'};
    }
    print dateTime() . ' max_id: ' . color('yellow') . (defined($max_id) ? $max_id : 'most recent' ) . color('reset') . '.' . "\n";
 
    ################
    ### API call ###
    ################
    my $chunk = $client->get('search/tweets', $options);
    sleep(5); # Don't hammer the API ...
    
    foreach my $tweet (@{$chunk->{'statuses'}}){
      $ids->{$tweet->{'id_str'}}++ if isaGoodTweet($tweet);
    }
    $max_id = (defined $chunk->{'search_metadata'}->{'next_results'} && $chunk->{'search_metadata'}->{'next_results'} =~ /max_id=(\d+)/i) ? $1 : undef;
  } while (defined $max_id);
  return $ids;
}

sub isaGoodTweet {
  my $tweet = shift;
  
  return 0 if defined $ignoreEverythingBy->{$tweet->{'user'}->{'id_str'}};
  return 0 if $tweet->{'retweet_count'} < $min_retweets && $tweet->{'favorite_count'} < $min_favorites;
  return 0 if defined $tweet->{'retweeted_status'};
  ###return 0 if defined $tweet->{'in_reply_to_status_id_str'}; ###testing <-----------------------------------------------------------------------------------------------------------------
  
  # make more beautiful ......................
  return 0 if $tweet->{'lang'} ne 'en' && $profile ne 'int';
  return 0 if $tweet->{'lang'} eq 'en' && $profile eq 'int';
  
  my $tweetText = defined $tweet->{'retweeted_status'} ? $tweet->{'retweeted_status'}->{'full_text'} : $tweet->{'full_text'};  
  my $tweetTextNoUsers = $tweetText =~ s/(^|[^\w@\/\!?=&])(@\w{1,15})\b//igr; # in perl 5.14.0 or later, you can use the new /r non-destructive substitution modifier.
  
  my $matches = 0;
  $matches++ if $tweetTextNoUsers =~ /bullshit(?:[\s\-])?jobs/i;
  $matches++ if $tweetTextNoUsers =~ /nonsense[\s\-]employment/i; 
  return 0 if $matches < 1;
 
  return 1;
}

sub printTweet {
  my $tweet = shift;
  
  my $unixTime = str2time($tweet->{'created_at'});
  
  my $retweetAge = defined $tweetId2retweetTime->{$tweet->{'id_str'}} ? time() - $tweetId2retweetTime->{$tweet->{'id_str'}} : undef;
  
  my $retweetAgePrint = ' RTed';
  
  if(JSON::is_bool($tweet->{'retweeted'}) && $tweet->{'retweeted'} == JSON::false){
    $retweetAgePrint = ' ' . color('red') . 'PEND' . color('reset');
  }elsif(defined $retweetAge){
    my $retweetAgeHours = int($retweetAge / 3600);
    my $color = 'green';
    if($retweetAgeHours < 7){
       $color = 'yellow';
    }elsif($retweetAgeHours < 1){
       $color = 'red';
    }
    $retweetAgePrint = ' 'x(4 - length($retweetAgeHours)) . color($color) . $retweetAgeHours . color('reset') . 'h';
  }

  my $tweetUrl      = 'https://twitter.com/' . $tweet->{'user'}->{'screen_name'} . '/status/' . $tweet->{'id_str'};
  my $tweetUrlPrint = 'https://twitter.com/'. color('magenta') . $tweet->{'user'}->{'screen_name'} . color('reset') . '/status/' .  color('yellow') . $tweet->{'id_str'} .  color('reset');
  
  my $retweetCount = $tweet->{'retweet_count'} >= $min_retweets ? color('green') . $tweet->{'retweet_count'} . color('reset') : $tweet->{'retweet_count'};
  my $favoriteCount = $tweet->{'favorite_count'} >= $min_favorites ? color('green') . $tweet->{'favorite_count'} . color('reset') : $tweet->{'favorite_count'};

  my $name = $tweet->{'user'}->{'screen_name'};
  $name = color('yellow') . $name . color('reset') if $tweet->{'user'}->{'verified'};
  
  my $tweetType  = color('green') . 'T' . color('reset');
  if(defined $tweet->{'in_reply_to_status_id_str'}){
    $tweetType = color('yellow') . '@' . color('reset');
  }elsif(defined $tweet->{'retweeted_status'}){
    $tweetType = color('magenta') . 'R' . color('reset');
  }
  my $quotedStatus = ' ';   
  if(JSON::is_bool($tweet->{'is_quote_status'}) && $tweet->{'is_quote_status'} == JSON::true){
    $quotedStatus = color('cyan') . 'Q' . color('reset');
  }

  my $numberOfUsersMentioned = scalar(@{$tweet->{'entities'}->{'user_mentions'}});

  #my $tweetText = defined $tweet->{'retweeted_status'} ? $tweet->{'retweeted_status'}->{'full_text'} : $tweet->{'full_text'};  
  my $tweetText = $tweet->{'text'};
  my $tweetTextShort = substr($tweetText, 0, 146);
  
  # see: https://stackoverflow.com/questions/2304632/regex-for-twitter-username#comment81834127_13396934
  # see: https://github.com/twitter/twitter-text/tree/master/js      
  $tweetTextShort =~ s/(^|[^\w@\/\!?=&])(@\w{1,15})\b/$1 .  color('cyan') . $2 . color('reset')/ige;
  $tweetTextShort =~ s/(^^|[^\w#\/\!?=&])(#\w{1,15})\b/$1 . color('cyan') . $2 . color('reset')/ige;
  
  $tweetTextShort =~ s/(climate(?:[\s\-])?change)/color('green')  . $1 . color('reset')/ige;
  $tweetTextShort =~ s/(bullshit(?:[\s\-])?jobs)/color('magenta') . $1 . color('reset')/ige;
  $tweetTextShort =~ s/(nonsense[\s\-]employment)/color('magenta') . $1 . color('reset')/ige;
  $tweetTextShort =~ s/(david(?:[\s\-])?graeber)/color('yellow')  . $1 . color('reset')/ige;
  
  my $tweetTextShortPrint = $tweetTextShort;
  $tweetTextShortPrint =~ s/\R/\\/g;
  
  print '[' . color('cyan') . scalar(localtime($unixTime)) . color('reset') . '] ';
  print $retweetAgePrint . ' | ';
  print $tweetUrlPrint . ' 'x(62- length($tweetUrl)) . ' | ';
  print ' 'x(6 - length($tweet->{'retweet_count'})) . $retweetCount . ' | ' . ' 'x(6 - length($tweet->{'favorite_count'})) . $favoriteCount . ' | ';
  print ' 'x(15 - length($tweet->{'user'}->{'screen_name'})) . $name . ' (' . ' 'x(8 - length($tweet->{'user'}->{'followers_count'})) . $tweet->{'user'}->{'followers_count'} . ') | ';
  print $tweetType . $quotedStatus . ' | ';
  print ' 'x(2- length($numberOfUsersMentioned)) . $numberOfUsersMentioned . ' | ';
  print $tweetTextShortPrint;
  print "\n";
}

sub filterRetweeted {
  my $ids = shift;
  my $filteredIds = {};

  my @ids = sort {$a <=> $b} keys %{$ids};
  my $spliceSize = 50;
  do{
    my @tmp = splice(@ids, 0, $spliceSize);
    
    ################
    ### API call ###
    ################
    #my $chunk = $client->get('statuses/lookup', { trim_user => 1, id => join(',', @tmp) });
    #  tweet_mode => 'extended' not really needed for tweetPrint ...
    my $chunk = $client->get('statuses/lookup', { id => join(',', @tmp) });
    sleep(5); # Don't hammer the API ...

    foreach my $tweet (sort { $a->{'id_str'} <=> $b->{'id_str'} } @{$chunk}){
      $filteredIds->{$tweet->{'id_str'}}++ if JSON::is_bool($tweet->{'retweeted'}) && $tweet->{'retweeted'} == JSON::false;
      printTweet($tweet);
    }
  } while(scalar @ids > 0);
  return $filteredIds;
}

sub retweetAction {
  my $ids = shift;
  foreach my $id (sort {$a <=> $b} keys %{$ids}){
    print dateTime() . ' Retweeting tweet with id: ' . color('yellow') . $id .  color('reset') . '.' . "\n";
    
    ################
    ### API call ###
    ################
    my $chunk = $client->post('statuses/retweet/' . $id);
    sleep(5); # Don't hammer the API ...
    
    $tweetId2retweetTime->{$id} = time();
  }
}

sub dateTime{
  my $unixtime = shift;
  $unixtime = defined $unixtime ? $unixtime : time();
  return '[' . color('magenta') . scalar(localtime($unixtime)) . color('reset') . ']';
}
