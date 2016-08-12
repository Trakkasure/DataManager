// import $$observable from 'symbol-observable';
import {createChangeEmitter} from 'change-emitter';
// import 'babel-polyfill';
/**
 DataManager schema format:
{
    fieldName: { // arbitrary name used as accessor into filter/group functions.
          type   : fieldTye  // Date/String/Number
      , format : formatString // if field format (like a date) is necessary
      , filter : function custom filter function. Or string of field to filter. 
                 If this is null, it cannot be filtered.
      , group  : {
          type : string 'sum', 'count', 'custom'
          field: string of field name or function to group by when maping in map/reduce
          add:  // reduce "add" function.
          sub:  // reduce "subtract" function
          init: // init values for add/sub functions.
        }
    }
}
**/

// *Private* vars
const NONE = function(){};
const funcType = typeof NONE;
const pascalCase = (s)=>s[0].toUpperCase()+s.split('').slice(1).join('');
function* entries(obj) {
   for (let key of Object.keys(obj)) yield [key, obj[key]];
}
class DataManager {
    @Private
    _schema = null; // Current schema
    @Private
    _filter = null; // Current filter (processed through CF)
    @Private
    _filterFields = {}; // List of fields to filter
    @Private
    _all = null;  // Result of asking for all data.
    @Private
    _sourceData = null; // Original Source data.
    @Private
    _total = 0; // Total count
    @Private
    _isCSV = false;
    @Private
    _hasHeading = false;
    @Private
    _headings = null;
    @Private
    crossfilter // Crossfilter instance
    @Private
    _events = ['dataSet','dataChanged','schemaChanged','filterChanged','dimensionCreated','groupCreated']
                     .reduce((all,ev)=>({...all,[ev]: createChangeEmitter()}),{});

    const Types {
        'string': 'string'
      , 'number': 'number'
      , 'date': 'date'
      , 'json': 'json'
      , 'float': 'float'
    }
    constructor(crossfilter) {
        for (let e of Object.keys(this._events)) this['on'+pascalCase(e)]=this._events[e].listen;
        this.crossfilter=crossfilter;
        this.NONE=NONE;
    }
    schema(newSchema) {
        // schema format:
        // {
        //     fieldName: { // arbitrary name used as accessor into filter/group functions.
        //           type   : fieldTye  // Date/String/Number
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
        if (!newSchema) return this._schema;
        var oldSchema = this._schema
        this._schema = newSchema
        for (var f in newSchema) {
            if ('function' === typeof newSchema[f])
                newSchema[f] = {type:newSchema[f],filter:f,column:f};
            if (newSchema[f].filter === null) continue;
            this._filterFields[f] = {
                dimension:null
              , column:(('function' === typeof newSchema[f].filter)?newSchema[f].column:newSchema[f].filter)||f
              , filter:('function' === typeof newSchema[f].filter)?newSchema[f].filter
                    :((newSchema[f].filter!==null)?(function(n){
                         return function(d){
                           return d[n] 
                         }
                       }
                       )(newSchema[f].filter||f):null)
              , group: {} , data : NONE 
            };
        }
        this._events.schemaChanged.emit(oldSchema,newSchema);
        oldSchema = null;
        return this; 
    }
    // If the data is in CSV format, and doesn't have headings, you can set them here.
    setHeadings(heading) {
        this._headings=heading;
        this._hasHeading=false; // set that the data has headings to false.
    }
    /** If the data is CSV and contains a heading, set this to true. **/
    hasHeading(yes) {
        this._hasHeading=yes;
    }
    /** Set the data **/
    setData(data, clearFilters) {
        var column;
        // Process data to normalize into proper object types from JSON strings.
        this._total = data.length;
        // Clear filters
        for (let f in this._filterFields) {
            clearFilters();
            // if (this._filterFields[f].dimension) {
            //     this._filterFields[f].dimension.filterAll();
            //     this._filterFields[f].dimension.remove();
            // }
            // if (clearFilters)
            //     this._filterFields[f].data = NONE;
            this._filterFields[f].dimension=null;
            this._filterFields[f].group = {};
            for (let [key,value] of entries(this._schema[f].group))
                if ('string' === typeof value.map)
                    value.keyMap={};
        }
        var headings=this._heading;
        if (this._isCSV) {
            if (this._hasHeading) {
                headings=data.shift().reduce((all,field,i)=>({...all,[field]:i}),{});
            }
        }
        // Iterate through each data line
        for(let i = 0;i<data.length;i++){
            let _schema=this._schema;
            // Iterate through each field.
            for (f in _schema) {
                let column = this._filterFields[f]?this._filterFields[f].column:f
                if ('function' === typeof this._schema[f].type)
                    this._schema[f].type.call(this,data[i],column);
                else {
                    if (this._isCSV) column=this._headings[column];
                    if ((data[i][column]!==undefined)&&this._schema[f].type) {
                    switch(this._schema[f].type.toLowerCase()) {
                        case 'json':
                            data[i][column]=JSON.parse(data[i][column]);
                        break
                        case 'integer':
                            data[i][column]=parseInt(data[i][column]);
                        break
                        case 'float':
                            data[i][column]=parseFloat(data[i][column]);
                        break
                        case 'date':
                            data[i][column]=new Date(data[i][column]);
                        break
                    }
                    for (let [key,value] of entries(this._schema[f].group))
                        if ('string' === typeof value.map)
                        value.keyMap[data[i][column]]=data[i][value.map];
                    }
                }
            }
        }
        // Calling data changed here allows the data to be manipulated by the event handlers before crossfilter takes it.
        this._events.dataSet.emit(data);
        this._filter = this.crossfilter(data);
        this._all = this._filter.groupAll();
        this._events.dataChanged.emit(data);
        // Handling processing filters set before data was set.
        for (let f in this._filterFields) {
            if (this._filterFields[f].data!=NONE) {
                this._filterFields[f].data = NONE;
                this.filter.apply(this,[f].concat(this._filterFields[f].data));
            }
        }
        return this;
    }
    filter(...data) {
        var field = data.shift() || null;
        if (!field) return this._filter; // get the crossfilter
        if (!this._filterFields[field]) throw "Field '"+field+"' is not defined in schema";
        if (!this._filterFields[field].filter) throw "Field '"+field+"' is not defined to be able to filter in schema";
        if (data.length) {
            if (!this._filterFields[field].dimension) {
                try {
                    this.getDimension(field);
                } catch (e) {
                    if (data[0]===NONE)
                        this._filterFields[field].data = NONE;
                    else
                        this._filterFields[field].data = data;
                    return
                }
            }
            if (data[0]===NONE)  {
                this._filterFields[field].dimension.filterAll();
                this._events.filterChanged.emit({field:field,old:this._filterFields[field].data,new:data});
                this._filterFields[field].data = NONE;
            } else
            if (data[0]===null)  {
                this._filterFields[field].dimension.filterExact(null);
                this._filterFields[field].data = [null];
            } else
            if (typeof(Function) === typeof(data[0]) || JSON.stringify(this._filterFields[field].data) != JSON.stringify(data)) {
                this._filterFields[field].dimension.filter.apply(this._filterFields[field].dimension,data);
                this._events.filterChanged.emit({field:field,old:this._filterFields[field].data,new:data});
                this._filterFields[field].data = data;
            }
        } else //return filterFields[field]
            this._filterFields[field].dimension.filterAll();
        return this;
    }
    getFilter(field) {
        if (!field) throw "Must include a field to get filter";
        if (!this._filterFields[field]) throw "Field '"+field+"' is not defined in schema";
        if (!this._filterFields[field].filter) throw "Field '"+field+"' is not defined to be able to filter in schema";
        return this._filterFields[field].data;
    }
    clearFilters() {
        for (f in this._filterFields) {
            if (this._filterFields[f].filter)
                this._filterFields[f].data = NONE ;
            if (this._filterFields[field].dimension)
                this._filterFields[field].dimension.filterAll();
        }
    }
    all(reset) { if (reset) this._all = this._filter.groupAll();return this._all; }
  // return the group for the field filtered.
    group(field,group) {
        if (!this._schema[field].group[group]) return null;
        if (!this.filterFields[field].dimension)
            this.getDimension(field); // make dimension.
        var groupName = group
          , schemaGroup = this._schema[field].group[groupName];
        if (!this._filterFields[field].group[group]) {
            if ('function' === typeof schemaGroup.map)
                group = this._filterFields[field].dimension.group(schemaGroup.map);
            else {
                group = this._filterFields[field].dimension.group();
                if ('string' === typeof schemaGroup.map)
                    group.mapKey = function(d){
                        return schemaGroup.keyMap[d];
                    }
            }
            this._filterFields[field].group[groupName] = group;
            if (!schemaGroup.reduce) schemaGroup.reduce = 'count';
            if (schemaGroup.order) group.order(schemaGroup.order);
            switch(schemaGroup.reduce) {
                case 'sum':
                    if ('function' === typeof schemaGroup.sum)
                        group.reduceSum(schemaGroup.sum);
                    else
                        group.reduceSum((function(f){return function(d){return d[f]}})(schemaGroup.sum));
                break
                case 'count':
                    group.reduceCount();
                break
                case 'custom':
                    group.reduce(
                        schemaGroup.add||(function(f){return function(p,d){p.value+=d[f];return p}})(this._filterFields[field].column)
                      , schemaGroup.sub||(function(f){return function(p,d){p.value-=d[f];return p}})(this._filterFields[field].column)
                      , schemaGroup.init||function(){return {value:0}}
                    );
                break
                //default:
                // Do the default
            }
            this._events.groupCreated.emit({field:field,groupName:groupName,group:group,dimension:this._filterFields[field].dimension});
        }
        return this._filterFields[field].group[groupName];
    }
    pivot(groups) {
        return this._filter.pivotGroup(groups);
    }
    getDimension(field) {
        if (!field) throw "A field name is required to get a dimension";
        if (!this._filter) throw "Data has not been set. Cannot get a dimension";
        if (!this._filterFields[field]) throw "Field '"+field+"' is not a defined dimension";

        if (!this._filterFields[field].dimension) {
            //this._filterFields[field].groupAll = filterFields[field].dimension.groupAll()
            //this._filterFields[field].filter = (function(f){return function(data){self.filter(f,data);return this}})(field)
            //this._filterFields[field].group = (function(f){return function(data){return self.group(f,data)}})(field)
            this._filterFields[field].dimension = this._filter.dimension(this._filterFields[field].filter);
            this._events.dimensionCreated.emit(field,this._filterFields[field].dimension);
        }
        return this._filterFields[field].dimension;
    }
}

export default DataManager;
export {DataManager};