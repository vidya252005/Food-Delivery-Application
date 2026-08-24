const supportService = require('../services/supportService');
const asyncHandler = require('../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  const ticket = await supportService.create(req.body);
  res.status(201).json({ message: 'Support request received', ticket });
});

const listAll = asyncHandler(async (req, res) => {
  res.json(await supportService.listAll());
});

module.exports = { create, listAll };
