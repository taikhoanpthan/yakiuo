import { useEffect, useState } from "react";
import { Alert, Button, Form, Input, Select, message } from "antd";
import {
  ArrowRightOutlined,
  CheckCircleFilled,
  EyeInvisibleOutlined,
  EyeOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";
import { getLoginUsers } from "../../services/auth.service";

const getLoginError = (error) => {
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message;

  if (!error?.response) return "Không thể kết nối máy chủ. Hãy kiểm tra Internet rồi thử lại.";
  if (status === 401) return "Tên đăng nhập hoặc mật khẩu chưa đúng. Vui lòng kiểm tra lại.";
  if (status === 403) return "Tài khoản đang bị khóa hoặc chưa được cấp quyền đăng nhập. Hãy liên hệ quản lý.";
  if (status === 404) return "Không tìm thấy tài khoản này. Hãy kiểm tra tên đăng nhập.";
  if (status === 429) return "Bạn đã thử quá nhiều lần. Vui lòng chờ ít phút rồi thử lại.";
  if (status >= 500) return "Máy chủ đang gặp sự cố tạm thời. Vui lòng thử lại sau vài phút.";

  return serverMessage || "Đăng nhập chưa thành công. Vui lòng thử lại.";
};

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loginUsers, setLoginUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState("");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    const loadLoginUsers = async () => {
      try {
        setLoadingUsers(true);
        setUsersError("");
        const response = await getLoginUsers();
        const users = response?.data?.users ?? [];
        setLoginUsers(Array.isArray(users) ? users : []);
      } catch (error) {
        setUsersError(error?.response?.data?.message || "Không tải được danh sách tài khoản. Vui lòng tải lại trang.");
      } finally {
        setLoadingUsers(false);
      }
    };

    void loadLoginUsers();
  }, []);

  const handleSubmit = async ({ username, password }) => {
    try {
      setLoading(true);
      setLoginError("");
      await login(username.trim(), password);
      message.success("Đăng nhập thành công. Chào mừng bạn trở lại!");
      navigate("/dashboard");
    } catch (error) {
      setLoginError(getLoginError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="erp-auth-page">
      <div className="erp-auth-orb erp-auth-orb-one" />
      <div className="erp-auth-orb erp-auth-orb-two" />

      <motion.main initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }} className="erp-auth-panel">
        <section className="erp-auth-showcase">
          <div className="erp-auth-brand"><img className="erp-auth-mark" src="/brand-logo.png" alt="Yakiuo Ishikawa" /><span>YAKIUO ERP</span></div>
          <div className="erp-auth-showcase-copy">
            <span className="erp-auth-kicker">WORKSPACE</span>
            <h1>Quản lý công việc, rõ ràng và liền mạch.</h1>
            <p>Theo dõi lịch làm, phản hồi và hoa hồng trong một không gian chung.</p>
          </div>
          <div className="erp-auth-benefits">
            <span><CheckCircleFilled /> Cập nhật theo thời gian thực</span>
            <span><CheckCircleFilled /> Phân quyền theo vai trò</span>
            <span><CheckCircleFilled /> Tối ưu cho điện thoại</span>
          </div>
        </section>

        <section className="erp-auth-form-section">
          <div className="erp-auth-form-heading">
            <div className="erp-auth-mobile-brand"><img className="erp-auth-mark" src="/brand-logo.png" alt="Yakiuo Ishikawa" /><span>YAKIUO ISHIKAWA SAIGON</span></div>
            <h2 className="erp-auth-kicker">ĐĂNG NHẬP</h2>

          </div>

          <Form layout="vertical" onFinish={handleSubmit} onValuesChange={() => loginError && setLoginError("")} requiredMark={false} size="large">
            {usersError && <Alert type="warning" showIcon message="Chưa tải được tài khoản" description={usersError} className="erp-auth-error" />}
            {loginError && <Alert type="error" showIcon closable message="Không thể đăng nhập" description={loginError} onClose={() => setLoginError("")} className="erp-auth-error" />}

            <Form.Item label="Chọn tài khoản" name="username" rules={[{ required: true, message: "Hãy chọn tên của bạn." }]}>
              <Select
                showSearch
                loading={loadingUsers}
                disabled={Boolean(usersError)}
                placeholder="Chọn tên của bạn"
                optionFilterProp="label"
                suffixIcon={<UserOutlined />}
                options={loginUsers.map((user) => ({
                  value: user.username,
                  label: `${user.fullName} — @${user.username}`,
                }))}
              />
            </Form.Item>

            <Form.Item label="Mật khẩu" name="password" rules={[{ required: true, message: "Hãy nhập mật khẩu để đăng nhập." }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu" autoComplete="current-password" visibilityToggle={{ visible: passwordVisible, onVisibleChange: setPasswordVisible }} iconRender={(visible) => visible ? <EyeOutlined /> : <EyeInvisibleOutlined />} />
            </Form.Item>

            <Button type="primary" htmlType="submit" block loading={loading} className="erp-auth-submit">
              {loading ? "Đang xác thực..." : <>Đăng nhập <ArrowRightOutlined /></>}
            </Button>
          </Form>

          <div className="erp-auth-security"><SafetyCertificateOutlined /> Kết nối của bạn được mã hóa và bảo vệ.</div>
        </section>
      </motion.main>
    </div>
  );
};

export default Login;
