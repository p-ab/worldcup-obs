const mysql = require('mysql2');
const mysqlConfig = require('../configs/mysql.js');
const pool = mysql.createPool(mysqlConfig);

const updateGamesTable = (rows, games, stage) => {
    let haveArticle = true;
    let i = 0;
    let games_list = [];

    rows.forEach( row => games_list.push(row.game_id) );
    games.map( data => {
        const isGameExists = games_list.includes(data.id);
        if (!isGameExists) {
            let countries = data.game.split(' — ');
            i++;
            if ( stage === 'groups' ) {
                insertGroupGame(data.game, data.score, data.id);
                setTimeout(() => {
                    setGroupStat(countries[0], data.group);
                    setGroupStat(countries[1], data.group);
                }, 1000);
            } else {
                insertPlayoffGame(data.game, data.score, data.id, data.group, data.penalty);
                setTimeout(() => {
                    setPlayoffStat(countries[0]);
                    setPlayoffStat(countries[1]);
                }, 1000);
            }

            console.log('Loaded game: ', data.game);
        }
    });
    return i;
};



const setGroupStat = async (country, basket) => {
    let query_title = "%" + country + "%";
    const query = `SELECT game, game_id, score FROM group_games WHERE game LIKE \"${query_title}\"`;

    pool.query(query, (error, results, fields) => {
        if (error) throw error;
        const games = results;
        let games_list = [];
        let counts = { wins: 0, draws: 0, loses: 0, goals_scored: 0, goals_skipped: 0 }
        const getScoreInfo = (score1, score2) => {
            if (score1 > score2) counts.wins++;
            else if (score1 < score2) counts.loses++;
            else counts.draws++;
        };

        games.map( x => {
            let game = x.game.split(' — '), score = x.score.split(' ');
            games_list.push(x.game_id);
            if (country === game[0]) {
                getScoreInfo(score[0], score[2]);
                counts.goals_scored += +score[0];
                counts.goals_skipped += +score[2];
            } else {
                getScoreInfo(score[2], score[0]);
                counts.goals_scored += +score[2];
                counts.goals_skipped += +score[0];
            }
        });

        let query_stat = {
            goals: {
                "scored": counts.goals_scored,
                "skipped": counts.goals_skipped
            },
            stats: [
                counts.wins,
                counts.draws,
                counts.loses
            ],
            id_list: games_list
        };

        updateGroupStat(country, basket, query_stat);
    });
};

const setPlayoffStat = async (country) => {
    let query_title = "%" + country + "%";
    const query = `SELECT game, game_id, score, round FROM knockout_games WHERE game LIKE \"${query_title}\"`;

    pool.query(query, (error, results, fields) => {
        if (error) throw error;
        const games = results;
        let counts = { goals_scored: 0, goals_skipped: 0 }
        let games_list = [];
        let round = '';

        games.map( x => {
            let game = x.game.split(' — '), score = x.score.split(' ');
            games_list.push(x.game_id);
            round = x.round;
            if (country === game[0]) {
                counts.goals_scored += +score[0];
                counts.goals_skipped += +score[2];
            } else {
                counts.goals_scored += +score[2];
                counts.goals_skipped += +score[0];
            }
        });

        let query_stat = {
            goals: {
                scored: counts.goals_scored,
                skipped: counts.goals_skipped
            },
            round,
            id_list: games_list
        };

        updatePlayoffStat(country, query_stat);
    });
};

const updateGroupStat = async (country, basket, values) => {
    const strVals = JSON.stringify(values);
    const goals = JSON.stringify(values.goals);
    const stats = JSON.stringify(values.stats);
    const ids = JSON.stringify(values.id_list);
    const query1 = `INSERT INTO teams (country, basket, group_games) 
                  VALUES ('${country}', '${basket}', '${strVals}')
                  ON DUPLICATE KEY UPDATE group_games=`;
    const query2 = `JSON_SET(group_games, \'$.goals\', '${goals}', 
                    \'$.stats\', '${stats}', 
                    \'$.id_list\', '${ids}');`;
    const query = query1 + query2 ;

    pool.query(query, (error, results, fields) => {
        if (error) throw error;
    });
};

const updatePlayoffStat = async (country, values) => {
    const strVals = JSON.stringify(values);
    const goals = JSON.stringify(values.goals);
    const round = JSON.stringify(values.round);
    const ids = JSON.stringify(values.id_list);
    const query = `UPDATE teams SET knockout_games='${strVals}' WHERE country='${country}'`;

    pool.query(query, (error, results, fields) => {
        if (error) throw error;
    });
};

const insertGroupGame = async (game, score, id) => {
    game = JSON.stringify(game);
    score = JSON.stringify(score);
    const queryHead = `INSERT INTO group_games (game, score, game_id) VALUES `;
    const queryBody = `( ${game}, ${score}, ${id} )`;
    const query = queryHead + queryBody;

    pool.query(query, (error, results, fields) => {
        if (error) throw error;
    });
};

const insertPlayoffGame = async (game, score, id, round, penalty) => {
    game = JSON.stringify(game);
    score = JSON.stringify(score);
    round = JSON.stringify(round);
    penalty = JSON.stringify(penalty);
    const queryHead = `INSERT INTO knockout_games (game, score, game_id, round, penalty) VALUES `;
    const queryBody = `( ${game}, ${score}, ${id}, ${round}, ${penalty} )`;
    const query = queryHead + queryBody;

    pool.query(query, (error, results, fields) => {
        if (error) throw error;
    });
};

module.exports = updateGamesTable;