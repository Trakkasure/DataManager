# Managing data filtering, and grouping, simply.

A full interactive example can be found [here]()
### TODO: convert Makefile to gulpfile

## Quick Example

```javascript

var DM = dataManager() // create new data manaager
         .schema({
              quantity: { // this is the name of the field in the dataset.
                  type: 'integer' // convert the string to an integer (so summing works properly)
                , filter: null // no filtering.
              }
            , 'date' : { // filtering on the date field
                  type: 'date' // parse into a date
                , filter: 'reporting_dt' // filter is by date
                , group: {
                      day: { // this is the day grouping config. The name is arbitrary based on how you group your data.
                          reduce : 'sum' // reduce by summing
                        // If not specifying this field, then use the dimension filter field
                        //, map: 'reporting_dt' // group by date. Dates are by day anyhow
                        , sum: 'quantity' // sum the quantity field.
                      }
                    , week: {
                          reduce : 'sum' // reduce by summing
                        , map: 'week' // group by week field. This a string field in the data.
                        , sum: 'item_quantity' // This could also be a function that returns a value to be summed.
                      }
                  }
              }
            , 'object-class': { // this is an arbitrary name used to access this filter.
                  type: 'string'
                , filter: 'class_id' // this is the name of the field to filter by in the dataset
                , group: {
                      objects: {
                          reduce:'sum' // Want to sum in reduce.
                        , sum: 'quantity' // field to sum by.
                      }
                  }
              }
         })
         .setData(myData) // assumed myData is an array of objects containg the data.
         .filter('object-class','Fruit') // filter the object class by "Fruit"
         .filter('date',[new Date('2022-12-15'),new Date('2022-12-24')]) // filter also by date range

// Gets the total invoiced grouped by day between the 15th and 24th (inclusive) for only product class 1A
var dailyTotals = DM.group('date','day')
                    .all() // get all data for the group
```

## API Summary

* dataManager
    * `schema(schema definition:Object) : dataManager`

       Set the schema definition for this data manager instance.
    * `setData(data:Object) : dataManager`

       Set the data to be managed.
    * `filter(field:String, filter:Array|String ) : dataManager`

       Filter a field by some data. Single and multiple values, and ranges are supported.
       Single value    : "abc"
       Multiple values : ["abc","def"]
       Value range     : [[100,200]]
    * `group(field:String, group:String ) : group`

       Get the *field*s *group*ed set.
    * `getDimension(field:String) : dimension`

       Get the dimension configuration and access to the crossfilter dimension.
    * `all() : groupSummary `

       Get the reduced summary of the entire data set.

** Events supported by dataManager:
Supported events: 'dataChanged','schemaChanged','filterChanged','dimensionCreated','groupCreated'

Example of using events:
```javascript
    DM = new dataManager()
    DM.on('schemaChanged',function(oldSchema,newSchema){console.log('The schema changed %s',JSON.stringify(newSchema))})
    DM.on('dataChanged',function(field){console.log('Data changed')})
    DM.on('dimensionCreated',function(field){console.log('New dimension created for "%s"',field)})
    DM.schema({'a':{}}) // we're expecting a single field. No filters or grouping.
    // output to console: The schema changed {"a":{}}
    DM.setData([{a:'one'},{a:'two'},{a:'three'},{a:'ten'},{a:'four'},{a:'three'},{a:'six'},{a:'two'}])
    // output to console: Data changed
    DM.filter('a','two') // filter 'a' dimension by the value 'two'
    // output to console: New dimension created for "a"
    var filtered = DM.getDimension('a').top(Infinity) // get the 'a' dimension, with no limit to count.
    // data returned: ["{"a":"two"}", "{"a":"two"}"]
```

* group
    * `all()`

       Get all data for the grouped set
    * `order(value: Function)`

       change the sort order function of the grouping
    * `orderNatural()`

       set the ordering using the natural return of the reduced value
    * `reduce(add: Function, remove: Function, initial: Object)`

       set the reduce functions (this is done automatically from the schema definition)
    * `reduceCount() : void`

       set the reduce function to count the number of rows in group.
    * `reduceSum(value: String|Function)`

       set the reduce function to sum a row, or call a function to return a value to add to the total.
    * `size() : int`

       Get the number of group keys.
    * `top(num: int) : Array`

       Get the top NUM records from the group based on the sort order.

* dimension
    * `column: String`

       Name of the column in data set that this filter represents.
    * `dimension: Object`

       Direct access to the crossfilter dimension object.
    * `filter(data:Array|String) : dimension`

       Filter this dimension by the provided data.
       Single value    : "abc"
       Multiple values : ["abc","def"]
       Value range     : [[100,200]]

    * `group: function (group:String) : group`

       get *group*ing for this dimension by this object.
