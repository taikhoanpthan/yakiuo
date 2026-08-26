import { useEffect, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Select,
  Spin,
  Tag,
  message,
} from "antd";

import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  UserOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";

import {
  getTodos,
  createTodo,
  updateTodo,
  updateTodoStatus,
  deleteTodo,
} from "../../services/todo.service";

import TodoModal from "./TodoModal";

const priorityConfig = {
  high: {
    label: "Cao",
    color: "red",
  },

  normal: {
    label: "Bình thường",
    color: "blue",
  },

  low: {
    label: "Thấp",
    color: "default",
  },
};

const shiftConfig = {
  morning: "Ca sáng",
  afternoon: "Ca chiều",
};

const Todos = () => {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState("pending");
  const [priority, setPriority] = useState(undefined);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [saving, setSaving] = useState(false);

  // Modal xem chi tiết
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState(null);

  // =====================================================
  // GET TODOS
  // =====================================================

  const fetchTodos = async () => {
    try {
      setLoading(true);

      const params = {};

      if (priority) {
        params.priority = priority;
      }

      const response = await getTodos(params);

      setTodos(response.data?.todos || []);
    } catch (error) {
      console.error("Get todos failed:", error);

      message.error(
        error.response?.data?.message || "Không thể tải danh sách công việc",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, [status, priority]);

  // =====================================================
  // SEARCH
  // =====================================================

  const filteredTodos = todos.filter((todo) => {
    const keyword = search.trim().toLowerCase();

    // Filter trạng thái
    if (status === "pending" && todo.completed) {
      return false;
    }

    if (status === "completed" && !todo.completed) {
      return false;
    }

    // Search
    if (!keyword) {
      return true;
    }

    return (
      todo.title?.toLowerCase().includes(keyword) ||
      todo.description?.toLowerCase().includes(keyword) ||
      todo.createdBy?.fullName?.toLowerCase().includes(keyword)
    );
  });
  // =====================================================
  // CREATE / UPDATE
  // =====================================================

  const handleSubmit = async (values) => {
    try {
      setSaving(true);

      if (editingTodo) {
        await updateTodo(editingTodo._id, values);

        message.success("Đã cập nhật công việc");
      } else {
        await createTodo(values);

        message.success("Đã giao công việc");
      }

      setModalOpen(false);
      setEditingTodo(null);

      await fetchTodos();
    } catch (error) {
      console.error("Save todo failed:", error);

      message.error(error.response?.data?.message || "Không thể lưu công việc");
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // TOGGLE STATUS
  // =====================================================

  const handleToggle = async (todo) => {
    try {
      const completed = !todo.completed;

      await updateTodoStatus(todo._id, completed);

      message.success(
        completed ? "Đã hoàn thành công việc" : "Đã mở lại công việc",
      );

      await fetchTodos();
    } catch (error) {
      console.error("Update todo status failed:", error);

      message.error(
        error.response?.data?.message || "Không thể cập nhật công việc",
      );
    }
  };
  // =====================================================
  // DELETE
  // =====================================================

  const handleDelete = async (todo) => {
    try {
      await deleteTodo(todo._id);

      message.success("Đã xóa công việc");

      await fetchTodos();
    } catch (error) {
      console.error("Delete todo failed:", error);

      message.error(error.response?.data?.message || "Không thể xóa công việc");
    }
  };

  // =====================================================
  // OPEN DETAIL
  // =====================================================

  const handleOpenDetail = (todo) => {
    setSelectedTodo(todo);
    setDetailOpen(true);
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="space-y-6">
      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <div className="erp-page-header">
        <div>
          <div className="erp-page-eyebrow">Công việc chung</div>

          <h1 className="erp-page-title">Todo List</h1>

          <p className="erp-page-description">
            Ca sáng giao việc và ca chiều thực hiện công việc.
          </p>
        </div>

        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingTodo(null);
            setModalOpen(true);
          }}
        >
          Thêm công việc
        </Button>
      </div>

      {/* ================================================= */}
      {/* FILTER */}
      {/* ================================================= */}

      <Card className="erp-section-card">
        <div className="flex flex-col gap-3 lg:flex-row">
          <Input
            size="large"
            prefix={<SearchOutlined />}
            placeholder="Tìm công việc, nội dung, người giao..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />

          <Select
            size="large"
            value={status}
            onChange={setStatus}
            className="w-full lg:w-44"
            options={[
              {
                value: "all",
                label: "Tất cả",
              },
              {
                value: "pending",
                label: "Chưa hoàn thành",
              },
              {
                value: "completed",
                label: "Đã hoàn thành",
              },
            ]}
          />

          <Select
            size="large"
            allowClear
            placeholder="Ưu tiên"
            value={priority}
            onChange={setPriority}
            className="w-full lg:w-40"
            options={[
              {
                value: "high",
                label: "Ưu tiên cao",
              },
              {
                value: "normal",
                label: "Bình thường",
              },
              {
                value: "low",
                label: "Ưu tiên thấp",
              },
            ]}
          />
        </div>
      </Card>

      {/* ================================================= */}
      {/* TODO LIST */}
      {/* ================================================= */}

      <Card className="erp-section-card">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spin />
          </div>
        ) : filteredTodos.length === 0 ? (
          <Empty description="Chưa có công việc" className="py-12" />
        ) : (
          <div className="space-y-3">
            {filteredTodos.map((todo) => {
              const priorityInfo =
                priorityConfig[todo.priority] || priorityConfig.normal;

              const completed = todo.completed === true;

              const creatorName =
                todo.createdBy?.fullName ||
                todo.createdBy?.username ||
                "Không xác định";

              return (
                <div
                  key={todo._id}
                  className={`group rounded-2xl border p-4 transition ${
                    completed
                      ? "border-slate-100 bg-slate-50"
                      : "border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* ================================= */}
                    {/* CHECK */}
                    {/* ================================= */}

                    <button
                      type="button"
                      onClick={() => handleToggle(todo)}
                      className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${
                        completed
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-slate-300 text-transparent hover:border-blue-500"
                      }`}
                    >
                      <CheckCircleOutlined />
                    </button>

                    {/* ================================= */}
                    {/* CONTENT */}
                    {/* ================================= */}

                    <div className="min-w-0 flex-1">
                      {/* NGƯỜI GIAO */}

                      <div className="mb-2 flex items-center gap-2">
                        <Avatar
                          size={30}
                          src={todo.createdBy?.avatar}
                          icon={<UserOutlined />}
                        />

                        <div>
                          <div className="text-xs text-slate-400">Giao bởi</div>

                          <div
                            className={`text-sm font-semibold ${
                              completed ? "text-slate-400" : "text-slate-700"
                            }`}
                          >
                            {creatorName}
                          </div>
                        </div>
                      </div>

                      {/* TITLE */}

                      <div
                        className={`text-base font-semibold ${
                          completed
                            ? "text-slate-400 line-through"
                            : "text-slate-800"
                        }`}
                      ></div>

                      {/* DESCRIPTION PREVIEW */}

                      {todo.description && (
                        <div className="mt-1">
                          {/* XEM CHI TIẾT */}

                          <Button
                            type="link"
                            size="small"
                            className="!mt-1 !px-0"
                            icon={<FileTextOutlined />}
                            onClick={() => handleOpenDetail(todo)}
                          >
                            Xem chi tiết
                          </Button>
                        </div>
                      )}

                      {/* META */}

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Tag color={priorityInfo.color}>
                          {priorityInfo.label}
                        </Tag>

                        <Tag icon={<ClockCircleOutlined />}>
                          {shiftConfig[todo.assignedShift] ||
                            todo.assignedShift}
                        </Tag>

                        {todo.dueDate && (
                          <span className="text-xs text-slate-400">
                            {dayjs(todo.dueDate).format("DD/MM/YYYY")}
                          </span>
                        )}
                      </div>

                      {/* COMPLETED INFO */}

                      {completed && todo.completedBy?.fullName && (
                        <div className="mt-2 text-xs text-green-600">
                          Hoàn thành bởi {todo.completedBy.fullName}
                          {todo.completedAt &&
                            ` • ${dayjs(todo.completedAt).format(
                              "DD/MM/YYYY HH:mm",
                            )}`}
                        </div>
                      )}
                    </div>

                    {/* ================================= */}
                    {/* ACTIONS */}
                    {/* ================================= */}

                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => {
                          setEditingTodo(todo);
                          setModalOpen(true);
                        }}
                      />

                      <Popconfirm
                        title="Xóa công việc?"
                        description="Bạn có chắc muốn xóa công việc này?"
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{
                          danger: true,
                        }}
                        onConfirm={() => handleDelete(todo)}
                      >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ================================================= */}
      {/* CREATE / EDIT MODAL */}
      {/* ================================================= */}

      <TodoModal
        open={modalOpen}
        editingTodo={editingTodo}
        loading={saving}
        onClose={() => {
          setModalOpen(false);
          setEditingTodo(null);
        }}
        onSubmit={handleSubmit}
      />

      {/* ================================================= */}
      {/* DETAIL MODAL */}
      {/* ================================================= */}

      <Modal
        open={detailOpen}
        title="Chi tiết công việc"
        footer={
          <Button
            onClick={() => {
              setDetailOpen(false);
              setSelectedTodo(null);
            }}
          >
            Đóng
          </Button>
        }
        onCancel={() => {
          setDetailOpen(false);
          setSelectedTodo(null);
        }}
        destroyOnClose
      >
        {selectedTodo && (
          <div className="space-y-5">
            {/* NGƯỜI GIAO */}

            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
              <Avatar
                size={44}
                src={selectedTodo.createdBy?.avatar}
                icon={<UserOutlined />}
              />

              <div>
                <div className="text-xs text-slate-400">Giao bởi</div>

                <div className="font-semibold text-slate-800">
                  {selectedTodo.createdBy?.fullName ||
                    selectedTodo.createdBy?.username ||
                    "Không xác định"}
                </div>

                {selectedTodo.createdAt && (
                  <div className="mt-1 text-xs text-slate-400">
                    {dayjs(selectedTodo.createdAt).format("DD/MM/YYYY HH:mm")}
                  </div>
                )}
              </div>
            </div>

            {/* TITLE */}

            <div>
              <div className="mb-1 text-xs font-medium text-slate-400">
                CÔNG VIỆC
              </div>

              <div
                className={`text-lg font-semibold ${
                  selectedTodo.status === "completed"
                    ? "text-slate-400 line-through"
                    : "text-slate-800"
                }`}
              >
                {selectedTodo.title || "Công việc được giao"}
              </div>
            </div>

            {/* DESCRIPTION */}

            <div>
              <div className="mb-2 text-xs font-medium text-slate-400">
                NỘI DUNG
              </div>

              <div className="max-h-[220px] overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-700 md:max-h-[300px]">
                {selectedTodo.description || "Không có nội dung chi tiết."}
              </div>
            </div>

            {/* META */}

            <div className="flex flex-wrap gap-2">
              <Tag
                color={priorityConfig[selectedTodo.priority]?.color || "blue"}
              >
                {priorityConfig[selectedTodo.priority]?.label || "Bình thường"}
              </Tag>

              <Tag icon={<ClockCircleOutlined />}>
                {shiftConfig[selectedTodo.assignedShift] ||
                  selectedTodo.assignedShift ||
                  "Không xác định"}
              </Tag>

              {selectedTodo.dueDate && (
                <Tag>{dayjs(selectedTodo.dueDate).format("DD/MM/YYYY")}</Tag>
              )}

              {selectedTodo.status === "completed" && (
                <Tag color="success" icon={<CheckCircleOutlined />}>
                  Đã hoàn thành
                </Tag>
              )}
            </div>

            {/* COMPLETED INFO */}

            {selectedTodo.completedBy?.fullName && (
              <div className="rounded-xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">
                <div className="font-medium">
                  Đã hoàn thành bởi {selectedTodo.completedBy.fullName}
                </div>

                {selectedTodo.completedAt && (
                  <div className="mt-1 text-xs">
                    {dayjs(selectedTodo.completedAt).format("DD/MM/YYYY HH:mm")}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Todos;
