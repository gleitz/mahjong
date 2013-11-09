/*global __dirname require */

/*
 * Server-side application for simulating a mahjong game.
 * Usage: node app.js
 * Then visit http://localhost:3000/game
 */
var AES = require("crypto-js/aes"),
    argv = require('optimist').argv,
    config = require('./server/config'),
    db = require('./server/db'),
    express = require('express'),
    path = require('path'),
    shared = require('./shared/shared'),
    swig = require('swig');

var MongoStore = require('connect-mongo')(express);

var app = express();

app.configure(function(){
    app.use(express['static'](__dirname + '/public'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser());
    app.use(express.session({
        store: new MongoStore({db: 'session'}),
        secret: config.EXPRESS_SESSION_SECRET
    }));
    // configure socket.io session
    app.use(function(req, res, next) {
        res.locals.socketIoNamespace = 'game';
        res.locals.socketIoToken = AES.encrypt(req.session.id,
                                               config.SOCKET_IO_SECRET);
        next();
    });
    app.use(app.router);
    app.use(express.favicon(path.join(__dirname, 'public/img/favicon.ico')));
    app.use(express.errorHandler({dumpExceptions: true,
                                  showStack: true}));
});

// Swig templating
app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');
shared.augmentSwig(swig);

// Disable the cache
// TODO: remove in production
swig.setDefaults({ cache: false });
app.set('view cache', false);

// Add the application routes
require('./server/routes').addRoutes(app);

// Connect to the DB and then start the application
db.init(function(error) {
    if (error) {
        throw error;
    }
    var port = argv.port || 3000;
    app.listen(port);
    console.log("listening on " + port);
});
