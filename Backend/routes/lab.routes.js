const express = require('express');
const router = express.Router();
const { linuxTerminal, stopAndDeleteContainer } = require("../controllers/terminal");
const { getTools } = require('../controllers/tools');
const { getLabs } = require('../controllers/labs');
const { getLabQuestions } = require('../controllers/labMaterial');
const { scriptExecute } = require('../controllers/script');
const authMiddleware = require('../middleware/userMiddleware');

const asyncHandler = fn => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
      body: req.body,
      timestamp: new Date().toISOString()
    });
    next(error);
  }
};

// These routes are currently commented out, but I'm including them for future use
router.post('/terminalrequest', authMiddleware, asyncHandler(linuxTerminal));
router.post('/stopterminal', authMiddleware, asyncHandler(stopAndDeleteContainer));
router.get('/gettools', asyncHandler(getTools));
router.get('/:toolId/labs', asyncHandler(getLabs));
router.get('/labs/:labId/questions', asyncHandler(getLabQuestions));
router.post('/checkanswer', asyncHandler(scriptExecute));

module.exports = router;

