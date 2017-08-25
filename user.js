var mongoose = require('mongoose');
var Schema 	 = mongoose.Schema;


var userSchema = new Schema({
    email         	 : { type: String, unique : true, required : true},
    password     	 : String,
    images			 : [String]
});

module.exports = mongoose.model('User', userSchema);

