var express = require('express');
var router = express.Router();


router.get('/', function(req, res, next) {
  req.db.query([
    "SELECT * FROM position ORDER BY time desc LIMIT 1",
    "SELECT * FROM sensors ORDER BY time desc LIMIT 1",
    "SELECT * FROM rainfall ORDER BY time desc LIMIT 1"
  ])
  .then(result => {
    result[0].forEach(e => delete e.time);
    result[1].forEach(e => delete e.time);
    result[2].forEach(e => delete e.time);

    res.json({
      location: result[0],
      measurements: result[1],
      rainfall: result[2]
    });
  })
  .catch(err => {
    res.status(500).send(err.stack);
  });
});

router.get('/:type', function(req, res, next) {
  let query = buildQuery(req.params.type);
  if(query.table == "") {
    res.status(404).send();
  }

  req.db.query(
    "SELECT "+ query.attribute + " FROM " + query.table + " ORDER BY time desc LIMIT 1"
  )
  .then(result => {
    result.forEach(e => delete e.time);

    let json = {};
    json[req.params.type] = result;
    res.json(json);
  })
  .catch(err => {
    res.status(500).send(err.stack);
  });

});

router.get('/:type/:spec', function(req, res, next) {
  let query = buildQuery(req.params.type, req.params.spec);
  if(query.table == "") {
    res.status(404).send();
  }

  req.db.query(
    "SELECT "+ query.attribute + " FROM " + query.table + " ORDER BY time desc LIMIT 1"
  )
  .then(result => {
    let json = {};
    json[req.params.spec] = result.map(e => e[query.attribute]);
    res.json(json);
  })
  .catch(err => {
    res.status(500).send(err.stack);
  });
});


function buildQuery(type, spec) {
  let table = "";
  let attribute = "*";

  switch (type) {
    case "location":
      table = "position"
      break;
    case "measurements":
      table = "sensors";
      break;
    case "rainfall":
      table = "rainfall";
      break;
  }

  if(!!spec) {
    if([
      "date",
      "longitude",
      "latitude",
      "temperature",
      "pressure",
      "humidity",
      "luminosity",
      "wind_heading",
      "wind_speed_avg",
      "wind_speed_max",
      "wind_speed_min"
    ].indexOf(spec) != -1) {
      attribute = spec;
    }
  }

  return {
    table: table,
    attribute: attribute
  };
}

module.exports = router;
