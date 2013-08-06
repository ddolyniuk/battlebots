exports = module.exports = User;

function User(options) {
    this.Username = options.user;
    this.Password = options.pass;
    this.Email = options.email;
    this.PrivLevel = options.privLevel;
    this.LastLoginIP = options.lastLoginIP;
    this.LastLogin = options.lastLogin;
    this.CreationDate = options.creationDate;
}