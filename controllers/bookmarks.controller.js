// src/controllers/bookmarks.controller.js
const Bookmark = require('../models/Bookmark');

exports.list = async (req, res, next) => {
  try {
    const bookmarks = await Bookmark.find({ user: req.user.id }).populate('content', 'title slug type').lean();
    res.json({ bookmarks });
  } catch (err) {
    next(err);
  }
};

exports.add = async (req, res, next) => {
  try {
    const bm = await Bookmark.create({ user: req.user.id, content: req.body.contentId });
    res.status(201).json({ bookmark: bm });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Already bookmarked' });
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await Bookmark.findOneAndDelete({ user: req.user.id, content: req.params.contentId });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
