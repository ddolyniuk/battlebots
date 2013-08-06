var express = require('express');
var app = express();
var io = require('socket.io'),
    mysql = require('mysql');
var LoginHandler = require('./libs/loginHandler'),
    RegisterHandler = require('./libs/registerHandler');
var DatabaseHandler = require('./libs/dbHandler');

var util = require('./libs/util');

var __sessions = [];
/**
*   Express Set up
*/
app.use('/public', express.static(__dirname+'/website'));

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.set('view options', {
    layout: false
});

app.use(express.cookieParser());
app.use(express.session({secret: 'ASODPIW129122478'}));
app.use(express.bodyParser());

/**
*   SQL Set up
*/
var __con = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'shadow',
  database : 'derecho'
});

/**
*   Handler Objects
*/

var loginHandler = new LoginHandler(__sessions, __con);
var registerHandler = new RegisterHandler(loginHandler, __sessions, __con);
var dbHandler = new DatabaseHandler(__con);
dbHandler.update();
/**
*   Page request handling
*/


/**
*   No session pages
*/
app.get('/about', function(req, res, next) {
    res.render('about');
});

app.post('/register', function(req, res, next) { 
    registerHandler.handleRequest(req, res, next); 
});

app.post('/login', function(req, res, next) {
    loginHandler.handleRequest(req, res, next);
});

/**
*   Pages requiring authentication
*/
app.get('/', checkLoggedIn, function(req, res, next) {
        res.render('signedin_header');
         
});

app.get('/workshop', checkLoggedIn, function(req, res, next) {
    var sessionKey = util.generateSessionKey();
    var sessID = req.session.sessionID;
    __sessions[sessID - 1].sessionKey = sessionKey;
    res.render('workshop_1', {sessionKey: sessionKey, sessionID: sessID});
});


/**
*   Middleware authentication check
*/
function checkLoggedIn(req, res, next) {
    if(!loginHandler.getIsLoggedIn(req, res)) {
        res.render('login_register');
        return false;
    }
    return next();
}

var server = app.listen(1337);

io = io.listen(server, {log:false});

console.log('Server running at http://127.0.0.1:1337/');

/**
*   Socket validation middleware
*/
function verifySocket(data) {
    var sessionID = data.sessionID;
    var sessionKey = data.sessionKey;
    if(__sessions[sessionID - 1].sessionKey == sessionKey)
        return true;
    return false;
}

/**
*   Socket event handling
*/
io.sockets.on('connection', function (socket) {
    socket.on('getWorkshopItems', function(data) {
        if(!verifySocket(data))
            return;
        socket.emit('sendWorkshopItems', {data: dbHandler.getWorkshopParts()});
    });
});