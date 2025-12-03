// src/routes/user.routes.js
const router = require('express').Router();
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const BookmarksController = require('../controllers/bookmarks.controller');
const ProgressController = require('../controllers/progress.controller');
const { body, param, validationHandler } = require('../middleware/validate');

router.use(auth, roles('user', 'admin'));

// Bookmarks
router.get('/bookmarks', BookmarksController.list);
router.post('/bookmarks', body('contentId').isMongoId(), validationHandler, BookmarksController.add);
router.delete('/bookmarks/:contentId', param('contentId').isMongoId(), validationHandler, BookmarksController.remove);

// Progress
router.get('/progress', ProgressController.list);
router.post(
  '/progress',
  body('contentId').isMongoId(),
  body('status').isIn(['not_started', 'in_progress', 'completed']),
  body('lastPositionSec').optional().isInt({ min: 0 }),
  validationHandler,
  ProgressController.upsert
);

module.exports = router;
