var User = require('./tables/User');

exports = module.exports = RegisterHandler;

function RegisterHandler(loginHandler, sessions, connection) {
    this.__loginHandler = loginHandler;
    this.__sessions = sessions;
    this.__con = connection;
}

RegisterHandler.prototype.handleRequest = function(req, res, next) {
    var user = req.body.user;
    var pass = req.body.pass;
    var pass2 = req.body.pass2;
    var email = req.body.email;
    var errors = "";
    if(pass != pass2) {
        errors += "Your passwords do not match.\n";
    }
    
    if(!this.validateEmail(email)) {
        errors += "Your email is not valid\n";
    }    
    
    if(!this.validateUsername(user)) {
        errors += "Your username is not valid\n";
    }
    
    if(pass.length < 3) {
        errors += "Your password is too small!\n";
    }
    
    if(errors.length > 0) {
        res.send(errors);
        return;
    }
    
    this.getIsValidRegister(req, res);
}

RegisterHandler.prototype.getIsValidRegister = function(req, res) {
    var user = req.body.user;
    var pass = req.body.pass; 
    var email = req.body.email;
    var self = this;
    this.__con.query('SELECT * FROM Users Where Username="'+user+'" OR Email="'+email+'"', function(err, rows) {
        if(rows.length == 0) {
            self.createUser(user, pass, email);
            self.__loginHandler.login(req, res);
        }
    });
}

RegisterHandler.prototype.createUser = function(user, pass, email, priv) {
    var p = priv;
    if(priv === undefined)
        p = 0;
    this.__con.query("INSERT INTO Users (Username, Password, Email, PrivLevel) VALUES ('"+user+"', '"+pass+"', '"+email+"', '"+p+"')");
}

RegisterHandler.prototype.validateUsername = function(username) {
    var re = /[\w]{3,13}$/;
    return re.test(username);
}

RegisterHandler.prototype.validateEmail = function(email) { 
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}