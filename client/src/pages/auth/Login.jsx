import { useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Form, Input, Typography, message } from "antd";

import {
  LockOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
} from "@ant-design/icons";

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";

const { Title, Text } = Typography;

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const loginPageRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [passwordFocus, setPasswordFocus] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  // Giữ nguyên chiều cao ban đầu để Safari không căn giữa lại toàn bộ form
  // khi bàn phím ảo làm visual viewport bị thu nhỏ.
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    const lockLoginHeight = () => {
      root.style.setProperty("--login-stable-height", `${window.innerHeight}px`);
    };

    lockLoginHeight();

    const oldBodyOverflow = body.style.overflow;
    const oldBodyOverscroll = body.style.overscrollBehavior;

    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    const handleOrientationChange = () => {
      window.setTimeout(lockLoginHeight, 350);
    };

    window.addEventListener("orientationchange", handleOrientationChange);

    return () => {
      window.removeEventListener("orientationchange", handleOrientationChange);
      root.style.removeProperty("--login-stable-height");
      body.style.overflow = oldBodyOverflow;
      body.style.overscrollBehavior = oldBodyOverscroll;
    };
  }, []);

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      setLoginError("");

      await login(values.username, values.password);

      message.success("Đăng nhập thành công");
      navigate("/dashboard");
    } catch (error) {
      const status = error?.response?.status;
      const serverMessage = error?.response?.data?.message;

      let errorMessage =
        serverMessage || "Đăng nhập thất bại. Vui lòng thử lại.";

      if (!error?.response) {
        errorMessage = "Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.";
      } else if (status === 401) {
        errorMessage = "Tên đăng nhập hoặc mật khẩu không đúng.";
      } else if (status === 403) {
        errorMessage = "Tài khoản đã bị khóa hoặc không có quyền đăng nhập.";
      } else if (status === 404) {
        errorMessage = "Tài khoản không tồn tại.";
      } else if (status === 429) {
        errorMessage = "Bạn thử đăng nhập quá nhiều lần. Vui lòng chờ một lát.";
      } else if (status >= 500) {
        errorMessage = "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.";
      }

      setLoginError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={loginPageRef}
      className="fixed inset-x-0 top-0 overflow-x-hidden overflow-y-auto overscroll-none bg-slate-50"
      style={{
        height: "var(--login-stable-height, 100svh)",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="absolute -bottom-40 -right-32 h-[500px] w-[500px] rounded-full bg-indigo-100/60 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-white/80 blur-3xl" />
      </div>

      <main
        className="relative z-10 flex min-h-full items-center justify-center px-4 py-6 sm:py-10"
        style={{
          paddingTop: "max(24px, env(safe-area-inset-top))",
          paddingBottom: "max(24px, env(safe-area-inset-bottom))",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="w-full max-w-[430px]"
        >
          <div className="mb-[-42px] flex justify-center">
            <motion.div
              animate={{
                y: passwordFocus ? -4 : 0,
                rotate: passwordFocus ? -3 : 0,
              }}
              transition={{ duration: 0.25 }}
              className="relative z-20 flex h-24 w-24 items-center justify-center rounded-[28px] border-4 border-white bg-white text-[58px] shadow-xl"
            >
              {passwordFocus ? "🙈" : "🐵"}
            </motion.div>
          </div>

          <Card
            bordered={false}
            className="overflow-hidden rounded-[28px] border border-slate-200/70 bg-white/95 shadow-[0_25px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl"
            styles={{ body: { padding: 0 } }}
          >
            <div className="px-7 pb-2 pt-16 text-center sm:px-9">
              <Title
                level={2}
                style={{
                  margin: 0,
                  marginBottom: 6,
                  fontSize: 27,
                  fontWeight: 750,
                  letterSpacing: "-0.5px",
                  color: "#0f172a",
                }}
              >
                YAKIUO ERP
              </Title>

              <Text style={{ color: "#64748b", fontSize: 14 }}>
                Đăng nhập vào hệ thống quản lý
              </Text>
            </div>

            <div className="px-7 pb-8 pt-7 sm:px-9">
              <Form
                layout="vertical"
                onFinish={handleSubmit}
                onValuesChange={() => {
                  if (loginError) {
                    setLoginError("");
                  }
                }}
                size="large"
                requiredMark={false}
              >
                {loginError && (
                  <Alert
                    type="error"
                    showIcon
                    closable
                    message="Không thể đăng nhập"
                    description={loginError}
                    onClose={() => setLoginError("")}
                    className="mb-5 !rounded-xl"
                  />
                )}

                <Form.Item
                  label={
                    <span className="font-medium text-slate-700">
                      Tên đăng nhập
                    </span>
                  }
                  name="username"
                  rules={[
                    {
                      required: true,
                      message: "Vui lòng nhập tên đăng nhập",
                    },
                  ]}
                >
                  <Input
                    prefix={<UserOutlined className="text-slate-400" />}
                    placeholder="Nhập tên đăng nhập"
                    className="rounded-xl !text-[16px]"
                    styles={{ input: { fontSize: "16px" } }}
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </Form.Item>

                <Form.Item
                  label={
                    <span className="font-medium text-slate-700">Mật khẩu</span>
                  }
                  name="password"
                  rules={[
                    {
                      required: true,
                      message: "Vui lòng nhập mật khẩu",
                    },
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined className="text-slate-400" />}
                    placeholder="Nhập mật khẩu"
                    className="rounded-xl !text-[16px]"
                    styles={{ input: { fontSize: "16px" } }}
                    autoComplete="current-password"
                    visibilityToggle={{
                      visible: passwordVisible,
                      onVisibleChange: setPasswordVisible,
                    }}
                    iconRender={(visible) =>
                      visible ? (
                        <EyeOutlined className="text-slate-400" />
                      ) : (
                        <EyeInvisibleOutlined className="text-slate-400" />
                      )
                    }
                    onFocus={() => setPasswordFocus(true)}
                    onBlur={() => setPasswordFocus(false)}
                  />
                </Form.Item>

                <Form.Item className="mb-0 mt-7">
                  <Button
                    type="primary"
                    htmlType="submit"
                    block
                    loading={loading}
                    className="!h-12 !rounded-xl !text-[15px] !font-semibold !shadow-lg !shadow-blue-500/20"
                  >
                    {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                  </Button>
                </Form.Item>
              </Form>

              <div className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-slate-400">
                <SafetyCertificateOutlined />
                <span>Kết nối được bảo vệ và mã hóa</span>
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50/70 px-7 py-4 text-center">
              <span className="text-xs text-slate-400">
                Yakiuo ERP · Hệ thống quản trị nội bộ
              </span>
            </div>
          </Card>

          <div className="mt-5 text-center">
            <span className="text-xs text-slate-400">
              © {new Date().getFullYear()} Yakiuo ERP · v1.0.0
            </span>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Login;
