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
        var site_data = self.sites[req.url],
            site_url = site_data.url,
            site_secret = site_data.secret;
        console.log(site_data);
        console.log(req.params.secret);
        if (payload.repository.url === site_url &&
            req.params.secret === site_secret) {
            res.send({ result: 'ok' }, 200);
            callback(payload.repository.name, payload);            
        } else {
            return next();
        }
    }
};

module.exports = cgh;
