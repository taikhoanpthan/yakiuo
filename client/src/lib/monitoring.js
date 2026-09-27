import { Component, createElement } from "react";

const dsn = import.meta.env.VITE_SENTRY_DSN;
let sentry = null;

export const initMonitoring = () => {
  if (!dsn) return;
  void import("@sentry/react").then((module) => {
    sentry = module;
    sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      integrations: [sentry.browserTracingIntegration()],
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1,
      sendDefaultPii: false,
    });
  });
};

export const captureError = (error, context = {}) => {
  if (!sentry) return;
  sentry.withScope((scope) => {
    scope.setContext("yakiuo", context);
    sentry.captureException(error);
  });
};

export const setMonitoringUser = (user) => {
  if (sentry) sentry.setUser(user?._id ? { id: String(user._id), username: user.username } : null);
};

export class MonitoringErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    captureError(error, { source: "react", componentStack: info.componentStack });
  }

  render() {
    if (this.state.hasError) return createElement("div", { className: "grid min-h-screen place-items-center text-slate-500" }, "Đã có lỗi không mong muốn. Vui lòng tải lại trang.");
    return this.props.children;
  }
}
