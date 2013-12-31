/*global module*/
var cgh = function (sites, callback) {
    var self = this;
    self.callback = callback;
    self.sites = sites;
    
    return function cgh(req, res, next) {
        if (!req.body || req.method !== 'POST') {
            return next();
        }
        if (Object.keys(self.sites).indexOf(req.url) === -1 ||
            req.header('x-github-event') !== 'push') {
            return next();
        }
        var payload;
        payload = typeof req.body.payload === 'object' ?
            req.body.payload : JSON.parse(req.body.payload);
        if (payload.repository.url === self.sites[req.url]) {
            res.send({ result: 'ok' }, 200);
            callback(payload.repository.name, payload);            
        } else {
            return next();
        }
    }
};

module.exports = cgh;
