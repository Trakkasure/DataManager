// import $$observable from 'symbol-observable';
import {createChangeEmitter} from 'change-emitter';
import {autobind} from 'core-decorators';
// import 'babel-polyfill';
/**
 DataManager schema format:
{
    fieldName: { // arbitrary name used as accessor into filter/group functions.
          type   : fieldTye  // Date/String/Number
      , format : formatString // if field format (like a date) is necessary
      , filter : function custom filter function. Or string of field to filter. 
                 If this is null, it cannot be filtered.
      , group  : { // Shis field is grouped (mapped) the reduce is specified below.
          type : string 'sum', 'count', 'custom', 'stats'
                 Stats attempts to give min/max/count/average/sum
          map: function to map the original data for this group. (i.e. change date to weekly, daily, hourly, monthly, etc)
               if not specified it uses the field specified in the column or filter field above.
          field: string of field name or function to group by when maping in map/reduce
          add:  // reduce "add" function.
          sub:  // reduce "subtract" function
          init: // init values for add/sub functions.
          sum: which field to sum in the case type is set to 'sum'
        }
    }
}
**/

// *Private* vars
const NONE = function(){};
const funcType = typeof NONE;
const pascalCase = (s)=>s[0].toUpperCase()+s.split('').slice(1).join('');
const stringType = typeof("");

// function* entries(obj) {
//    for (let key of Object.keys(obj)) yield [key, obj[key]];
// }
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
    crossfilter // Crossfilter instance
    @Private
    _events = ['dataSet','dataChanged','schemaChanged','filterChanged','dimensionCreated','groupCreated']
                     .reduce((all,ev)=>({...all,[ev]: createChangeEmitter()}),{});

    static Types = {
        'string': stringType
      , 'number': 'number'
      , 'date': 'date'
      , 'json': 'json'
      , 'float': 'float'
    }
    /** Pass in cross filter into the constructor. Data manager doesn't create it anymore */
    constructor(crossfilter) {
        for (let e of Object.keys(this._events)) this['on'+pascalCase(e)]=this._events[e].listen;
        this.crossfilter=crossfilter;
        this.NONE=NONE;
    }
    schema(newSchema) {
        // schema format:
        // {
        //     fieldName: { // arbitrary name used as accessor into filter/group functions.
        //           type   : fieldTye  // Date/String/Number or function to map data
        //       , column :  if type is a function, then this is the name of the column to be created.
        //                   if not, then this identifies the column to process.
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
        if (!newSchema) return this._schema; // return the current schema if we use this as a "getter"
        var oldSchema = this._schema;
        this._schema = newSchema;
        const _filterFields = this._filterFields;
        for (var f in newSchema) {
            // If this item of the schema is a function
            if (funcType === typeof newSchema[f])
                // then the type is a function (map)
                newSchema[f] = {type:newSchema[f],filter:f,column:f};
            if (newSchema[f].filter === null) continue;
            _filterFields[f] = {
                dimension:null
              , column:((funcType === typeof newSchema[f].filter)?newSchema[f].column:newSchema[f].filter)||f
              , filter:(funcType === typeof newSchema[f].filter)?newSchema[f].filter
                    :((newSchema[f].filter!==null)?(function(n){
                         return function(d){
                           return d[n] 
                         }
                       }
                       )(newSchema[f].filter||newSchema[f].column||f):null)
              , group: {} , data : NONE 
            };
        }
        this._events.schemaChanged.emit(oldSchema,newSchema);
        return this; 
    }
    /** Set the data **/
    setData(data, clearFilters) {
        var column;
        // Process data to normalize into proper object types from JSON strings.
        this._total = data.length;
        const _schema=this._schema;
        const _filterFields=this._filterFields;
        // Clear filters
        for (let f in _filterFields) {
            if (_filterFields[f].dimension) {
                 _filterFields[f].dimension.filterAll();
                 _filterFields[f].dimension.remove();
                 _filterFields[f].dimension=null;
             }
             if (clearFilters)
                 _filterFields[f].data = NONE;
            _filterFields[f].group = {};
            let g = _schema[f].group;
            for (let key in g)
                if (stringType === typeof g[key].map)
                    g[key].keyMap={};
        }
        // Iterate through each data line
        for(let i = 0;i<data.length;i++){
            // Iterate through each field.
            for (var f in _schema) {
                let column = _filterFields[f]?_filterFields[f].column:f
                if (funcType === typeof _schema[f].type)
                    data[i][column]=_schema[f].type.call(this,data[i],column);
                else {
                    if ((data[i][column]!==undefined)&&_schema[f].type) {
                    switch(_schema[f].type.toLowerCase()) {
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
                    let g = _schema[f].group;
                    for (let key in _schema[f].group)
                        if (stringType === typeof g[key].map)
                            g[key].keyMap[data[i][column]]=data[i][g[key].map];
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
        for (let f in _filterFields) {
            if (_filterFields[f].data!=NONE) {
                // _filterFields[f].data = NONE;
                this.filter.apply(this,[f].concat(_filterFields[f].data));
            }
        }
        return this;
    }
    filter(...data) {
        var field = data.shift() || null;
        if (!field) return this._filter; // get the crossfilter
        if (!this._filterFields[field]) throw new Error(`Field ${field} is not defined in schema`);
        if (!this._filterFields[field].filter) throw new Error(`Field ${field} is not defined to be able to filter in schema`);
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
            // Filter all. No filter requested.
            if (data[0]===NONE)  {
                this._filterFields[field].dimension.filterAll();
                this._events.filterChanged.emit({field:field,old:this._filterFields[field].data,new:data});
                this._filterFields[field].data = NONE;
            } else
            // Looking for actual null values.
            if (data[0]===null)  {
                this._filterFields[field].dimension.filterExact(null);
                this._filterFields[field].data = [null];
            } else
            // custom filter.
            if (data.some(d=>funcType===typeof(d)) || JSON.stringify(this._filterFields[field].data) != JSON.stringify(data)) {
                if (data.length>1) {
                    this._filterFields[field].dimension.filter(function(d){
                        var f=data.some(function(v) {
                            if (Array.isArray(v)) {
                                // d>v[0]&&d<v[1]&&console.log(`${d} is between `,v);
                                return d>=v[0]&&d<v[1];
                            }
                            else if (v.test) {
                                // v.test(d)&&console.log(`${d} matches `,v);
                                return v.test(d)
                            }
                            if (funcType === typeof v) v.apply(null,v);
                            else {
                                // d==v&&console.log(`${d} equals `,v);
                                return d==v;
                            }
                        })
                        return f;
                    })
                } else
                    this._filterFields[field].dimension.filter.apply(this._filterFields[field].dimension,data);
                this._events.filterChanged.emit({field:field,old:this._filterFields[field].data,new:data});
                this._filterFields[field].data = data;
            }
        } else //return filterFields[field]
            this._filterFields[field].dimension.filterAll();
        return this;
    }
    getFilter(field) {
        if (!field) throw new Error("Must include a field to get filter");
        if (!this._filterFields[field]) throw new Error("Field '"+field+"' is not defined in schema");
        if (!this._filterFields[field].filter) throw new Error("Field '"+field+"' is not defined to be able to filter in schema");
        return this._filterFields[field].data;
    }
    clearFilters() {
        for (var f in this._filterFields) {
            if (this._filterFields[f].filter)
                this._filterFields[f].data = NONE ;
            if (this._filterFields[field].dimension)
                this._filterFields[field].dimension.filterAll();
        }
    }
    all(reset) { if (reset) this._all = this._filter.groupAll();return this._all; }
  // return the group for the field filtered.

    @autobind
    group(field,groupName) {
        if (!field) throw new Error("A field name is required to get a dimension");
        if (!this._filter) throw new Error("Data has not been set. Cannot get a dimension");
        if (!this._filterFields[field]) throw new Error(`Field '${field}' is not a defined dimension`);
        // now, make sure that the group exists for that field.
        if (!this._schema[field].group[groupName]) throw new Error(`Field '${field}' does not have a defined grouping '${groupName}'.`);
        if (!this._filterFields[field].dimension)
            this.getDimension(field);
        if (this._filterFields[field].group[groupName]) return this._filterFields[field].group[groupName];
        return this._group(field,groupName,this._filterFields[field].dimension);
    }

    @Private
    _group(field,groupName,dimension){
        var schemaGroup = this._schema[field].group[groupName], group;
        if (funcType === typeof schemaGroup.map)
            group = dimension._group(schemaGroup.map);
        else {
            group = dimension._group();
            if (stringType === typeof schemaGroup.map)
                group.mapKey = function(d){
                    return schemaGroup.keyMap[d];
                }
        }
        this._filterFields[field].group[groupName] = group;
        if (!schemaGroup.reduce) schemaGroup.reduce = 'count';
        if (schemaGroup.order) group.order(schemaGroup.order);
        switch(schemaGroup.reduce) {
            case 'stats':
                if (funcType === typeof schemaGroup.field)
                    group.reduceSum(schemaGroup.field);
                else
                    group.reduce.apply(group,(function(f,c,dim){return [
                        function(p,d){
                            p.value+=d[f];
                            p.max=Math.max(p.max,d[f]);
                            p.min=Math.min(p.min,d[f]);
                            p.avg=p.value/(++p.count);
                            return p;
                        }
                      , function(p,d){
                            p.value-=d[f];
                            if(d[f]==p.min||d[f]==p.max){
                                var v=p.min;
                                p.min=p.max;
                                p.max=v;
                                p=dim.reduce((p,c)=>({min:Math.min(c[f],p.min),max:Math.max(a[f],b)}),p);
                            }
                            p.avg=p.value/--p.count;
                            return p;
                        }
                      , function(){return {value:0,min:0,max:0,avg:0,count:0}}
                    ]})(schemaGroup.field||this._filterFields[field].field,this._filterFields[field].column,this._filterFields[field].dimension.top(Infinity)));
            break
            case 'sum':
                if (funcType === typeof schemaGroup.sum)
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
        return this._filterFields[field].group[groupName];
    }
    pivot(groups) {
        return this._filter.pivotGroup(groups);
    }
    @autobind
    getDimension(field) {
        if (!field) throw new Error("A field name is required to get a dimension");
        if (!this._filter) throw new Error("Data has not been set. Cannot get a dimension");
        if (!this._filterFields[field]) throw new Error(`Field '${field}' is not a defined dimension`);

        if (!this._filterFields[field].dimension) {
            //this._filterFields[field].groupAll = filterFields[field].dimension.groupAll()
            //this._filterFields[field].filter = (function(f){return function(data){self.filter(f,data);return this}})(field)
            //this._filterFields[field].group = (function(f){return function(data){return self.group(f,data)}})(field)
            this._filterFields[field].dimension = this._filter.dimension(this._filterFields[field].filter);
            this._filterFields[field].dimension._group = this._filterFields[field].dimension.group;
            this._filterFields[field].dimension.group = (group) => {
                if (funcType == typeof group) return this._filterFields[field].dimension._group(group);
                return this._group(field,group,this._filterFields[field].dimension);
            }
            this._events.dimensionCreated.emit(field,this._filterFields[field].dimension);
        }
        return this._filterFields[field].dimension;
    }
}

export default DataManager;
