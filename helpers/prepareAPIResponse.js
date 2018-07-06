const mysql = require('mysql2');
const mysqlConfig = require('../configs/mysql.js');
const pool = mysql.createPool(mysqlConfig);
const DATA = require('../DATA/teams.json');
const teams = DATA.teams;

const prepareAPIResponse = (data) => {
    let games = [];
    let closest_game = [];

    for (const stage of Object.keys(data)) {
        let unfinishedGames = [];
        data[stage].matches.map( match => {
            const game = getRuName(match.home_team) + ' — ' + getRuName(match.away_team);
            const score = match.home_result + ' — ' + match.away_result;
            const id = match.name;
            const date = new Date(match.date).getTime();
            let penalty = null;
            if (stage !== 'groups' && match.home_penalty !== null) {
                penalty = match.home_penalty + ' — ' + match.away_penalty;
            }
            if (match.finished) {
                games.push({
                    id, game, score, date, penalty, 
                    group: stage
                });
            } else {
                unfinishedGames.push({
                    game, score, date, 
                    match_id: id,
                    text_date: match.date,
                    current_server_date: new Date()
                })
            }
        });
        if (unfinishedGames.length !== 0) {
            unfinishedGames.sort( (a, b) => a.date - b.date );
            closest_game.push(unfinishedGames[0]);
        }
    }
    if (closest_game.length !== 0)
        closest_game.sort( ( a, b ) => a.date - b.date );
    return {games, closest_game};
};

const getRuName = (id) => {
    let name = '';
    for (let i=0, len=teams.length; i<len; i++)
        if (teams[i].id === id)
            name = teams[i].ru_name;
    return name;
};

module.exports = prepareAPIResponse;