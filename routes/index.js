var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

router.get('/room/:id', function(req, res, next) {
  res.render('index');
});

module.exports = router;
