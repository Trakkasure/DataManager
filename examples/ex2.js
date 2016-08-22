// CSS file..
// image_id,unixtime,rawtime,title,total_votes,reddit_id,number_of_upvotes,subreddit,number_of_downvotes,localtime,score,number_of_comments,username

var d3=require('d3-request');
var dataManager = require('../dist/index.js');

var cf = require('crossfilter');
var DM;
d3.csv('/redditSubmissions.csv', function(err,data) {
  console.log(data);
    delete data.columns;
    window.DM=DM = new dataManager(cf) // create new data manaager
       .schema({
            'total_votes': {
                'type': 'integer'
            }
          , 'score': {
              'type':'integer'
            }
          , 'image_id': {
                'type': "integer"
              , 'group': {
                  'votes': {
                    'reduce': 'sum'
                  , 'sum': 'total_votes'
                  }
                , 'score': {
                    'reduce': 'stats'
                  , 'field': 'score'
                  }
                , 'down': {
                    'reduce': 'sum'
                  , 'sum': 'number_of_downvotes'
                  }
                , 'up': {
                    'reduce': 'sum'
                  , 'sum': 'number_of_upvotes'
                  }
                }
            }
          , 'number_of_upvotes': {
                'type': 'integer'
            }
          , 'number_of_comments': {
                'type':'number'
              , 'filter': 'number_of_comments'
            }
          , 'number_of_downvotes': {
                'type': 'integer'
            }
          , 'rawtime' : { // filtering on the date field
                'type': 'date' // parse into a date
              // , filter: 'date' // filter is by date
            }
          , "daily" : {
                'type': function(d){
                  var v=new Date(d.rawtime);
                  v.setHours(0);v.setMinutes(0);
                  v.setSeconds(0);return v;
                }
              , 'column': 'daily' // create a new column by this name
              , 'group': {
                    'image_id': { // this is the day grouping config. The name is arbitrary based on how you group your data.
                        'reduce' : 'count' // reduce by counting
                      // If not specifying this field, then use the dimension filter field
                      , map:  function(d) {
                                d.daily+d.image_id;
                              } // group by date. Dates are by day anyhow
                      // , 'sum': 'total_votes' // sum the quantity field.
                    }
                  // , week: {
                  //       reduce : 'sum' // reduce by summing
                  //     , map: 'week' // group by week field. This a string field in the data.
                  //     , sum: 'item_quantity' // This could also be a function that returns a value to be summed.
                  //   }
                }
            }
      })
      .setData(data) // assumed myData is an array of objects containg the data.
      // .filter('object-class','Fruit') // filter the object class by "Fruit"
      // .filter('date',[new Date('2022-12-15'),new Date('2022-12-24')]) // filter also by date range

   var byImage = DM.getDimension('image_id');
   console.log("Top: ",byImage.group('votes').top(5));

   console.log("Average scores grouped by image_id (sorted by id):",byImage.group('score').top(5).map(function(v){v.value.key=v.key;return v.value}));
});
