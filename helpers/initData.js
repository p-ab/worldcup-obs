const axios = require('axios');
const mysqlPromise = require('mysql2/promise');
const mysqlConfig = require('../configs/mysql.js');
const cron = require('node-cron');

const groupstage_url = process.env.HOST_URL + 'groupstage/';
const playoff_url = process.env.HOST_URL + 'playoff/';

const query_groupstage = `create table if not exists group_games (
        id int(11) NOT NULL AUTO_INCREMENT,
        game varchar(220) NOT NULL,
        score varchar(9) NOT NULL,
        game_id int(11) NOT NULL,
        PRIMARY KEY(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
const query_playoff = `create table if not exists knockout_games (
        id int(11) NOT NULL AUTO_INCREMENT,
        game varchar(220) NOT NULL,
        score varchar(9) NOT NULL,
        game_id int(11) NOT NULL,
        round varchar(9) NOT NULL,
        penalty varchar(9) DEFAULT NULL,
        PRIMARY KEY(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
const query_teams = `create table if not exists teams (
        id int(11) NOT NULL AUTO_INCREMENT,
        country varchar(30) NOT NULL,
        basket varchar(3) DEFAULT NULL,
        group_games json DEFAULT NULL,
        knockout_games json DEFAULT NULL,
        PRIMARY KEY(id),
        UNIQUE KEY country (country)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`

const runApp = async () => {

  try {
    const connection = await mysqlPromise.createConnection(mysqlConfig);
    const initGroupGames = await connection.execute(query_groupstage);
    const initKnockoutGames = await connection.execute(query_playoff);
    const initTeams = await connection.execute(query_teams);
    connection.destroy();

    axios.get(groupstage_url + 'data')
      .then(groups => { 
        if (groups.data.next_game) {
          const cron_date = groups.data.next_game.text_date;
          const stage = 'groups';
          initCron(cron_date, stage);
        } else {

          axios.get(playoff_url + 'data')
            .then(playoff => { 
              if (playoff.data.next_game) {
                const cron_date = playoff.data.next_game.text_date;
                const stage = 'playoff';
                initCron(cron_date, stage);
              }
            })
            .catch(e => console.log(e))
        }
        console.log('Success');
      })
      .catch(e => console.log(e))
  } catch(e) {
    console.log(e);
  }
}

const initCron = (match_date, stage) => {
  const url = stage === 'groups' ? groupstage_url : playoff_url;
  let js_game_time = new Date(match_date);
  Date.prototype.addHours = function(h){
    this.setHours(this.getHours()+h);
    return this;
  }
  js_game_time.addHours(2);
  let day = js_game_time.getUTCDate();
  let hours = js_game_time.getHours();
  console.log('Cron will run at: ', js_game_time);
  const config = '*/3 ' + hours + ' ' + day + ' * *';
  let task = cron.schedule(config, function(){
    console.log('Cron running')
    axios.get(url + 'data')
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

module.exports = runApp;