const prepareAPIResponse = require('../helpers/prepareAPIResponse');
const updateGamesTable = require('../helpers/updateGamesTable');
const axios = require('axios');
const mysql = require('mysql2');
const mysqlConfig = require('../configs/mysql.js');
const pool = mysql.createPool(mysqlConfig);

const API_URL = 'https://raw.githubusercontent.com/lsv/fifa-worldcup-2018/master/data.json';
const groupstage_url = process.env.HOST_URL + 'groupstage/';
const playoff_url = process.env.HOST_URL + 'playoff/';

function pullData(req, res) {
    axios.get(API_URL)
        .then(response => {
            const stage = res.locals.type;            
            const data = prepareAPIResponse(response.data[stage]);
            const games = data.games;
            const closest_game = data.closest_game[0];
            const url = stage === 'groups' ? groupstage_url : playoff_url;

            axios.get(url + 'games').then(response => {
                const count = updateGamesTable(response.data.data, games, stage);
                console.log('Loaded games: ', count);
                res.send({status: 'ok',
                    new_data: count,
                    message: 'Total: ' + count + ' new games',
                    next_game: closest_game})
            })
            .catch(e => console.log(e));
        })
        .catch(e => console.log(e));
}

function getGames(req, res) {
    const groups_query = `SELECT id, game, game_id FROM group_games ORDER BY game_id`;
    const knockout_query = `SELECT id, game, game_id, round, penalty FROM knockout_games ORDER BY game_id`;
    const query = res.locals.type === 'groups' ? groups_query : knockout_query;

    pool.query(query, (error, results, fields) => {
        if (error) throw error;
        res.send({status: 'ok', message: 'Games', data: results});
    });
}

function getStat(req, res) {
    const groups_query = `SELECT country, group_games FROM teams ORDER BY country`;
    const knockout_query = `SELECT country, knockout_games FROM teams WHERE knockout_games IS NOT NULL ORDER BY country`;
    const query = res.locals.type === 'groups' ? groups_query : knockout_query;

    pool.query(query, (error, results, fields) => {
        if (error) throw error;
        res.send({ status: 'ok', message: 'Games', data: results });
    });
}
module.exports = { pullData, getGames, getStat };