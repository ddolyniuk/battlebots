exports = module.exports = User;

function User(con, options) {
    this.Username = options.user;
    this.Password = options.pass;
    this.Email = options.email;
    this.PrivLevel = options.privLevel;
    this.LastLoginIP = options.lastLoginIP;
    this.LastLogin = options.lastLogin;
    this.CreationDate = options.creationDate;
}

exports.createNewUser = function(con, user, pass, email, options) {
    var priv = 0;
    if(options != undefined)
        priv = options.privLevel;
        
    con.query("INSERT INTO Users (Username, Password, Email, PrivLevel) VALUES ('"+user+"', '"+pass+"', '"+email+"', '"+priv+"')");
}
