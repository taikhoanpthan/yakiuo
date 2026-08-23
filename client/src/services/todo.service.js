import api from "./api";

export const getTodos = async (params = {}) => {
  const response = await api.get("/todos", {
    params,
  });

  return response.data;
};

export const createTodo = async (data) => {
  const response = await api.post("/todos", data);

  return response.data;
};

export const updateTodo = async (id, data) => {
  const response = await api.patch(`/todos/${id}`, data);

  return response.data;
};

export const updateTodoStatus = async (id, completed) => {
  const response = await api.patch(`/todos/${id}`, {
    completed,
  });

  return response.data;
};

export const deleteTodo = async (id) => {
  const response = await api.delete(`/todos/${id}`);

  return response.data;
};
