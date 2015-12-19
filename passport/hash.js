var crypto = require('crypto');
module.exports = function(password,salt){
	var hash = crypto.createHash('sha256');
    hash.update(password);
    hash.update(salt);
    return hash.digest('hex');
}