// This is for managing data to be used for graphing.
// Uses crossfilter as storage and filter medium.

function dataManager() {
    var schema = {}
      , filter = null
      , filterFields = {}
      , all = null
      , sourceData = null
      , total = 0
      , NONE =  function(){return undefined}
      , events = dataManager.dispatch('dataSet','dataChanged','schemaChanged','filterChanged','dimensionCreated','groupCreated')
      , self = {
            NONE: NONE
          , on: function(){events.on.apply(events,Array.prototype.slice.call(arguments,0))}
          , schema: function(_schema) {
                // schema format:
                // {
                //     fieldName: { // arbitrary name used as accessor into filter/group functions.
                //           type   : fieldType  // Date/String/Number
                //       , format : formatString // if field format (like a date) is necessary
                //       , filter : function custom filter function. Or string of field to filter. 
                //                  If this is null, it cannot be filtered.
                //       , group  : {
                //           type : string 'sum', 'count', 'custom'
                //           field: string of field name or function to group by when maping in map/reduce
                //           add:  // reduce "add" function.
                //           sub:  // reduce "subtract" function
                //           init: // init values for add/sub functions.
                //         }
                //     }
                // }
                if (!_schema) return schema;
                var oldSchema = schema
                schema = _schema
                for (var f in schema) {
                    if ('function' === typeof schema[f])
                        schema[f] = {type:schema[f],filter:f,column:f}
                    if (schema[f].filter === null) continue
                    filterFields[f] = {
                        dimension:null
                      , column:(('function' === typeof schema[f].filter)?schema[f].column:schema[f].filter)||f
                      , filter:('function' === typeof schema[f].filter)?schema[f].filter
                            :((schema[f].filter!==null)?(function(n){
                                 return function(d){
                                   return d[n] 
                                 }
                               }
                               )(schema[f].filter||f):null)
                      , group: {}
                      , data : self.NONE 
                    }
                }
                events.schemaChanged(oldSchema,schema)
                oldSchema = null
                return self 
            }
          , setData: function (data, clearFilters) {
                var i, f, column
                // Process data to normalize into proper object types from JSON strings.
                total = data.length
                for (f in filterFields) {
                    if (filterFields[f].dimension) {
                        filterFields[f].dimension.filterAll()
                        filterFields[f].dimension.remove()
                    }
                    if (clearFilters)
                        filterFields[f].data = self.NONE
                    filterFields[f].dimension=null
                    filterFields[f].group = {}
                    for (var g in (schema[f].group ||{}))
                        if ('string' === typeof schema[f].group[g].map)
                            schema[f].group[g].keyMap={}
                }
                for(i = 0;i<data.length;i++){
                    for (f in schema) {
                        column = filterFields[f]?filterFields[f].column:f
                        if ('function' === typeof schema[f].type)
                            schema[f].type.apply(this,[data[i],column])
                        else if ((data[i][column]!==undefined)&&schema[f].type) {
                            switch(schema[f].type.toLowerCase()) {
                                case 'json':
                                    data[i][column]=JSON.parse(data[i][column])
                                break
                                case 'integer':
                                    data[i][column]=parseInt(data[i][column])
                                break
                                case 'float':
                                    data[i][column]=parseFloat(data[i][column])
                                break
                                case 'date':
                                    data[i][column]=new Date(data[i][column])
                                break
                            }
                            for (var g in (schema[f].group||{}))
                                if ('string' === typeof schema[f].group[g].map) {
                                    schema[f].group[g].keyMap[data[i][column]]=data[i][schema[f].group[g].map]
                                }
                        }
                    }
                }
                // Calling data changed here allows the data to be manipulated by the even handlers before crossfilter takes it.
                events.dataSet(data)
                filter = crossfilter(data)
                all = filter.groupAll()
                events.dataChanged(data)
                // Handling processing filters set before data was set.
                for (f in filterFields) {
                    if (filterFields[f].data!=self.NONE) {
                        i = filterFields[f].data
                        filterFields[f].data = self.NONE
                        self.filter.apply(self,[f].concat(i))
                        i = null
                    }
                }
                return self
            }
          , total: function() { return total }
            // create dimension and filter (if data provided)
            // Allows setting filters before data is applied.
            // Filter field is column name. data can be one, more than one
            //        or a filter function
          , filter: function() {
                var data = Array.prototype.slice.apply(arguments,[0])
                  , field = data.shift() || null
                if (!field) return filter // get the crossfilter
                if (!filterFields[field]) throw "Field '"+field+"' is not defined in schema"
                if (!filterFields[field].filter) throw "Field '"+field+"' is not defined to be able to filter in schema"
                if (data.length) {
                    if (!filterFields[field].dimension) {
                        try {
                            self.getDimension(field)
                        } catch (e) {
                            if (data[0]===self.NONE)
                                filterFields[field].data = self.NONE
                            else
                                filterFields[field].data = data
                            return
                        }
                    }
                    if (data[0]===self.NONE)  {
                        filterFields[field].dimension.filterAll()
                        events.filterChanged({field:field,old:filterFields[field].data,new:data})
                        filterFields[field].data = self.NONE
                    } else
                    if (data[0]===null)  {
                        filterFields[field].dimension.filterExact(null)
                        filterFields[field].data = [null]
                    } else
                    if (typeof(Function) === typeof(data[0]) || JSON.stringify(filterFields[field].data) != JSON.stringify(data)) {
                        filterFields[field].dimension.filter.apply(filterFields[field].dimension,data)
                        events.filterChanged({field:field,old:filterFields[field].data,new:data})
                        filterFields[field].data = data
                    }
                } else //return filterFields[field]
                       filterFields[field].dimension.filterAll()
                return self
            }
          , getFilter: function(field) {
                if (!field) throw "Must include a field to get filter"
                if (!filterFields[field]) throw "Field '"+field+"' is not defined in schema"
                if (!filterFields[field].filter) throw "Field '"+field+"' is not defined to be able to filter in schema"
                return filterFields[field].data
            }
          , clearFilters: function() {
                for (f in filterFields) {
                    if (filterFields[f].filter)
                        filterFields[f].data = self.NONE 
                    if (filterFields[field].dimension)
                        filterFields[field].dimension.filterAll()
                }
            }
          , all: function(reset) { if (reset) all = DM.filter.groupAll();return all }
          // return the group for the field filtered.
          , group: function(field,group) {
                if (!schema[field].group[group]) return null
                if (!filterFields[field].dimension)
                    self.getDimension(field) // make dimension.
                var groupName = group
                  , schemaGroup = schema[field].group[groupName]
                if (!filterFields[field].group[group]) {
                    if ('function' === typeof schemaGroup.map)
                        group = filterFields[field].dimension.group(schemaGroup.map)
                    else {
                        group = filterFields[field].dimension.group()
                        if ('string' === typeof schemaGroup.map)
                            group.mapKey = function(d){
                                return schemaGroup.keyMap[d]
                            }
                    }
                    filterFields[field].group[groupName] = group
                    if (!schemaGroup.reduce) schemaGroup.reduce = 'count'
                    if (schemaGroup.order) group.order(schemaGroup.order)
                    switch(schemaGroup.reduce) {
                        case 'sum':
                            if ('function' === typeof schemaGroup.sum)
                                group.reduceSum(schemaGroup.sum)
                            else
                                group.reduceSum((function(f){return function(d){return d[f]}})(schemaGroup.sum))
                        break
                        case 'count':
                            group.reduceCount()
                        break
                        case 'custom':
                            group.reduce(
                                schemaGroup.add||(function(f){return function(p,d){p.value+=d[f];return p}})(filterFields[field].column)
                              , schemaGroup.sub||(function(f){return function(p,d){p.value-=d[f];return p}})(filterFields[field].column)
                              , schemaGroup.init||function(){return {value:0}}
                            )
                        break
                        //default:
                        // Do the default
                    }
                    events.groupCreated({field:field,groupName:groupName,group:group,dimension:filterFields[field].dimension})
                }
                return filterFields[field].group[groupName]
            }
          , pivot: function(groups) {
                return filter.pivotGroup(groups)
            }
          , getDimension: function(field) {
                if (!filter) throw "Data has not been set. Cannot get a dimension"
                if (!field) throw "A field name is required to get a dimension"
                if (!filterFields[field]) throw "Field '"+field+"' is not a defined dimension"

                if (!filterFields[field].dimension) {
                    //filterFields[field].groupAll = filterFields[field].dimension.groupAll()
                    //filterFields[field].filter = (function(f){return function(data){self.filter(f,data);return this}})(field)
                    //filterFields[field].group = (function(f){return function(data){return self.group(f,data)}})(field)
                    filterFields[field].dimension = filter.dimension(filterFields[field].filter)
                    events.dimensionCreated(field,filterFields[field].dimension)
                }
                return filterFields[field].dimension
            }
        }
    //end of variable declarations
    return self
}
exports.dataManager = dataManager;
