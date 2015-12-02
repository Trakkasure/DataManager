// from the dispatcher in D3.js
(function(scope) {
scope.dispatch = function() {
  var d = new dispatch,
      i = -1,
      n = arguments.length;
  while (++i < n) d[arguments[i]] = dispatch_event(d);
  return d;
};

function dispatch() {}

dispatch.prototype.on = function(type, listener) {
  var i = type.indexOf("."),
      name = "";

  // Extract optional namespace, e.g., "click.foo"
  if (i > 0) {
    name = type.substring(i + 1);
    type = type.substring(0, i);
  }

  return arguments.length < 2
      ? this[type].on(name)
      : this[type].on(name, listener);
};

function dispatch_event(dispatch) {
  var listeners = [],
      listenerByName = {}

  function event() {
    var z = listeners, // defensive reference
        i = -1,
        n = z.length,
        l;
    while (++i < n) if (l = z[i].on) l.apply(this, arguments);
    return dispatch;
  }

  event.on = function(name, listener) {
    var l = listenerByName[name],
        i;

    // return the current listener, if any
    if (arguments.length < 2) return l && l.on;

    // remove the old listener, if any (with copy-on-write)
    if (l) {
      l.on = null;
      listeners = listeners.slice(0, i = listeners.indexOf(l)).concat(listeners.slice(i + 1));
      delete listenerByName[name];
    }

    // add the new listener, if any
    if (listener) listeners.push({on: listener});

    return dispatch;
  };

  return event;
}
})(dataManager)
