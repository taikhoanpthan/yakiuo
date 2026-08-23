const express = require("express");

const todoController = require("../controllers/todo.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authenticate);

// Xem công việc
router.get("/", todoController.getTodos);

// Giao công việc
router.post("/", todoController.createTodo);

// Sửa công việc
router.patch("/:id", todoController.updateTodo);

// Chỉ ADMIN được xóa
router.delete("/:id", (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "You do not have permission to access this resource",
    });
  }

  next();
}, todoController.deleteTodo);

module.exports = router;