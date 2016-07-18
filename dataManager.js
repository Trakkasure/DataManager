import $$observable from 'symbol-observable';
import {createChangeEmitter} from 'change-emitter';

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
const #private = ['schema','filter','filterFields','all','sourceData','total','events']
                 .reduce((p,v)=>{...p,[v]:new WeakMap()},{});

const NONE = function(){};
const funcType = typeof NONE;

class DataManager {
    constructor() {
        private schema = null;
        private filter = null;
        private filterFields = {};
        private all = null;
        private sourceData = null;
        private total = 0;
        private events = ['dataSet','dataChanged','schemaChanged','filterChanged','dimensionCreated','groupCreated']
                         .reduce((ev,all)=>({...all,[ev]: createChangeEmitter()}),{});
    }

    schema(_schema) {
        if (!_schema) return private.schema.get(this);
        var oldSchema = private.schema.get(this);
        for (var f in _schema) {
            if (funcType === typeof _schema[f])
                _schema[f] = {type:_schema[f],private.filter.get(this):f,column:f};
            if (_schema[f].filter === null) continue;
            this.filterFields[f] = {
                dimension:null
              , column:((funcType === typeof _schema[f].filter)?_schema[f].column:_schema[f].filter)||f
              , filter:(funcType === typeof _schema[f].filter)?_schema[f].filter
                    :((_schema[f].filter!==null)?(function(n){
                         return function(d){
                           return d[n] 
                         }
                       }
                       )(_schema[f].filter||f):null)
              , group: {} , data : NONE 
            };
        }
        private.schema.set(this,_schema);
        private.events.schemaChanged.emit(oldSchema,_schema);
        return this;
    }
    setData(data, clearFilters) {
        var i, f, column;
        // Process data to normalize into proper object types from JSON strings.
        this.total = data.length;
        for (f in this.filterFields) {
            if (this.filterFields[f].dimension) {
                this.filterFields[f].dimension.filterAll();
                this.filterFields[f].dimension.remove();
            }
            if (clearFilters)
                this.filterFields[f].data = NONE;
            this.filterFields[f].dimension=null;
            this.filterFields[f].group = {};
            for (var g in (this._schema[f].group ||{}))
                if ('string' === typeof this._schema[f].group[g].map)
                    this._schema[f].group[g].keyMap={};
        }
        for(i = 0;i<data.length;i++){
            for (f in this._schema) {
                column = this.filterFields[f]?this.filterFields[f].column:f
                if ('function' === typeof this._schema[f].type)
                    this._schema[f].type.apply(this,[data[i],column]);
                else if ((data[i][column]!==undefined)&&this._schema[f].type) {
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
                    for (var g in (this._schema[f].group||{}))
                        if ('string' === typeof this._schema[f].group[g].map) {
                            this._schema[f].group[g].keyMap[data[i][column]]=data[i][this._schema[f].group[g].map];
                        }
                }
            }
        }
        // Calling data changed here allows the data to be manipulated by the even handlers before crossfilter takes it.
        this.events.dataSet.emit(data);
        this._filter = crossfilter(data);
        this._all = this._filter.groupAll();
        this.events.dataChanged.emit(data);
        // Handling processing filters set before data was set.
        for (f in this.filterFields) {
            if (this.filterFields[f].data!=NONE) {
                i = this.filterFields[f].data;
                this.filterFields[f].data = NONE;
                this.filter.apply(self,[f].concat(i));
                i = null;
            }
        }
        return this;
    }
    filter(...data) {
        var field = data.shift() || null;
        if (!field) return this.filter; // get the crossfilter
        if (!this.filterFields[field]) throw "Field '"+field+"' is not defined in schema";
        if (!this.filterFields[field].filter) throw "Field '"+field+"' is not defined to be able to filter in schema";
        if (data.length) {
            if (!this.filterFields[field].dimension) {
                try {
                    this.getDimension(field);
                } catch (e) {
                    if (data[0]===NONE)
                        this.filterFields[field].data = NONE;
                    else
                        this.filterFields[field].data = data;
                    return
                }
            }
            if (data[0]===NONE)  {
                this.filterFields[field].dimension.filterAll();
                this.events.filterChanged.emit({field:field,old:this.filterFields[field].data,new:data});
                this.filterFields[field].data = NONE;
            } else
            if (data[0]===null)  {
                this.filterFields[field].dimension.filterExact(null);
                this.filterFields[field].data = [null];
            } else
            if (typeof(Function) === typeof(data[0]) || JSON.stringify(this.filterFields[field].data) != JSON.stringify(data)) {
                this.filterFields[field].dimension.filter.apply(this.filterFields[field].dimension,data);
                this.events.filterChanged.emit({field:field,old:this.filterFields[field].data,new:data});
                this.filterFields[field].data = data;
            }
        } else //return filterFields[field]
               this.filterFields[field].dimension.filterAll()
        return this;
    }
    getFilter(field) {
        if (!field) throw "Must include a field to get filter";
        if (!this.filterFields[field]) throw "Field '"+field+"' is not defined in schema";
        if (!this.filterFields[field].filter) throw "Field '"+field+"' is not defined to be able to filter in schema";
        return this.filterFields[field].data;
    }
    clearFilters() {
        for (f in this.filterFields) {
            if (this.filterFields[f].filter)
                this.filterFields[f].data = NONE ;
            if (this.filterFields[field].dimension)
                this.filterFields[field].dimension.filterAll();
        }
    }
    all(reset) { if (reset) this._all = this.filter.groupAll();return this._all; }
  // return the group for the field filtered.
    group(field,group) {
        if (!this._schema[field].group[group]) return null;
        if (!this.filterFields[field].dimension)
            this.getDimension(field); // make dimension.
        var groupName = group
          , schemaGroup = this._schema[field].group[groupName];
        if (!this.filterFields[field].group[group]) {
            if ('function' === typeof schemaGroup.map)
                group = this.filterFields[field].dimension.group(schemaGroup.map);
            else {
                group = this.filterFields[field].dimension.group();
                if ('string' === typeof schemaGroup.map)
                    group.mapKey = function(d){
                        return schemaGroup.keyMap[d];
                    }
            }
            this.filterFields[field].group[groupName] = group;
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
                        schemaGroup.add||(function(f){return function(p,d){p.value+=d[f];return p}})(this.filterFields[field].column)
                      , schemaGroup.sub||(function(f){return function(p,d){p.value-=d[f];return p}})(this.filterFields[field].column)
                      , schemaGroup.init||function(){return {value:0}}
                    );
                break
                //default:
                // Do the default
            }
            this.events.groupCreated.emit({field:field,groupName:groupName,group:group,dimension:this.filterFields[field].dimension});
        }
        return this.filterFields[field].group[groupName];
    }
    pivot(groups) {
        return this.filter.pivotGroup(groups);
    }
    getDimension(field) {
        if (!field) throw "A field name is required to get a dimension";
        if (!this.filter) throw "Data has not been set. Cannot get a dimension";
        if (!this.filterFields[field]) throw "Field '"+field+"' is not a defined dimension";

        if (!this.filterFields[field].dimension) {
            //filterFields[field].groupAll = filterFields[field].dimension.groupAll()
            //filterFields[field].filter = (function(f){return function(data){self.filter(f,data);return this}})(field)
            //filterFields[field].group = (function(f){return function(data){return self.group(f,data)}})(field)
            this.filterFields[field].dimension = this.filter.dimension(this.filterFields[field].filter);
            this.events.dimensionCreated.emit(field,this.filterFields[field].dimension);
        }
        return this.filterFields[field].dimension;
    }
}