/*global __dirname require */

/*
 * Server-side application for simulating a mahjong game.
 * Usage: node app.js
 * Then visit http://localhost:3000/game
 */
var argv = require('optimist').argv,
    config = require('./server/config'),
    crypto = require('./server/crypto'),
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

// Socket.io session configuration
io.set("authorization", function (data, callback) {
    if (data && data.query && data.query.token) {
        var sessionId = crypto.decrypt(data.query.token);
        sessionStore.get(sessionId, function (error, session) {
            // Add the sessionId. This will show up in
            // socket.handshake.sessionId.
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

io.on("connection", function (socket) {
    console.log("Socket connection for session ID: " + socket.handshake.sessionId);
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
