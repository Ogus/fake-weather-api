var express = require('express');
var router = express.Router();


router.get('/', function(req, res, next) {
  // let start = (new Date().setHours(0)).toISOString();
  // let stop = (new Date()).toISOString();
  let start, stop, fail = false;

  if(!req.query.start){ fail = true; }
  else{ start = req.query.start; }

  if(!req.query.stop) { fail = true; }
  else { stop = req.query.stop; }

  if(fail){
    res.status(400).send();
  }

  req.db.query([
    "SELECT * FROM position WHERE time >= '" + start + "' AND time <= '" + stop + "' ORDER BY time desc",
    "SELECT * FROM sensors WHERE time >= '" + start + "' AND time <= '" + stop + "' ORDER BY time desc",
    "SELECT * FROM rainfall WHERE time >= '" + start + "' AND time <= '" + stop + "' ORDER BY time desc"
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
    res.status(500).send(err.stack)
  });
});

router.get('/:type', function(req, res, next) {
  let start, stop, fail = false;

  if(!req.query.start){ fail = true; }
  else{ start = req.query.start; }

  if(!req.query.stop) { fail = true; }
  else { stop = req.query.stop; }

  if(fail){
    res.status(400).send();
  }


  let query = buildQuery(req.params.type);
  if(query.table == "") {
    res.status(404).send();
  }

  req.db.query(
    "SELECT "+ query.attribute + " FROM " + query.table +
    " WHERE time >= '" + start + "' AND time <= '" + stop + "' ORDER BY time desc"
  )
  .then(result => {
    result.forEach(e => delete e.time);

    let json = {};
    json[req.params.type] = result;
    res.json(json);
  })
  .catch(err => {
    res.status(500).send(err.stack)
  });

});

router.get('/:type/:spec', function(req, res, next) {
  let start, stop, fail = false;

  if(!req.query.start){ fail = true; }
  else{ start = req.query.start; }

  if(!req.query.stop) { fail = true; }
  else { stop = req.query.stop; }

  if(fail){
    res.status(400).send();
  }

  let query = buildQuery(req.params.type, req.params.spec);
  if(query.table == "") {
    res.status(400).send();
  }

  req.db.query(
    "SELECT "+ query.attribute + " FROM " + query.table +
    " WHERE time >= '" + start + "'AND time <= '" + stop + "' ORDER BY time desc"
  )
  .then(result => {
    let json = {};
    json[req.params.spec] = result.map(e => e[query.attribute]);
    res.json(json);
  })
  .catch(err => {
    res.status(500).send(err.stack)
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
