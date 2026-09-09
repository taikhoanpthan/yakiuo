const todoService = require("../services/todo.service");

const getTodos = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 5, 1), 50);
    const completed = req.query.completed === "true" ? true : req.query.completed === "false" ? false : undefined;
    const { todos, total } = await todoService.getTodos({ page, limit, priority: req.query.priority, completed });

    return res.status(200).json({
      success: true,
      data: {
        todos,
        pagination: { page, limit, total, hasMore: page * limit < total },
      },
    });
  } catch (error) {
    console.error("Get todos failed:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get todos",
    });
  }
};

const createTodo = async (req, res) => {
  try {
    const {
      description,
      priority,
      assignedShift,
      dueDate,
    } = req.body;

    if (!description?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Description is required",
      });
    }

    const todo = await todoService.createTodo(
      {
        description,
        priority,
        assignedShift,
        dueDate,
      },
      req.user._id,
    );

    return res.status(201).json({
      success: true,
      message: "Todo created successfully",
      data: {
        todo,
      },
    });
  } catch (error) {
    console.error("Create todo failed:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const updateTodo = async (req, res) => {
  try {
    const todo = await todoService.updateTodo(
      req.params.id,
      req.body,
    );

    return res.status(200).json({
      success: true,
      message: "Todo updated successfully",
      data: {
        todo,
      },
    });
  } catch (error) {
    console.error("Update todo failed:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteTodo = async (req, res) => {
  try {
    await todoService.deleteTodo(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Todo deleted successfully",
    });
  } catch (error) {
    console.error("Delete todo failed:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
};
