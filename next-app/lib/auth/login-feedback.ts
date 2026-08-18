export type LoginFeedbackCode =
  | "invalid_request"
  | "invalid_credentials"
  | "account_unavailable"
  | "too_many_attempts"
  | "service_unavailable"
  | "login_failed";

const messages: Record<LoginFeedbackCode, string> = {
  invalid_request: "Vui lòng kiểm tra lại email và mật khẩu.",
  invalid_credentials: "Email hoặc mật khẩu không đúng.",
  account_unavailable:
    "Tài khoản chưa sẵn sàng đăng nhập. Vui lòng kiểm tra email mời hoặc liên hệ quản trị viên.",
  too_many_attempts:
    "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng chờ một lúc rồi thử lại.",
  service_unavailable:
    "Hệ thống đăng nhập đang tạm thời không khả dụng. Vui lòng thử lại sau.",
  login_failed: "Không thể đăng nhập. Vui lòng thử lại.",
};

export function isLoginFeedbackCode(value: unknown): value is LoginFeedbackCode {
  return typeof value === "string" && value in messages;
}

export function loginFeedbackMessage(code: LoginFeedbackCode): string {
  return messages[code];
}

export function loginFeedbackFromResponse(
  payload: unknown,
  status: number,
): LoginFeedbackCode {
  if (
    payload &&
    typeof payload === "object" &&
    "code" in payload &&
    isLoginFeedbackCode(payload.code)
  ) {
    return payload.code;
  }
  if (status === 401) return "invalid_credentials";
  if (status === 429) return "too_many_attempts";
  if (status >= 500) return "service_unavailable";
  return "login_failed";
}

export function classifyAuthLoginError(error: {
  code?: string;
  status?: number;
}): { code: LoginFeedbackCode; status: number } {
  if (error.code === "invalid_credentials") {
    return { code: "invalid_credentials", status: 401 };
  }
  if (error.code === "email_not_confirmed" || error.code === "user_banned") {
    return { code: "account_unavailable", status: 403 };
  }
  if (error.code === "over_request_rate_limit" || error.status === 429) {
    return { code: "too_many_attempts", status: 429 };
  }
  if (typeof error.status === "number" && error.status >= 500) {
    return { code: "service_unavailable", status: 503 };
  }
  return { code: "login_failed", status: 401 };
}
