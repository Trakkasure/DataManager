var dataManager = require("./dataManager.js").DataManager;
var expect = require('expect');
var chai=require('chai');
var crossfilter = require('crossfilter');

var schema = {
    "date" : { // filtering on the date field
        "type": "date" // parse into a date
      //, filter: "date" // a missing filter line means it will use the name of this record "date".
      , "group": {
            "hours": {
                "map": function(d) {
                  d = new Date(+d)
                  d.setHours(d.getHours(), 0, 0, 0)
                  return d
                }
            }
          , "quantity": {
                "reduce" : "sum" // reduce by summing
                // If not specifying this field, then use the dimension filter field
                //, map: "date" // group by date. Dates are by day anyhow
              , "sum": "quantity" // sum the invoice quantity field.
            }
          , "total": {
                "reduce" : "sum" // reduce by summing
              , "sum": "total" // sum the total bill field
            }
          , "tip": {
                "reduce" : "sum" // reduce by summing
              , "sum": "tip" // sum the tip field
            }
          , "items": {
            //reduce : "sum" // reduce is missing. Assumes count.
            }
        }
    }
  , "qty": { // this is an arbitrary name used to access this filter.
        "type": "integer"
      , "filter": "quantity" // use the quantity field to filter
      , "group": {
            "invoice": {
                "reduce":"sum" // Want to sum in reduce.
              , "sum": "invoice_quantity" // field to sum by.
            }
          , "total": {
                "reduce" : "sum" // reduce by summing
              , "sum": "total" // sum the total bill field
            }
          , "tip": {
                "reduce" : "sum" // reduce by summing
              , "sum": "tip" // sum the tip field
            }
        }
    }
  , "total": {  // Importing the field without grouping it.
        "type": "integer"
    }
  , "tip": {  // Importing the field without grouping it.
        "type": "integer"
    }
  , "type": {
        "type": "string"
      , "group": {
            "quantity": {
                "reduce" : "sum" // reduce by summing
                // If not specifying this field, then use the dimension filter field
                //, map: "date" // group by date. Dates are by day anyhow
              , "sum": "quantity" // sum the invoice quantity field.
            }
          , "total": {
                "reduce" : "sum" // reduce by summing
              , "sum": "total" // sum the total bill field
            }
          , "tip": {
                "reduce" : "sum" // reduce by summing
              , "sum": "tip" // sum the tip field
            }
          , "items": {
                //reduce : "sum" // reduce is missing. Assumes count.
            }
        }
    }
}
         // Typically data retrieved via JSON has all values quoted
        var cfData = [
          {"date": "2011-11-14T16:17:54Z", "quantity": "2", "total": "190", "tip": "100", "type": "tab"},
          {"date": "2011-11-14T16:20:19Z", "quantity": "2", "total": "190", "tip": "100", "type": "tab"},
          {"date": "2011-11-14T16:28:54Z", "quantity": "1", "total": "300", "tip": "200", "type": "visa"},
          {"date": "2011-11-14T16:30:43Z", "quantity": "2", "total": "90", "tip": "0", "type": "tab"},
          {"date": "2011-11-14T16:48:46Z", "quantity": "2", "total": "90", "tip": "0", "type": "tab"},
          {"date": "2011-11-14T16:53:41Z", "quantity": "2", "total": "90", "tip": "0", "type": "tab"},
          {"date": "2011-11-14T16:54:06Z", "quantity": "1", "total": "100", "tip": "null", "type": "cash"},
          {"date": "2011-11-14T17:02:03Z", "quantity": "2", "total": "90", "tip": "0", "type": "tab"},
          {"date": "2011-11-14T17:07:21Z", "quantity": "2", "total": "90", "tip": "0", "type": "tab"},
          {"date": "2011-11-14T17:22:59Z", "quantity": "2", "total": "90", "tip": "0", "type": "tab"},
          {"date": "2011-11-14T17:25:45Z", "quantity": "2", "total": "200", "tip": "null", "type": "cash"},
          {"date": "2011-11-14T17:29:52Z", "quantity": "1", "total": "200", "tip": "100", "type": "visa"},
          {"date": "2011-11-14T17:33:46Z", "quantity": "2", "total": "190", "tip": "100", "type": "tab"},
          {"date": "2011-11-14T17:33:59Z", "quantity": "2", "total": "90", "tip": "0", "type": "tab"},
          {"date": "2011-11-14T17:38:40Z", "quantity": "2", "total": "200", "tip": "100", "type": "visa"},
          {"date": "2011-11-14T17:52:02Z", "quantity": "2", "total": "90", "tip": "0", "type": "tab"},
          {"date": "2011-11-14T18:02:42Z", "quantity": "2", "total": "190", "tip": "100", "type": "tab"},
          {"date": "2011-11-14T18:02:51Z", "quantity": "2", "total": "190", "tip": "100", "type": "tab"},
          {"date": "2011-11-14T18:12:54Z", "quantity": "1", "total": "200", "tip": "100", "type": "visa"},
          {"date": "2011-11-14T18:14:53Z", "quantity": "2", "total": "100", "tip": "null", "type": "cash"},
          {"date": "2011-11-14T18:45:24Z", "quantity": "2", "total": "90", "tip": "0", "type": "tab"},
          {"date": "2011-11-14T19:00:31Z", "quantity": "2", "total": "190", "tip": "100", "type": "tab"},
          {"date": "2011-11-14T19:04:22Z", "quantity": "2", "total": "90", "tip": "0", "type": "tab"},
          {"date": "2011-11-14T19:30:44Z", "quantity": "2", "total": "90", "tip": "0", "type": "tab"},
          {"date": "2011-11-14T20:06:33Z", "quantity": "1", "total": "100", "tip": "null", "type": "cash"},
          {"date": "2011-11-14T20:49:07Z", "quantity": "2", "total": "290", "tip": "200", "type": "tab"},
          {"date": "2011-11-14T21:05:36Z", "quantity": "2", "total": "90", "tip": "0", "type": "tab"},
          {"date": "2011-11-14T21:18:48Z", "quantity": "4", "total": "270", "tip": "0", "type": "tab"},
          {"date": "2011-11-14T21:22:31Z", "quantity": "1", "total": "200", "tip": "100", "type": "visa"},
          {"date": "2011-11-14T21:26:30Z", "quantity": "2", "total": "190", "tip": "100", "type": "tab"},
          {"date": "2011-11-14T21:30:55Z", "quantity": "2", "total": "190", "tip": "100", "type": "tab"},
          {"date": "2011-11-14T21:31:05Z", "quantity": "2", "total": "90", "tip": "0", "type": "tab"},
          {"date": "2011-11-14T22:30:22Z", "quantity": "2", "total": "89", "tip": "0", "type": "tab"},
          {"date": "2011-11-14T22:34:28Z", "quantity": "2", "total": "190", "tip": "100", "type": "tab"},
          {"date": "2011-11-14T22:48:05Z", "quantity": "2", "total": "91", "tip": "0", "type": "tab"},
          {"date": "2011-11-14T22:51:40Z", "quantity": "2", "total": "190", "tip": "100", "type": "tab"},
          {"date": "2011-11-14T22:58:54Z", "quantity": "2", "total": "100", "tip": "0", "type": "visa"},
          {"date": "2011-11-14T23:06:25Z", "quantity": "2", "total": "190", "tip": "100", "type": "tab"},
          {"date": "2011-11-14T23:07:58Z", "quantity": "2", "total": "190", "tip": "100", "type": "tab"},
          {"date": "2011-11-14T23:16:09Z", "quantity": "1", "total": "200", "tip": "100", "type": "visa"},
          {"date": "2011-11-14T23:21:22Z", "quantity": "2", "total": "190", "tip": "100", "type": "tab"},
          {"date": "2011-11-14T23:23:29Z", "quantity": "2", "total": "190", "tip": "100", "type": "tab"},
          {"date": "2011-11-14T23:28:54Z", "quantity": "2", "total": "190", "tip": "100", "type": "tab"}
        ]
              DM = new dataManager(crossfilter);

              expect(DM).toBeA('object');
                 // Need to check schema stuf
                DM.schema(schema);
                DM.setData(cfData);
                var d = DM.getDimension('total').top(1)[0];
                [
                    {date:Date}
                  , {quantity:'number'}
                  , {total:'number'}
                  , {tip:'number'}
                  , {type:'string'}
                ]
                .forEach(function(t) {
                    var k = Object.keys(t)[0];
                    expect(d[k]).toBeAn(t[k]);
                })
                  expect(DM.getDimension('total').top(3).slice(0)).toInclude([
                    {date: (new Date("2011-11-14T16:28:54Z")), quantity: 1, total: 300, tip: 200, type: "visa"},
                    {date: (new Date("2011-11-14T20:49:07Z")), quantity: 2, total: 290, tip: 200, type: "tab"},
                    {date: (new Date("2011-11-14T21:18:48Z")), quantity: 4, total: 270, tip: 0, type: "tab"}
                  ],function(b,a){return expect(a).toInclude(b);});
                  expect(DM.getDimension('date').top(3).slice(0)).toInclude([
                    {date: (new Date("2011-11-14T23:28:54Z")), quantity: 2, total: 190, tip: 100, type: "tab"},
                    {date: (new Date("2011-11-14T23:23:29Z")), quantity: 2, total: 190, tip: 100, type: "tab"},
                    {date: (new Date("2011-11-14T23:21:22Z")), quantity: 2, total: 190, tip: 100, type: "tab"}
                  ],function(b,a){return expect(a).toInclude(b);})
                  try {
                    DM.filter('qty',4)
                    expect(DM.getDimension('total').top(3).slice(0)).toInclude([
                      {date: "2011-11-14T21:18:48Z", quantity: 4, total: 270, tip: 0, type: "tab"}
                    ],function(b,a){return expect(a).toInclude(b);})
                  } catch (e) { }

                  DM.filter('qty',DM.NONE) // filter-all
                  expect(DM.getDimension('total').top(3).slice(0)).toInclude([
                    {date: (new Date("2011-11-14T16:28:54Z")), quantity: 1, total: 300, tip: 200, type: "visa"},
                    {date: (new Date("2011-11-14T20:49:07Z")), quantity: 2, total: 290, tip: 200, type: "tab"},
                    {date: (new Date("2011-11-14T21:18:48Z")), quantity: 4, total: 270, tip: 0, type: "tab"}
                  ],function(b,a){return expect(a).toInclude(b);})

                  try {
                    DM.filter('date',[new Date(Date.UTC(2011, 10, 14, 19)), new Date(Date.UTC(2011, 10, 14, 20))]);
                    expect(DM.getDimension('date').top(10).slice(0)).toInclude([
                      {date: new Date("2011-11-14T19:30:44Z"), quantity: 2, total: 90, tip: 0, type: "tab"},
                      {date: new Date("2011-11-14T19:04:22Z"), quantity: 2, total: 90, tip: 0, type: "tab"},
                      {date: new Date("2011-11-14T19:00:31Z"), quantity: 2, total: 190, tip: 100, type: "tab"}
                    ],function(b,a){return expect(a).toInclude(b);})
                    DM.filter('date',[Date.UTC(2011, 10, 14, 19), Date.UTC(2011, 10, 14, 20)]);
                    expect(DM.getDimension('date').top(10).slice(0)).toInclude([
                      {date: new Date("2011-11-14T19:30:44Z"), quantity: 2, total: 90, tip: 0, type: "tab"},
                      {date: new Date("2011-11-14T19:04:22Z"), quantity: 2, total: 90, tip: 0, type: "tab"},
                      {date: new Date("2011-11-14T19:00:31Z"), quantity: 2, total: 190, tip: 100, type: "tab"}
                    ],function(b,a){return expect(a).toInclude(b);})
                  } finally {
                    DM.filter('date',DM.NONE)
                  }
                  try {
                    DM.filter('type','tab')
                    expect(DM.getDimension('total').top(2).slice(0)).toInclude([
                      {date: new Date("2011-11-14T20:49:07Z"), quantity: 2, total: 290, tip: 200, type: "tab"},
                      {date: new Date("2011-11-14T21:18:48Z"), quantity: 4, total: 270, tip: 0, type: "tab"}
                    ],function(b,a){return expect(a).toInclude(b);})
                    DM.filter('type','visa')
                    expect(DM.getDimension('total').top(1).slice(0)).toInclude([
                      {date: new Date("2011-11-14T16:28:54Z"), quantity: 1, total: 300, tip: 200, type: "visa"}
                    ],function(b,a){return expect(a).toInclude(b);})
                    DM.filter('qty',2)
                    expect(DM.getDimension('tip').top(1).slice(0)).toInclude([
                      {date: new Date("2011-11-14T17:38:40Z"), quantity: 2, total: 200, tip: 100, type: "visa"}
                    ],function(b,a){return expect(a).toInclude(b);})
                  } finally {
                    DM.filter('qty',DM.NONE)
                    DM.filter('type',DM.NONE)
                  }
                  try {
                    DM.filter('type','tab')
                    expect(DM.getDimension('date').top(2).slice(0)).toInclude([
                      {date: new Date("2011-11-14T23:28:54Z"), quantity: 2, total: 190, tip: 100, type: "tab"},
                      {date: new Date("2011-11-14T23:23:29Z"), quantity: 2, total: 190, tip: 100, type: "tab"}
                    ],function(b,a){return expect(a).toInclude(b);})
                    DM.filter('type','visa')
                    expect(DM.getDimension('date').top(1).slice(0)).toInclude([
                      {date: new Date("2011-11-14T23:16:09Z"), quantity: 1, total: 200, tip: 100, type: "visa"}
                    ],function(b,a){return expect(a).toInclude(b);})
                    DM.filter('qty',2)
                    expect(DM.getDimension('date').top(1).slice(0)).toInclude([
                      {date: new Date("2011-11-14T22:58:54Z"), quantity: 2, total: 100, tip: 0, type: "visa"}
                    ],function(b,a){return expect(a).toInclude(b);})
                  } finally {
                    DM.filter('qty',DM.NONE)
                    DM.filter('type',DM.NONE)
                  }

                  expect(
                    DM.getDimension('qty').top(0).length
                  ).toBe(0);
                  expect(
                    DM.getDimension('qty').top(-1).length
                  ).toBe(0);
                  expect(
                    DM.getDimension('qty').top(NaN).length
                  ).toBe(0);
                  expect(
                    DM.getDimension('qty').top(-Infinity).length
                  ).toBe(0);
                  expect(
                    DM.getDimension('date').top(0).length
                  ).toBe(0);
                  expect(
                    DM.getDimension('date').top(-1).length
                  ).toBe(0);
                  expect(
                    DM.getDimension('date').top(NaN).length
                  ).toBe(0);
                  expect(
                    DM.getDimension('date').top(-Infinity).length
                  ).toBe(0);

                  expect(DM.getDimension('total').bottom(3).slice(0)).toInclude([
                    {date: new Date("2011-11-14T22:30:22Z"), quantity: 2, total: 89, tip: 0, type: "tab"},
                    {date: new Date("2011-11-14T16:30:43Z"), quantity: 2, total: 90, tip: 0, type: "tab"},
                    {date: new Date("2011-11-14T16:48:46Z"), quantity: 2, total: 90, tip: 0, type: "tab"}
                  ],function(b,a){return expect(a).toInclude(b);})
                  expect(DM.getDimension('date').bottom(3).slice(0)).toInclude([
                    {date: new Date("2011-11-14T16:17:54Z"), quantity: 2, total: 190, tip: 100, type: "tab"},
                    {date: new Date("2011-11-14T16:20:19Z"), quantity: 2, total: 190, tip: 100, type: "tab"},
                    {date: new Date("2011-11-14T16:28:54Z"), quantity: 1, total: 300, tip: 200, type: "visa"}
                  ],function(b,a){return expect(a).toInclude(b);})

                  try {
                    DM.filter('qty',4)
                    expect(DM.getDimension('total').bottom(3).slice(0)).toInclude([
                      {date: new Date("2011-11-14T21:18:48Z"), quantity: 4, total: 270, tip: 0, type: "tab"}
                    ],function(b,a){return expect(a).toInclude(b);})
                  } finally {
                    DM.filter('qty',DM.NONE) // filter-all
                  }
                  expect(DM.getDimension('total').bottom(3).slice(0)).toInclude([
                    {date: new Date("2011-11-14T22:30:22Z"), quantity: 2, total: 89, tip: 0, type: "tab"},
                    {date: new Date("2011-11-14T16:30:43Z"), quantity: 2, total: 90, tip: 0, type: "tab"},
                    {date: new Date("2011-11-14T16:48:46Z"), quantity: 2, total: 90, tip: 0, type: "tab"}
                  ],function(b,a){return expect(a).toInclude(b);})

                  try {
                    DM.filter('date',[new Date(Date.UTC(2011, 10, 14, 19)), new Date(Date.UTC(2011, 10, 14, 20))]);
                    expect(DM.getDimension('date').bottom(10).slice(0)).toInclude([
                      {date: new Date("2011-11-14T19:00:31Z"), quantity: 2, total: 190, tip: 100, type: "tab"},
                      {date: new Date("2011-11-14T19:04:22Z"), quantity: 2, total: 90, tip: 0, type: "tab"},
                      {date: new Date("2011-11-14T19:30:44Z"), quantity: 2, total: 90, tip: 0, type: "tab"}
                    ],function(b,a){return expect(a).toInclude(b);})
                    DM.filter('date',[Date.UTC(2011, 10, 14, 19), Date.UTC(2011, 10, 14, 20)]);
                    expect(DM.getDimension('date').bottom(10).slice(0)).toInclude([
                      {date: new Date("2011-11-14T19:00:31Z"), quantity: 2, total: 190, type: "tab", tip: 100},
                      {date: new Date("2011-11-14T19:04:22Z"), quantity: 2, total: 90, type: "tab", tip: 0},
                      {date: new Date("2011-11-14T19:30:44Z"), quantity: 2, total: 90, type: "tab", tip: 0}
                    ],function(b,a){return expect(a).toInclude(b);})
                  } finally {
                    DM.filter('date',DM.NONE)
                  }
                  try {
                    DM.filter('type','tab')
                    expect(DM.getDimension('total').bottom(2).slice(0)).toInclude([
                      {date: new Date("2011-11-14T22:30:22Z"), quantity: 2, total: 89, tip: 0, type: "tab"},
                      {date: new Date("2011-11-14T16:30:43Z"), quantity: 2, total: 90, tip: 0, type: "tab"}
                    ],function(b,a){return expect(a).toInclude(b);})
                    DM.filter('type','visa')
                    expect(DM.getDimension('total').bottom(1).slice(0)).toInclude([
                      {date: new Date("2011-11-14T22:58:54Z"), quantity: 2, total: 100, tip: 0, type: "visa"}
                    ],function(b,a){return expect(a).toInclude(b);})
                    DM.filter('qty',2)
                    expect(DM.getDimension('tip').bottom(1).slice(0)).toInclude([
                      {date: new Date("2011-11-14T22:58:54Z"), quantity: 2, total: 100, tip: 0, type: "visa"}
                    ],function(b,a){return expect(a).toInclude(b);})
                  } finally {
                    DM.filter('qty',DM.NONE)
                    DM.filter('type',DM.NONE)
                  }
                  try {
                    DM.filter('type','tab')
                    expect(DM.getDimension('date').bottom(2).slice(0)).toInclude([
                      {date: new Date("2011-11-14T16:17:54Z"), quantity: 2, total: 190, tip: 100, type: "tab"},
                      {date: new Date("2011-11-14T16:20:19Z"), quantity: 2, total: 190, tip: 100, type: "tab"}
                    ],function(b,a){return expect(a).toInclude(b);})
                    DM.filter('type','visa')
                    expect(DM.getDimension('date').bottom(1).slice(0)).toInclude([
                      {date: new Date("2011-11-14T16:28:54Z"), quantity: 1, total: 300, tip: 200, type: "visa"}
                    ],function(b,a){return expect(a).toInclude(b);})
                    DM.filter('qty',2)
                    expect(DM.getDimension('date').bottom(1).slice(0)).toInclude([
                      {date: new Date("2011-11-14T17:38:40Z"), quantity: 2, total: 200, tip: 100, type: "visa"}
                    ],function(b,a){return expect(a).toInclude(b);})
                  } finally {
                    DM.filter('qty',DM.NONE)
                    DM.filter('type',DM.NONE)
                  }

                  expect(
                    DM.getDimension('qty').top(0).length
                  ).toBe(0);
                  expect(
                    DM.getDimension('qty').top(-1).length
                  ).toBe(0);
                  expect(
                    DM.getDimension('qty').top(NaN).length
                  ).toBe(0);
                  expect(
                    DM.getDimension('qty').top(-Infinity).length
                  ).toBe(0);
                  expect(
                    DM.getDimension('date').top(0).length
                  ).toBe(0);
                  expect(
                    DM.getDimension('date').top(-1).length
                  ).toBe(0);
                  expect(
                    DM.getDimension('date').top(NaN).length
                  ).toBe(0);
                  expect(
                    DM.getDimension('date').top(-Infinity).length
                  ).toBe(0);

                  try {
                    DM.filter('tip',100)
                    expect(DM.getDimension('date').top(2).slice(0)).toInclude([
                      {date: new Date("2011-11-14T23:28:54Z"), quantity: 2, total: 190, tip: 100, type: "tab"},
                      {date: new Date("2011-11-14T23:23:29Z"), quantity: 2, total: 190, tip: 100, type: "tab"}
                    ],function(b,a){return expect(a).toInclude(b);})
                  } finally {
                    DM.filter('tip',DM.NONE)
                  }
                    try {
                      DM.filter('tip',null)
                      expect(DM.getDimension('date').top(2).slice(0)).toInclude([
                        {date: new Date("2011-11-14T22:58:54Z"), quantity: 2, total: 100, tip: 0, type: "visa"},
                        {date: new Date("2011-11-14T22:48:05Z"), quantity: 2, total: 91, tip: 0, type: "tab"}
                      ],function(b,a){return expect(a).toInclude(b);})
                    } finally {
                      DM.filter('tip',DM.NONE)
                    }

                try {
                  DM.filter('total',[100,190])
                  expect(DM.getDimension('date').top(Infinity).slice(0).every(function(d) { return d.total >= 100; })).to.be.true
                  DM.filter('total',[110,190])
                  expect(DM.getDimension('date').top(Infinity).slice(0).every(function(d) { return d.total >= 110; })).to.be.true
                } finally {
                  DM.filter('total',DM.NONE)
                }
                try {
                  DM.filter('total',[100,200])
                  expect(DM.getDimension('date').top(Infinity).slice(0).every(function(d) { return d.total < 200; })).to.be.true
                  DM.filter('total',[100,190])
                  expect(DM.getDimension('date').top(Infinity).slice(0).every(function(d) { return d.total < 190; })).to.be.true
                } finally {
                  DM.filter('total',DM.NONE)
                }

                  DM.filter('total',[100,200])
                  expect(DM.getDimension('date').top(Infinity).slice(0).length).to.be.below(43)
                  DM.filter('total',DM.NONE)
                  expect(DM.getDimension('date').top(Infinity).slice(0).length).isEqual(43)

                try {
                  DM.filter('total',[0, 100], 190, [200, 300])
                  expect(DM.getDimension('total').top(Infinity).slice(0).every(function(d){
                    return d.total >= 0 && d.total < 100 || d.total >= 200 && d.total < 300 || d.total == 190;
                  })).to.be.true
                  expect(DM.getDimension('total').top(Infinity).length).isEqual(38)
                } finally {
                  DM.filter('total',DM.NONE)
                }
                try {
                  DM.filter('total',[0, 100], 190, [200, 300])
                  DM.filter('total',[200, 300])
                  expect(DM.all().value()).isEqual(8)
                } finally {
                  DM.filter('total',DM.NONE)
                }
                try {
                  expect(DM.filter('total',190, [0, 100], [200, 300])).isEqual(DM);
                } finally {
                  DM.filter('total',DM.NONE)
                }
                try {
                  DM.filter('total',[0, 200], 190);
                  expect(DM.getDimension('total').top(Infinity).length).isEqual(34)
                } finally {
                  DM.filter('total',DM.NONE)
                }
                try {
                  DM.filter('total',function(d) { return d === 100; })
                  expect(DM.getDimension('total').top(Infinity).every(function(d) {
                    return d.total === 100
                  })).to.be.true
                  expect(DM.getDimension('total').top(Infinity).length).isEqual(4)
                } finally {
                  DM.filter('total',DM.NONE)
                }
                try {
                  DM.filter('total',function(d) { return d === 190; })
                  DM.all().value()
                  DM.filter('total',function(d) { return d === 100; })
                  expect(DM.all().value()).isEqual(4)
                  expect(DM.getDimension('total').top(Infinity).length).isEqual(4)
                } finally {
                  DM.filter('total',DM.NONE)
                }

              var quantityCount = DM.getDimension('qty').groupAll()
              expect(quantityCount).to.not.contain.keys('top','order')

                  try {
                    quantityCount.reduce(
                        function(p, v) { return p + v.total },
                        function(p, v) { return p - v.total },
                        function() { return 0 })
                    expect(quantityCount.value()).isEqual(6660)
                  } finally {
                    quantityCount.reduceCount()
                  }

                  quantityCount.reduceSum(function(d) { return d.total })
                  expect(quantityCount.value()).isEqual(6660)
                  quantityCount.reduceCount()
                  expect(quantityCount.value()).isEqual(43)

                  try {
                    quantityCount.reduceSum(function(d) { return d.total })
                    expect(quantityCount.value()).isEqual(6660)
                    quantityCount.reduceSum(function() { return 1 })
                    expect(quantityCount.value()).isEqual(43)
                  } finally {
                    quantityCount.reduceCount();
                  }

                    expect(quantityCount.value()).isEqual(43)
                  try {
                    DM.filter('qty',[100, 200])
                    expect(quantityCount.value()).isEqual(43)
                  } finally {
                    DM.filter('qty',DM.NONE)
                  }
                  try {
                    DM.filter('type',"tab")
                    expect(quantityCount.value()).isEqual(32)
                    DM.filter('type',"visa")
                    expect(quantityCount.value()).isEqual(7)
                    DM.filter('tip',100)
                    expect(quantityCount.value()).isEqual(5)
                  } finally {
                    DM.filter('type',DM.NONE)
                    DM.filter('tip',DM.NONE)
                  }

                var quantityTotal = DM.getDimension('qty').groupAll().reduceSum(function(d) { return d.total })
                expect(quantityTotal).to.not.contain.keys('top','order')

                  try {
                    quantityTotal.reduce(
                        function(p) { return p + 1; },
                        function(p) { return p - 1; },
                        function() { return 0 })
                    expect(quantityTotal.value()).isEqual(43)
                  } finally {
                    quantityTotal.reduceSum(function(d) { return d.total })
                  }

                    expect(quantityTotal.value()).isEqual(6660)
                  try {
                    DM.filter('qty',[100, 200])
                    expect(quantityTotal.value()).isEqual(6660)
                  } finally {
                    DM.filter('qty',DM.NONE)
                  }
                  try {
                    DM.filter('type',"tab")
                    expect(quantityTotal.value()).isEqual(4760)
                    DM.filter('type',"visa")
                    expect(quantityTotal.value()).isEqual(1400)
                    DM.filter('tip',100)
                    expect(quantityTotal.value()).isEqual(1000)
                  } finally {
                    DM.filter('type',DM.NONE)
                    DM.filter('tip',DM.NONE)
                  }

            //data.date.hours = data.date.group(function(d) { d = new Date(+d); d.setHours(d.getHours(), 0, 0, 0); return d; });
            //data.type.types = data.type.group();

                expect(DM.group('type').top(Infinity)).toInclude([
                    {key: "tab", value: 32}
                  , {key: "visa", value: 7}
                  , {key: "cash", value: 4}
                ],function(b,a){return expect(a).toInclude(b);})

                expect(data.date.hours.size()).isEqual(8)
                expect(data.type.types.size()).isEqual(3)
                try {
                  data.type.filterExact("tab")
                  data.quantity.filterRange([100, 200])
                  expect(data.date.hours.size()).isEqual(8)
                  expect(data.type.types.size()).isEqual(3)
                } finally {
                  data.quantity.filterAll()
                  data.type.filterAll()
                }

/*
            describe("reduce", function() {
              it("defaults to count", function() {
                assert.deepEqual(data.date.hours.top(1), [
                  {key: new Date(Date.UTC(2011, 10, 14, 17, 00, 00)), value: 9}
                ])
              })
              it("determines the computed reduce value", function() {
                try {
                  data.date.hours.reduceSum(function(d) { return d.total })
                  assert.deepEqual(data.date.hours.top(1), [
                    {key: new Date(Date.UTC(2011, 10, 14, 17, 00, 00)), value: 1240}
                  ])
                } finally {
                  data.date.hours.reduceCount()
                }
              })
            })

            describe("top", function() {
              it("returns the top k groups by reduce value, in descending order", function() {
                assert.deepEqual(data.date.hours.top(3), [
                  {key: new Date(Date.UTC(2011, 10, 14, 17, 00, 00)), value: 9}
                , {key: new Date(Date.UTC(2011, 10, 14, 16, 00, 00)), value: 7}
                , {key: new Date(Date.UTC(2011, 10, 14, 21, 00, 00)), value: 6}
                ])
              })
              it("observes the specified order", function() {
                try {
                  data.date.hours.order(function(v) { return -v })
                  assert.deepEqual(data.date.hours.top(3), [
                    {key: new Date(Date.UTC(2011, 10, 14, 20, 00, 00)), value: 2}
                  , {key: new Date(Date.UTC(2011, 10, 14, 19, 00, 00)), value: 3}
                  , {key: new Date(Date.UTC(2011, 10, 14, 18, 00, 00)), value: 5}
                  ])
                } finally {
                  data.date.hours.order(function(v) { return v; });
                }
              })
            })

            describe("order", function() {
              it("defaults to the identity function", function() {
                assert.deepEqual(data.date.hours.top(1), [
                  {key: new Date(Date.UTC(2011, 10, 14, 17, 00, 00)), value: 9}
                ])
              })
              it("is useful in conjunction with a compound reduce value", function() {
                try {
                  data.date.hours.reduce(
                      function(p, v) { ++p.count; p.total += v.total; return p },
                      function(p, v) { --p.count; p.total -= v.total; return p },
                      function() { return {count: 0, total: 0} })
                      .order(function(v) { return v.total; })
                  assert.deepEqual(data.date.hours.top(1), [
                    {key: new Date(Date.UTC(2011, 10, 14, 17, 00, 00)), value: {count: 9, total: 1240}}
                  ])
                } finally {
                  data.date.hours.reduceCount().orderNatural();
                }
              })
            })
          })

          describe("remove", function() {
            it("should remove dimension", function() {
              var data = tesseract([])
              var dimensions = d3.range(32).map(function(i) {
                return data.dimension(function() { return 0; })
              });
              dimensions.forEach(function(d) {
                d.remove();
              })
              data.dimension(function() { return 0; })
            })
          })

          describe("groupAll", function() {
              var data = {}
              data.all = DM.all().reduceSum(function(d) { return d.total })

            it("does not have top and order methods", function() {
                expect(data.all).to.not.contain.keys('top','order')
            })

            describe("reduce", function() {
              it("determines the computed reduce value", function() {
                try {
                  data.all.reduceCount()
                  expect(data.all.value()).isEqual(43)
                } finally {
                  data.all.reduceSum(function(d) { return d.total })
                }
              })
            })

            describe("value", function() {
              it("returns the sum total of matching records", function() {
                assert.strictEqual(data.all.value(), 6660)
              })
              it("observes all dimension's filters", function() {
                try {
                  data.type.filterExact("tab")
                  assert.strictEqual(data.all.value(), 4760)
                  data.type.filterExact("visa")
                  assert.strictEqual(data.all.value(), 1400)
                  data.tip.filterExact(100)
                  assert.strictEqual(data.all.value(), 1000)
                } finally {
                  data.type.filterAll()
                  data.tip.filterAll()
                }
              })
            })
          })

          describe("size", function() {
            it("returns the total number of elements", function() {
              assert.equal(data.size(), 43);
            })
            it("is not affected by any dimension filters", function() {
              try {
                data.quantity.filterExact(4)
                assert.equal(data.size(), 43)
              } finally {
                data.quantity.filterAll();
              }
            })
          })

          describe("add", function() {
            it("increases the size of the crossfilter", function() {
              var data = crossfilter([])
              assert.equal(data.size(), 0)
              data.add([0, 1, 2, 3, 4, 5, 6, 6, 6, 7])
              assert.equal(data.size(), 10)
              data.add([])
              assert.equal(data.size(), 10)
            })
            it("existing filters are consistent with new records", function() {
              var data = crossfilter([])
                , foo = data.dimension(function(d) { return +d; })
                , bar = data.dimension(function(d) { return -d; })
              assert.deepEqual(foo.top(Infinity), [])
              foo.filterExact(42)
              data.add([43, 42, 41])
              assert.deepEqual(foo.top(Infinity), [42])
              assert.deepEqual(bar.top(Infinity), [42])
              data.add([43, 42])
              assert.deepEqual(foo.top(Infinity), [42, 42])
              assert.deepEqual(bar.top(Infinity), [42, 42])
              foo.filterRange([42, 44])
              data.add([43])
              assert.deepEqual(foo.top(Infinity), [43, 43, 43, 42, 42])
              assert.deepEqual(bar.top(Infinity), [42, 42, 43, 43, 43])
              bar.filterExact([-43])
              assert.deepEqual(bar.top(Infinity), [43, 43, 43])
              data.add([43])
              assert.deepEqual(bar.top(Infinity), [43, 43, 43, 43])
              bar.filterAll()
              data.add([0])
              assert.deepEqual(bar.top(Infinity), [42, 42, 43, 43, 43, 43])
              foo.filterAll()
              assert.deepEqual(bar.top(Infinity), [0, 41, 42, 42, 43, 43, 43, 43])
            })
            it("existing groups are consistent with new records", function() {
              var data = crossfilter([])
                , foo = data.dimension(function(d) { return +d; })
                , bar = data.dimension(function(d) { return -d; })
                , foos = foo.group()
                , all = data.groupAll()
              assert.equal(all.value(), 0)
              assert.deepEqual(foos.all(), [])
              foo.filterExact(42)
              data.add([43, 42, 41])
              assert.equal(all.value(), 1)
              assert.deepEqual(foos.all(), [{key: 41, value: 1}, {key: 42, value: 1}, {key: 43, value: 1}])
              bar.filterExact(-42)
              assert.equal(all.value(), 1)
              assert.deepEqual(foos.all(), [{key: 41, value: 0}, {key: 42, value: 1}, {key: 43, value: 0}])
              data.add([43, 42, 41])
              assert.equal(all.value(), 2)
              assert.deepEqual(foos.all(), [{key: 41, value: 0}, {key: 42, value: 2}, {key: 43, value: 0}])
              bar.filterAll()
              assert.equal(all.value(), 2)
              assert.deepEqual(foos.all(), [{key: 41, value: 2}, {key: 42, value: 2}, {key: 43, value: 2}])
              foo.filterAll()
              assert.equal(all.value(), 6)
            })
            it("can add new groups that are before existing groups", function() {
              var data = crossfilter()
                , foo = data.dimension(function(d) { return +d; })
                , foos = foo.group().reduce(add, remove, initial).order(order)
              data.add([2]).add([1, 1, 1])
              assert.deepEqual(foos.top(2), [{key: 1, value: {foo: 3}}, {key: 2, value: {foo: 1}}])
              function order(p) { return p.foo }
              function add(p, v) { ++p.foo; return p }
              function remove(p, v) { --p.foo; return p }
              function initial() { return {foo: 0} }
            })
            it("can add more than 256 groups", function() {
              var data = crossfilter()
                , foo = data.dimension(function(d) { return +d; })
                , bar = data.dimension(function(d) { return +d; })
                , foos = foo.group()
              data.add(d3.range(0, 256))
              assert.deepEqual(foos.all().map(function(d) { return d.key }), d3.range(0, 256))
              assert(foos.all().every(function(d) { return d.value == 1 }))
              data.add([128])
              assert.deepEqual(foos.top(1), [{key: 128, value: 2}])
              bar.filterExact(0)
              data.add(d3.range(-256, 0))
              assert.deepEqual(foos.all().map(function(d) { return d.key }), d3.range(-256, 256))
              assert.deepEqual(foos.top(1), [{key: 0, value: 1}])
            })
            it("can add lots of groups in reverse order", function() {
              var data = crossfilter()
                , foo = data.dimension(function(d) { return -d.foo })
                , bar = data.dimension(function(d) { return d.bar })
                , foos = foo.group(Math.floor).reduceSum(function(d) { return d.foo })
              bar.filterExact(1)
              for (var i = 0; i < 1000; i++) {
                data.add(d3.range(10).map(function(d) {
                  return {foo: i + d / 10, bar: i % 4, baz: d + i * 10}
                }))
              }
              assert.deepEqual(foos.top(1), [{key: -998, value: 8977.5}])
            })
        })
/* */

function key(d) {
  return d.key;
}

