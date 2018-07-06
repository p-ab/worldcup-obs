const express = require('express');
const router = express.Router();
const gamesController = require('../controllers/games');

router.use((req, res, next) => {
  res.locals.type = 'knockout';
  next();
});
router.get('/data', (req, res) => gamesController.pullData(req, res));
router.get('/games', async (req, res) => gamesController.getGames(req, res));
router.get('/stat', async (req, res) => gamesController.getStat(req, res));

module.exports = router;