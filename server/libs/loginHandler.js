exports = module.exports = LoginHandler;

function LoginHandler(sessions, connection) {
    this.__sessions = sessions;
    this.__con = connection;
}

LoginHandler.prototype.handleRequest = function(req, res, next) {
    var user = req.body.user;
    for(var i = 0; i <  this.__sessions.length; i++) {
        if(this.__sessions[i].user == user) {
            res.send("Already logged in!");
            return;
        }
    }
    
    this.getIsValidCredentials(req, res);
}

LoginHandler.prototype.getIsLoggedIn = function(req, res) {
    if(req.session == undefined)
        return false;
    var id = req.session.sessionID;
    var user = req.session.sessionUser;
    var ip = req.connection.remoteAddress;
    var session = this.__sessions[id-1];
    if(session != undefined && session.user == user && session.ip == ip)
        return true;
    return false;
}

LoginHandler.prototype.getIsValidCredentials = function(req, res) {
    var user = req.body.user;
    var pass = req.body.pass; 
    var self = this;
    this.__con.query('SELECT * FROM Users Where Username="'+user+'"', function(err, rows) {
        if(rows[0] != undefined) {
            if(user == rows[0].Username && pass == rows[0].Password)
                self.login(req, res);
        }
        else
            res.send("Username or password incorrect.");
    });    
}

LoginHandler.prototype.login = function(req, res) {
    var user = req.body.user;
    var pass = req.body.pass;
    
    var id = this.__sessions.push({user: user, ip: req.connection.remoteAddress});
    req.session.sessionID = id;
    req.session.sessionUser = user;
    res.redirect('/');
}