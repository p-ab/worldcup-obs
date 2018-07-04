const express = require('express');
const router = express.Router();
const gamesController = require('../controllers/games');

router.get('/data', (req, res) => gamesController.getData(req, res));
router.get('/games', async (req, res) => gamesController.getGames(req, res));

module.exports = router;
