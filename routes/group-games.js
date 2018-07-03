const express = require('express');
const router = express.Router();
import {getData, getGames} from '../controllers/games';

router.get('/data', (req, res) => getData(req, res));
router.get('/games', async (req, res) => getGames(req, res));

module.exports = router;
