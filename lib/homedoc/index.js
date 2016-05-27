var router = require('express').Router({ mergeParams: true });
module.exports = router;

router.get('/', function(req, res) {

  res.set('Content-Type', 'application/vnd.uber+json');
  var minimalDocument = `
{
  "uber": {
    "version": "1.0"
  }
}`;
  return res.status(200).send(minimalDocument);

});
