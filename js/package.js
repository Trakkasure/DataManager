var util = require("util")

util.puts(JSON.stringify({
    "name": "dataManager"
  , "version": "1.0.0"
  , "description": "Abstraction into crossfilter using schema."
  , "keywords": [
        "crossfilter"
      , "analytics"
      , "data"
      , "visualization"
    ]
  , "homepage": ""
  , "repository": {
        "type": "git"
      , "url": "https://github.com/Trakkasure/DataManager.git"
  }
  , "devDependencies": {
        "mocha": ">=1.7.4"
      , "uglify-js": ">=1.2.5"
  }
}, null, 2))
