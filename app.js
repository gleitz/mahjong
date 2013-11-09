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

var MongoStore = require('connect-mongo')(express),
    sessionStore = new MongoStore({db: 'session'});

var app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    cookieParser = express.cookieParser(config.EXPRESS_COOKIE_SECRET);

app.configure(function(){
    app.use(express['static'](__dirname + '/public'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(cookieParser);
    app.use(express.session({
        store: sessionStore,
        secret: config.EXPRESS_SESSION_SECRET
    }));
    // configure socket.io session
    app.use(function(req, res, next) {
        res.locals.socketIoNamespace = 'game';
        res.locals.socketIoToken = AES.encrypt(req.session.id,
                                               config.SOCKET_IO_SECRET).toString();
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

// Socket.io configuration
io.set("authorization", function (data, callback) {
    if (data && data.query && data.query.token) {
        var sessionId = AES.decrypt(data.query.token,
                                    config.SOCKET_IO_SECRET).toString();
        sessionStore.get(sessionId, function (error, session) {
            // Add the sessionId. This will show up in
            // socket.handshake.sessionId.
            //
            // It's useful to set the ID and session separately because of
            // those fun times when you have an ID but no session - it makes
            // debugging that much easier.
            data.sessionId = sessionId;
            if (error) {
                callback("ERROR", false);
            } else if (!session) {
                callback("NO_SESSION", false);
            } else {
                // Add the session. This will show up in
                // socket.handshake.session.
                data.session = session;
                callback(null, true);
            }
        });
    } else {
        callback("NO_TOKEN", false);
    }
});

// Connect to the DB and then start the application
db.init(function(error) {
    if (error) {
        throw error;
    }
    var port = argv.port || 3000;
    server.listen(port);
    console.log("listening on " + port);
});
