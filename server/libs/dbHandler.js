exports = module.exports = DatabaseHandler;

function DatabaseHandler(con) {
    this.__con = con;
    this.__lastUpdate = -1;
    this.__parts = [];
}

DatabaseHandler.prototype.getWorkshopParts = function() {
    var d = new Date();
    if(this.__lastUpdate != d.getHours()) {
        this.update();
    }
    return this.__parts;
}

DatabaseHandler.prototype.update = function() {
    var d = new Date();
    var self = this;
    this.__con.query('SELECT * FROM Parts', function(err, rows) {
        self.__parts = rows;
    });
    this.__lastUpdate = d.getHours();
}