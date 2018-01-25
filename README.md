# Fake Weather API
A very small tool to provide mock-up weather data, build with Node.js and InfluxDB

*This application was built during a school project*

## Installation

To run this application you will need ::

+ [Node.js 8+](https://nodejs.org/en/)

+ [Influx DB](https://portal.influxdata.com/downloads)

+ Administrator privileges


After cloning / downloading the repo, the app can be launched with the following steps:

+ Start the Influx DB service on your computer

+ Go into each subfolder (fakesonde, influxupdate, weather-api) and start each node application with `npm start`

+ Enjoy :smiley:


## Fake Sonde

This app create fake weather data, geolocation, and rainfall information, based on the time of the day. Each type of data is saved in a log on your computer, for later use.

Every parameter can be changed from the `config.yml` file

## Influx Update

This app uses the influxdb service to watch for log file changes, and write any new information in a database. 

The `config.json` should be changed to declare the path to the log file previously created (same path as in `config.yml`)

## Weather API

This app is a Node / Express server that expose the data to any request with two different API:

+ An API providing the last data created by the fake sonde
+ An API providing a set of data from a time interval

The weather data is returned as a json, with the following format:

```json
{
  "location": [
    {
      "date": String, (ISO 8601 date)
      "longtidude": float,
      "latitude": float
    }
  ],
  "rainfall": [
    {
      "date": String (ISO 8601 date)
    }
  ],
  "measurements": [
    {
      "temperature": float,
      "pression": float,
      "humidity": float,
      "luminosity": float,
      "wind_heading": float,
      "wind_speed_avg": float,
      "wind_speed_min": float,
      "wind_speed_max": float
    }
  ]
}
```

This format is inspired by the work made on [PiouPiou](http://developers.pioupiou.fr/).

The `rainfall` information indicate the date of the last date at which rain was detected.

Each data type (location, rainfall, measurements) is a list of object, to keep the same format between the two API. The only difference is the number of objects in the list (one for a query on the last data, many for a time interval).