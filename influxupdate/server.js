
var fs = require('fs');
var chokidar = require("chokidar");
var Influx = require("influx");
var http = require("http");
var ping = require("tcp-ping");

// /var/log/
// /dev/shm/

var config = null;
var db = null;
var watcher = null;
var server = null;


function startServer() {
  console.log("Start Server");
  try {
    loadFile("./config.json")
    .then(data => {
      config = JSON.parse(data);
      db = loadDataBase();
      return db.getDatabaseNames();

    })
    .then(names => {
      if (!names.includes("weather_db")) {
        return db.createDatabase("weather_db");
      }
    })
    .then(() => {
      startWatching();
    })
    .catch(err => console.log);
  }
  catch (e) {
    console.error(e);
    process.exit(1)
  }
}

function startWatching() {
  console.log("Start Watching");
  watcher = chokidar.watch([
    config.dataFolder+config.fileSensors,
    config.dataFolder+config.fileNmea,
    config.dataFolder+config.fileRain],
    {ignored: /(^|[\/\\])\../, persistent: true}
  );

  watcher.on("change", path => {
    let array = path.split("/");
    let file = array[array.length-1];

    switch (file) {
      case config.fileSensors:
        updateSensorsData();
        break;

      case config.fileNmea:
        updateNmeaData();
        break;

      case config.fileRain:
        updateRainData();
        break;
    }

    // let req = http.request({
    //   host: "127.0.0.1",
    //   port: "100",
    //   method: "GET"
    // }, function (res) {
    //   console.log(res);
    // });
    // req.write("change");
    // req.end();

    // ping.probe({
    //   address: "localhost",
    //   port: "100",
    //   timeout: "5",
    //   attempts: 1
    // }, (err, data) => {
    //   if(err){ throw err; }
    //   console.log(data);
    // });

  }).on("error", e => {
    console.log("Watcher error:", e);
  })
}


function updateSensorsData() {
  loadFile(config.dataFolder+config.fileSensors)
  .then(data => {
    console.log("update sensors");
    let json = JSON.parse(data);

    let date = String(json.date);
    let temperature = parseFloat(json.measure[0].value);
    let pressure = parseFloat(json.measure[1].value);
    let humidity = parseFloat(json.measure[2].value);
    let luminosity = parseFloat(json.measure[3].value);
    let wind_heading = parseFloat(json.measure[4].value);
    let wind_speed_avg = parseFloat(json.measure[5].value);
    let wind_speed_max = parseFloat(json.measure[6].value);
    let wind_speed_min = parseFloat(json.measure[7].value);

    db.writePoints([
      {
        measurement: "sensors",
        fields: {
          date: date,
          temperature: temperature,
          pressure: pressure,
          humidity: humidity,
          luminosity: luminosity,
          wind_heading: wind_heading,
          wind_speed_avg: wind_speed_avg,
          wind_speed_max: wind_speed_max,
          wind_speed_min: wind_speed_min,
        }
      }
    ]).catch(err => {
      console.error(`Error saving data to InfluxDB! ${err.stack}`);
    });

  }, err => {
    throw err
  })
  .catch(err => {
    console.log(err);
  });
}

function updateNmeaData() {
  loadFile(config.dataFolder+config.fileNmea)
  .then(data => {
    console.log("update gps");
    let rmc = data.split("\n")[1].split(",");

    let latitude = parseFloat(rmc[3]) * 0.01;
    let longitude = parseFloat(rmc[5]) * 0.01;
    let date = (new Date()).toISOString();

    db.writePoints([
      {
        measurement: "position",
        fields: {
          date: date,
          longitude: longitude,
          latitude: latitude,
        }
      }
    ]).catch(err => {
      console.error(`Error saving data to InfluxDB! ${err.stack}`);
    });

  }, err => {
    throw err
  })
  .catch(err => {
    console.log(err);
  });
}

function updateRainData() {
  loadFile(config.dataFolder+config.fileRain)
  .then(data => {
    let date = String(data).trim();
    console.log("update rain");

    db.writePoints([
      {
        measurement: "rainfall",
        fields: {
          date: date
        }
      }
    ]).catch(err => {
      console.error(`Error saving data to InfluxDB! ${err.stack}`);
    });

  }, err => {
    throw err
  })
  .catch(err => {
    console.log(err);
  });
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

function loadFile(path) {
  return new Promise(function(resolve, reject) {
    fs.readFile(path, "utf8", (error, data) => {
      if(error) {
        reject(error);
      }
      resolve(data);
    });
  });
}

startServer();
