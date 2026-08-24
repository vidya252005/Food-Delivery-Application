// Public restaurant browsing - no auth required. Mounted at /api/restaurants.
//
// NOTE: the original app also exposed unauthenticated PUT /:id and
// POST/PUT/DELETE /:id/menu[/:menuItemId] here, letting anyone mutate any
// restaurant's profile or menu just by knowing its id. The frontend never
// called them (it uses the authenticated /api/restaurant/* equivalents
// below), so they're dropped rather than carried forward - see
// docs/ARCHITECTURE.md.
const express = require('express');
const restaurantController = require('../controllers/restaurantController');

const router = express.Router();

// /search/:query must be registered before /:id, or Express would match
// "search" itself as an :id param.
router.get('/nearby', restaurantController.listNearby);
router.get('/discover', restaurantController.discover);
router.get('/search/:query', restaurantController.search);
router.get('/', restaurantController.listActive);
router.get('/:id', restaurantController.getById);

module.exports = router;
