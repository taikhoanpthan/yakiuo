const CfsNotification = require("../models/CfsNotification");

const sameId = (left, right) => String(left?._id || left) === String(right?._id || right);

const createCfsNotification = async ({ recipient, actor, post = null, story = null, replyId = null, type, reactionType, isAnonymous = false }) => {
  if (!recipient || !actor || sameId(recipient, actor)) return null;
  return CfsNotification.create({ recipient, actor, post, story, replyId, type, reactionType, isAnonymous });
};

module.exports = { createCfsNotification };
