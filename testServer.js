/*
 * Quick and dirty web server for testing.
 * Doesn't require any third party modules.
 * Doesn't call any other code.
 */
var http = require('http')
var fs = require('fs')
var URL = require('url')
var exec = require('child_process').exec;


var mime = {
    'js'  : 'application/javascript'
  , 'html': 'text/html'
  , 'php' : 'application/php'
  , 'json': 'application/json'
  , 'csv' : 'text/csv'
}
var server = http.createServer(function (req, res) {
    var url = URL.parse(req.url)
    
    if (url === "/")  {
        res.writeHead(200, {'Content-Type': 'text/html'})
        return res.end(fs.readFileSync('index.html'))
    }

    var ext = mime[url.pathname.match(/\.(\w+)$/).pop()]||'text/plain'

    console.log('%s - %s - %s',new Date(),url.pathname,url.query);

    // This was a request of someone at one time. It may or may not work depending on your environment
    if (ext == 'application/php') {
        var child = exec('php -f ' +url.pathname.substr(1),function(err,stdout,stderr) {
            res.writeHead(200, {'Content-Type': 'text/html'})
            console.log('%s - phpcgi - %s',new Date(),stderr);
            res.end(stdout);
        })
        return
    }

    if (fs.existsSync('.'+url.pathname)) {
        try {
            var file = fs.readFileSync('.'+url.pathname)
            res.writeHead(200, {'Content-Type': ext})
            return res.end(file)
        } catch(e) {
            res.writeHead(500,{'Content-Type':'text/plain'});
            return res.end('500 Internal server Error: '+JSON.stringify(e))
        }
    } else {
        res.writeHead(404,{'Content-Type':'text/plain'});
        return res.end('404 could not find page: '+url.pathname)
    }
})
    
server.listen(8000);

