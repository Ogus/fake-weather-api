/*
Fake data for Weather station simulation
*/

var fs = require('fs');
var yaml = require('js-yaml');
var XXH = require("xxhashjs");

const encoding = 'utf8';
const seed = 0x9e3779b9;
var config = null;


// Load config file
function loadConfig(){
  let config = null;
  try {
    config = yaml.safeLoad(fs.readFileSync('./config.yml', encoding));
  }
  catch (e) {
    console.error(e);
    process.exit(1);
  }

  if(!config.dumpFolder) {
    config.dumpFolder = "/tmp";
  }

  return config;
}


/**
* Loop function to updates new data
*/
function loop(){
  let now = (new Date()).getTime();

  // if(!config)config=loadConfig()

  for (var dataConfig of config.fakeData) {
    var dataName = Object.keys(dataConfig)[0];
    dataConfig = dataConfig[dataName]

    // Initialization at first update
    if(!("lastUpdate" in dataConfig)){
      dataConfig.lastUpdate = now;
    }

    // detect uptate frequency
    if(now - dataConfig.lastUpdate > dataConfig.frequency) {
      dataConfig.lastUpdate = now;
      let type = dataConfig.type.toString(), newData = "";

      switch(type) {
        case "nmea":
          newData = getNmeaFakeData(dataConfig);
          break;
        case "rain":
          newData = getRainFakeData(dataConfig);
          break;
        case "sensors":
          newData = getSensorsFakeData(dataConfig);
          break;
        default:
          console.log('No file handler for type:', type);
      }

      console.log(type, newData);

      if(newData != "") {
        let mode = dataConfig.mode || 'w';
        try {
          writeDataToFile(newData, dataConfig.fileName, mode);
        }
        catch(e) {
          console.error(e);
          process.exit(1);
        }
      }

    }
  }

  setTimeout(loop, 100);
}


/**
*  get "NMEA type" data
*/
getNmeaFakeData = function(config){
  // all useless data are fake, even checksums
  let now = new Date();
  let fix = formatDigit(now.getUTCHours()) + formatDigit(now.getUTCMinutes()) +
            formatDigit(now.getUTCSeconds()) + "." + formatDigit(Math.floor(now.getUTCMilliseconds()/10));

  let fixDate = formatDigit(now.getDate()) + formatDigit(now.getMonth()+1) + formatDigit(now.getFullYear());

  let lat = config.latitude + (perlinNoise(now, 'latitude')*2 - 1) * config.variation.plani;
  let latString = ("0"+(lat*100).toFixed(3)).substr(-8);

  let lon = config.longitude + (perlinNoise(now, 'longitude')*2 - 1) * config.variation.plani;
  let lonString = ("00"+(lon*100).toFixed(3)).substr(-9);

  let alt = config.altitude + (perlinNoise(now, 'altitude')*2 - 1) * config.variation.alti;
  let altString = String(alt.toFixed(1));

  let check = String( Math.random().toString(16).substr(-2).toUpperCase() );

  //construct nmea frame
  let newData = ""
  for (var frame of config.data) {
    switch(frame) {
    case "GGA":
      newData += "$GPGGA,"+fix+","+latString+",N,"+lonString+",E,1,08,0.9,"+altString+",M,46.9,M,,*"+check+'\n';
      break;
    case "RMC":
      newData += "$GPRMC,"+fix+",A,"+latString+",N,"+lonString+",W,000.0,054.7,"+fixDate+",020.3,E*"+check+'\n';
      break;
    default :
      console.error("Unknown frame type:", frame);
    }
  }

  return newData;
}


/**
*  get "Rain type" data
*/
getRainFakeData = function(config){
  let time = new Date();
  let rain = perlinNoise(time, 'rainProbability') < config.rainProbability;
  if(rain) {
    return time.toISOString() + "\n";
  }
  return "";
}

/**
*  get "Sensors type (weather measures)" data
*/
getSensorsFakeData = function (config){
  let newData = "";
  let time = new Date();

  for (var measure of config.data) {
    var measureName = Object.keys(measure)[0];
    measure = measure[measureName];

    let value = 0;
    // function might be specified in config
    if("function" in measure){
      if(typeof this[measure.function] === "function" ){
        value = this[measure.function]() + perlinNoise(time, measureName)*measure.variation;
      }
      else{
        throw new Error("Config error : Function '"+measure.function+"' does not exists");
        process.exit(1);
      }
    }
    else{
      value = measure.range[0] + perlinNoise(time, measureName) * (measure.range[1] - measure.range[0]);
    }

    // value = Math.max(Math.min(value,measure.range[1]), measure.range[0])

    value = value.toFixed(measure.precision);

    if(newData != ""){ newData += "," }
    newData += '{"name":"' + measureName
            + '","desc":"' + measure.desc
            + '","unit":"' + measure.unit
            + '","value":"' + value
            + '"}';
  }

  newData = '{"date":"' + time.toISOString() + '","measure":[' + newData + ']}\n';
  return newData;
}

/**
* Simulate daylight value 0=> night 1=>day
*/
daylight = function(time){
  if(time == null || time == undefined) {
    time = new Date();
  }
  let h = time.getUTCHours();
  let m = time.getUTCMinutes();

  if (h < 7 || h >= 21){    // night
    return 0;
  }
  if (h >= 7 && h < 9) {  // sunrise
    return ((h-7)*60 + m) / 120;
  }
  if(h >= 19 && h < 21) { // sunset
    return 1- (((h-19)*60 + m) / 120);
  }
  return 1;
}


/**
* Utility methods
*/
function writeDataToFile(data,fileName,mode="w"){
  fs.writeFileSync(config.dumpFolder+"/"+fileName,data,encoding,0o666,mode)
}

function formatDigit(number){
  return ("0"+number).substr(-2)
}

function perlinNoise(time, e) {
  let result = 0;

  let day = time.getDay();
  let hour = time.getHours();
  let min = time.getMinutes();
  let sec = time.getSeconds();
  let millisec = time.getMilliseconds();

  // ----------

  let t1 = day;
  let t2 = (day + 1) % 7;
  let t = (hour*3600 + min*60 + sec) / 86400;

  let a = getRandom(String(t1)+String(e))*2 - 1;
  let b = getRandom(String(t2)+String(e))*2 - 1;
  result += lerp(smooth(t), a, b);

  // ----------

  t1 = hour;
  t2 = (hour + 1) % 24;
  t = (min*60000 + sec*1000 + millisec) / 3600000;

  a = getRandom(String(t1)+String(e))*2 - 1;
  b = getRandom(String(t2)+String(e))*2 - 1;
  result += lerp(smooth(t), a, b) * 0.4;

  // ----------

  t1 = min;
  t2 = (min + 1) % 60;
  t = (sec*1000 + millisec) / 60000;

  a = getRandom(String(t1)+String(e))*2 - 1;
  b = getRandom(String(t2)+String(e))*2 - 1;
  result += lerp(smooth(t), a, b) * 0.2;

  // ----------

  t1 = sec;
  t2 = (sec + 1) % 60;
  t = millisec / 1000;

  a = getRandom(String(t1)+String(e))*2 - 1;
  b = getRandom(String(t2)+String(e))*2 - 1;
  result += lerp(smooth(t), a, b) * 0.1;

  return (result + 1) * 0.5;
}

function lerp(t, a, b) {
  return a * (1-t) + b * t;
}

function smooth(t) {
  return t*t*(3-2*t);
}

function getRandom(e) {
  return (XXH.h32(e, seed).toNumber() & 0xffff) / 65536;
}

/**
* Exports functions for testing
*/
module.exports = {
  formatDigit,formatDigit,
  loadConfig:loadConfig,
  daylight:daylight,
  writeDataToFile:writeDataToFile,
  getRainFakeData:getRainFakeData,
  getSensorsFakeData:getSensorsFakeData,
  getNmeaFakeData:getNmeaFakeData
};

config = loadConfig();
loop()
