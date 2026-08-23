const Notification = require("../models/Notification");

const createNotification = async (data, userId) => {
  const notification = await Notification.create({
    title: data.title,
    content: data.content,
    type: data.type || "info",
    createdBy: userId,
  });

  return notification;
};

const getNotifications = async () => {
  const notifications = await Notification.find({
    isActive: true,
  })
    .populate(
      "createdBy",
      "username fullName role"
    )
    .sort({
      createdAt: -1,
    });

  return notifications;
};

const getNotificationById = async (
  notificationId
) => {
  const notification =
    await Notification.findById(
      notificationId
    ).populate(
      "createdBy",
      "username fullName role"
    );

  if (!notification) {
    throw new Error(
      "Notification not found"
    );
  }

  return notification;
};

const updateNotification = async (
  notificationId,
  data
) => {
  const notification =
    await Notification.findById(
      notificationId
    );

  if (!notification) {
    throw new Error(
      "Notification not found"
    );
  }

  if (data.title !== undefined) {
    notification.title =
      data.title.trim();
  }

  if (data.content !== undefined) {
    notification.content =
      data.content.trim();
  }

  if (data.type !== undefined) {
    notification.type = data.type;
  }

  if (data.isActive !== undefined) {
    notification.isActive =
      data.isActive;
  }

  await notification.save();

  return notification;
};

const deleteNotification = async (
  notificationId
) => {
  const notification =
    await Notification.findById(
      notificationId
    );

  if (!notification) {
    throw new Error(
      "Notification not found"
    );
  }

  await Notification.findByIdAndDelete(
    notificationId
  );

  return true;
};

module.exports = {
  createNotification,
  getNotifications,
  getNotificationById,
  updateNotification,
  deleteNotification,
};