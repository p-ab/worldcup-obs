const express = require('express');
const router = express.Router();
const axios = require('axios');
const mysql = require('mysql2');
const mysqlConfig = require('../configs/mysql.js');
const pool = mysql.createPool(mysqlConfig);

const API_URL = 'https://raw.githubusercontent.com/lsv/fifa-worldcup-2018/master/data.json';
const DATA = require('../DATA/teams.json');
const teams = DATA.teams;
const host_url = 'http://localhost:3000/groupstage/';

router.get('/data', (req, res) => {
 axios.get(API_URL)
    .then(response => {
      const data = reSortData(response.data.groups);
      const games = data.games;
      const closest_game = data.closest_game[0];

      axios.get(host_url + 'games').then(response => {
        const count = reSortGames(response.data.data, games)
        console.log('Loaded games: ', count)
        res.send({status: 'ok', 
                  new_data: count,
                  message: 'Total: ' + count + ' new games', 
                  next_game: closest_game})
      })
      .catch(e => console.log(e));
    })
    .catch(e => console.log(e));
});


router.get('/games', async (req, res) => {
  const query = `SELECT id, game, game_id FROM games ORDER BY game_id`;

  pool.query(query, (error, results, fields) => {
    if (error) throw error;
    res.send({status: 'ok', message: 'Games', data: results});
  });
});

/* * * * * * * *
* reSortData use inside next functions:
*   - getRuName(team_id)
* * * * * * * */
const reSortData = (data) => {
  let games = [];
  let closest_game = [];

  for (const group of Object.keys(data)) {
    let unfinishedGames = [];
    data[group].matches.map( match => {
      let gameRow = getRuName(match.home_team) + ' — ' + getRuName(match.away_team);
      let scoreRow = match.home_result + ' — ' + match.away_result;
      if (match.finished) {
        games.push({
          id: match.name,
          game: gameRow,
          group: group,
          score: scoreRow,
          date: new Date(match.date).getTime()
        });
      } else {
        unfinishedGames.push({ 
          match_id: match.name, 
          game: gameRow,
          score: scoreRow,
          date: new Date(match.date).getTime(),
          text_date: match.date,
          current_server_date: new Date()
        })
      }
    })
    if (unfinishedGames.length !== 0) {
      unfinishedGames.sort( (a, b) => a.date - b.date );
      closest_game.push(unfinishedGames[0]);
    }
  }
  if (closest_game.length !== 0)
    closest_game.sort( ( a, b ) => a.date - b.date );
  return {games, closest_game};
}

/* * * * * * * *
* reSortGames use inside next functions:
*   - insertGame(game, score, id)
*   - setCountrytat(team)
* * * * * * * */
const reSortGames = (rows, games) => {
  let haveArticle = true;
  let i = 0;
  let games_list = [];
  
  rows.forEach( row => games_list.push(row.game_id) );
  games.map( data => {
    let isGameExists = games_list.includes(data.id)
    if (!isGameExists) {
        let countries = data.game.split(' — ');
        i++;
        insertGame(data.game, data.score, data.id);
        setTimeout(() => {
          setCountryStat(countries[0], data.group);
          setCountryStat(countries[1], data.group);
        }, 1000);
        console.log('Loaded game: ', data.game);
      }
  })
  return i;
}

/* * * * * * * *
* setCountryStat use inside next functions:
*   - updateStat(country, data)
* * * * * * * */
const setCountryStat = async (country, basket) => {
  let query_title = "%" + country + "%";
  const query = `SELECT game, game_id, score FROM games WHERE game LIKE \"${query_title}\"`;

  pool.query(query, (error, results, fields) => {
    if (error) throw error;
    const games = results;
    let counts = { wins: 0, draws: 0, loses: 0, goals_scored: 0, goals_skipped: 0 }
    let games_list = [];
    const getScoreInfo = (score1, score2) => {
        if (score1 > score2) counts.wins++;
        else if (score1 < score2) counts.loses++;
        else counts.draws++;
    }
    games.map( x => {
      let game = x.game.split(' — '), score = x.score.split(' ');
      games_list.push(x.game_id);
      if (country === game[0]) {
        getScoreInfo(score[0], score[2])
        counts.goals_scored += +score[0];
        counts.goals_skipped += +score[2];
      } else {
        getScoreInfo(score[2], score[0])
        counts.goals_scored += +score[2];
        counts.goals_skipped += +score[0];
      }
    })
    let stats = {stat: counts, games: games_list};
    let query_stat = {
          goals: {
              scored: stats.stat.goals_scored,
              skipped: stats.stat.goals_skipped
          },
          stats: [
              stats.stat.wins,
              stats.stat.draws,
              stats.stat.loses
          ],
          id_list: stats.games
    }
    updateStat(country, basket, query_stat);
  });
};

const updateStat = async (country, basket, values) => {
  const strVals = JSON.stringify(values);
  const goals = JSON.stringify(values.goals);
  const stats = JSON.stringify(values.stats);
  const ids = JSON.stringify(values.id_list);
  const query1 = `INSERT INTO teams (country, basket, group_games) 
                  VALUES (\'${country}\', \'${basket}\', \'${strVals}\')
                  ON DUPLICATE KEY UPDATE group_games=`;
  const query2 = `JSON_INSERT(group_games, 
                    \'$.goals\', \'${goals}\', 
                    \'$.stats\', \'${stats}\', 
                    \'$.id_list\', \'${ids}\');`;
  const query = query1 + query2 ;

  pool.query(query, (error, results, fields) => {
    if (error) throw error;
  });
};

const getRuName = (id) => {
  let name = ''
  for (let i=0, len=teams.length; i<len; i++)
    if (teams[i].id === id)
      name = teams[i].ru_name;
  return name;
}

const insertGame = async (game, score, id) => {
  game = JSON.stringify(game);
  score = JSON.stringify(score);
  const queryHead = `INSERT INTO games (game, score, game_id) VALUES `;
  const queryBody = `( ${game}, ${score}, ${id} )`;
  const query = queryHead + queryBody;

  pool.query(query, (error, results, fields) => {
    if (error) throw error;
  });
}

module.exports = router;