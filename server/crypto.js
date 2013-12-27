var config = require('./config'),
    crypto = require('crypto');

function encrypt(text){
    var cipher = crypto.createCipher('aes-256-cbc',
                                     config.CRYPTO_AES_SECRET);
    var crypted = cipher.update(text, 'utf-8', 'hex');
    crypted += cipher.final('hex');
    return crypted;
}

function decrypt(text){
    var decipher = crypto.createDecipher('aes-256-cbc',
                                         config.CRYPTO_AES_SECRET);
    var dec = decipher.update(text, 'hex', 'utf-8');
    dec += decipher.final('utf-8');
    return dec;
}

function md5(text){
    var alg = crypto.createHash('md5');
    var encry = alg.update(text).digest('hex');
    return encry;
}

function sha256(text){
    var alg = crypto.createHash('sha256');
    var encry = alg.update(text).digest('hex');
    return encry;
}

module.exports.encrypt = encrypt;
module.exports.decrypt = decrypt;
module.exports.md5 = md5;
module.exports.sha256 = sha256;
