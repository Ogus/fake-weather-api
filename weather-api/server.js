var express = require('express');
// var path = require('path');
var logger = require('morgan');
var cors = require('cors');
var debug = require('debug')('foobar:server');
var http = require('http');
var Influx = require('influx');

var index = require('./routes/index');
var last = require('./routes/last');
var interval = require('./routes/interval');

var port = null, server = null, listener = null, db = null, io = null;
var app = express();

port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

db = loadDataBase();
// db.dropDatabase("weather_db");
db.getDatabaseNames()
.then(names => {
  if (!names.includes("weather_db")) {
    console.log("Database weather_db does not exists");
    process.exit(1);
  }
})
.then(() => {
  startServer();
})
.catch(err => {
  console.log(err);
  console.error("\nError creating Influx database !");
});

app.use(cors());

app.use(logger('dev'));

app.use(function (req, res, next) {
  let string = "\n";
  string += req.ip + "\n";
  string += req.get("Referrer") + "\n";
  string += req.get("user-agent") + "\n";
  string += "** " + req.originalUrl + " **\n";
  string += "START: " + req.query.start + " / STOP: " + req.query.stop;
  console.log(string);
  next();
});

app.use(function(req, res, next) {
  if(!!db) {
    req.db = db;
    next();
  }
  else{
    let err = new Error("No Database");
    err.status = 500;
    next(err);
  }
});

app.use('/', index);
app.use('/last', last);
app.use('/interval', interval);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});


function startServer() {
  server = http.createServer(app);
  io = require("socket.io")(server);

  server.listen(port, function () {
    console.log('Listening on port', port)
  });
  server.on('error', onError);
  server.on('listening', onListening);

  io.on('connection', socket => {
    socket.emit('message', {message: "Connection successful"});
  });

  setInterval(function () {
    io.emit('update');
    // console.log("io emit");
  }, 1000);


  // listener = http.createServer(function (req, res) {
  //   res.write("OK");
  //   res.end();
  // });
  // listener.listen(100);

}

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    return val;     // named pipe
  }

  if (port >= 0) {
    return port;    // port number
  }

  return false;
}

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
  debug('Listening on ' + bind);
}

function loadDataBase() {
  return new Influx.InfluxDB({
    host: "localhost",
    port: 8086,
    database: "weather_db",
    schema: [
      {
        measurement: "position",
        fields: {
          date: Influx.FieldType.STRING,
          longitude: Influx.FieldType.FLOAT,
          latitude: Influx.FieldType.FLOAT,
        },
        tags: [ "foobar" ]
      },

      {
        measurement: "sensors",
        fields: {
          date: Influx.FieldType.STRING,
          temperature: Influx.FieldType.FLOAT,
          pressure: Influx.FieldType.FLOAT,
          humidity: Influx.FieldType.FLOAT,
          luminosity: Influx.FieldType.FLOAT,
          wind_heading: Influx.FieldType.FLOAT,
          wind_speed_avg: Influx.FieldType.FLOAT,
          wind_speed_max: Influx.FieldType.FLOAT,
          wind_speed_min: Influx.FieldType.FLOAT,
        },
        tags: [ "foobar" ]
      },

      {
        measurement: "rainfall",
        fields: {
          date: Influx.FieldType.STRING
        },
        tags: [ "foobar" ]
      }
    ]
  });
}


module.exports = app;
