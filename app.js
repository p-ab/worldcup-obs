const axios = require('axios');
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mysqlPromise = require('mysql2/promise');
const mysqlConfig = require('./configs/mysql.js');

const indexRouter = require('./routes/index');
const groupsRouter = require('./routes/group-games');
const groupstage_url = 'http://localhost:3000/groupstage/';

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/groupstage', groupsRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

const runApp = async () => {
  const query_games = `create table if not exists games (
          id int(11) NOT NULL AUTO_INCREMENT,
          game varchar(220) NOT NULL,
          score varchar(9) NOT NULL,
          game_id int(11) NOT NULL,
          PRIMARY KEY(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  const query_teams = `create table if not exists teams (
          id int(11) NOT NULL AUTO_INCREMENT,
          country varchar(30) NOT NULL,
          basket varchar(3) NOT NULL,
          group_games json DEFAULT NULL,
          knockout_games json DEFAULT NULL,
          PRIMARY KEY(id),
          UNIQUE KEY country (country)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`

  try {
    const connection = await mysqlPromise.createConnection(mysqlConfig);
    const initGames = await connection.execute(query_games);
    const initTeams = await connection.execute(query_teams);
    connection.destroy();

    axios.get(groupstage_url + 'data')
      .then(response => { 
        if (response.data.next_game) {
          const cron_date = response.data.next_game.text_date;
          initCron(cron_date);
        }
        console.log('Web-server running on localhost:3000');
      })
      .catch(e => console.log(e))
  } catch(e) {
    console.log(e);
  }

}

const initCron = (match_date) => {
  let js_game_time = new Date(match_date);
  Date.prototype.addHours = function(h){
    this.setHours(this.getHours()+h);
    return this;
  }
  js_game_time.addHours(1);
  let day = js_game_time.getUTCDate();
  let hours = js_game_time.getHours();
  const config = '0-15,50-59/3 ' + hours + ',' + ++hours + ' ' + day + ' * *';
  let task = cron.schedule(config, function(){
    console.log('Cron running')
    axios.get(groupstage_url + 'data')
      .then(response => { 
        if (response.data.new_data !== 0) {
          task.destroy();
          const cron_time = response.data.next_game.text_date;
          initCron(cron_time);
        };
      })
      .catch(e => console.log(e))
  });
  task.start();
}


runApp();

module.exports = app;
