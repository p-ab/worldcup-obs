import {reSortData, reSortGames} from "../helpers/games";
const axios = require('axios');
const mysql = require('mysql2');
const mysqlConfig = require('../configs/mysql.js');
const pool = mysql.createPool(mysqlConfig);

const API_URL = 'https://raw.githubusercontent.com/lsv/fifa-worldcup-2018/master/data.json';
const host_url = 'http://localhost:3000/groupstage/';

function getData(req, res) {
    axios.get(API_URL)
        .then(response => {
            const data = reSortData(response.data.groups);
            const games = data.games;
            const closest_game = data.closest_game[0];

            axios.get(host_url + 'games').then(response => {
                const count = reSortGames(response.data.data, games);
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
    const query = `SELECT id, game, game_id FROM games ORDER BY game_id`;

    pool.query(query, (error, results, fields) => {
        if (error) throw error;
        res.send({status: 'ok', message: 'Games', data: results});
    });
}

export {getData, getGames};
