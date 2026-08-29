const Todo = require("../models/Todo");

const getTodos = async () => {
  return Todo.find()
    .populate(
      "createdBy",
      "username fullName avatar avatarPosition avatarZoom coverImage coverPosition coverZoom",
    )
    .sort({
      dueDate: 1,
      createdAt: -1,
    });
};

const createTodo = async (data, userId) => {
  return Todo.create({
    ...data,
    createdBy: userId,
  });
};

const updateTodo = async (todoId, data) => {
  const todo = await Todo.findById(todoId);

  if (!todo) {
    throw new Error("Todo not found");
  }

  if (data.description !== undefined) {
    todo.description = data.description;
  }

  if (data.priority !== undefined) {
    todo.priority = data.priority;
  }

  if (data.assignedShift !== undefined) {
    todo.assignedShift = data.assignedShift;
  }

  if (data.dueDate !== undefined) {
    todo.dueDate = data.dueDate;
  }

  if (data.completed !== undefined) {
    todo.completed = data.completed;
  }

  await todo.save();

  return todo;
};

const deleteTodo = async (todoId) => {
  const todo = await Todo.findById(todoId);

  if (!todo) {
    throw new Error("Todo not found");
  }

  await Todo.findByIdAndDelete(todoId);
};

module.exports = {
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
};
