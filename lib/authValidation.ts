export const LOGIN_ID_MIN_LENGTH = 6;
export const LOGIN_ID_MAX_LENGTH = 14;
export const PASSCODE_MIN_LENGTH = 6;
export const PASSCODE_MAX_LENGTH = 18;
export const AGENT_NAME_MIN_LENGTH = 1;
export const AGENT_NAME_MAX_LENGTH = 12;

const loginIdPattern = /^[a-zA-Z0-9_-]+$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeLoginIdInput(loginId: string) {
  return loginId.trim().toLowerCase();
}

export function normalizeEmailInput(email: string) {
  return email.trim().toLowerCase();
}

export function validateLoginId(loginId: string): string | null {
  const normalized = normalizeLoginIdInput(loginId);

  if (!normalized) return "请输入登录代号。";
  if (normalized.length < LOGIN_ID_MIN_LENGTH || normalized.length > LOGIN_ID_MAX_LENGTH) {
    return `登录代号需要 ${LOGIN_ID_MIN_LENGTH}-${LOGIN_ID_MAX_LENGTH} 位。`;
  }
  if (!loginIdPattern.test(normalized)) {
    return "登录代号仅支持英文、数字、下划线与短横线。";
  }

  return null;
}

export function validateEmail(email: string): string | null {
  const normalized = normalizeEmailInput(email);

  if (!normalized) return "请输入邮箱。";
  if (normalized.length > 254) return "邮箱长度过长。";
  if (!emailPattern.test(normalized)) return "请输入有效邮箱。";

  return null;
}

export function validateLoginIdentifier(loginId: string): string | null {
  const normalized = normalizeLoginIdInput(loginId);
  if (!normalized) return "请输入邮箱或登录代号。";
  return normalized.includes("@") ? validateEmail(normalized) : validateLoginId(normalized);
}

export function validatePasscode(passcode: string): string | null {
  if (!passcode) return "请输入通行密钥。";
  if (passcode.length < PASSCODE_MIN_LENGTH || passcode.length > PASSCODE_MAX_LENGTH) {
    return `通行密钥需要 ${PASSCODE_MIN_LENGTH}-${PASSCODE_MAX_LENGTH} 位。`;
  }

  return null;
}

export function validatePasscodeConfirmation(passcode: string, confirmation: string): string | null {
  const passcodeError = validatePasscode(passcode);
  if (passcodeError) return passcodeError;
  if (!confirmation) return "请再次输入通行密钥。";
  if (passcode !== confirmation) return "两次通行密钥不一致。";

  return null;
}

export function validateAgentName(agentName: string): string | null {
  const normalized = agentName.trim();

  if (!normalized) return "请输入专员名称。";
  if (normalized.length < AGENT_NAME_MIN_LENGTH || normalized.length > AGENT_NAME_MAX_LENGTH) {
    return `专员名称需要 ${AGENT_NAME_MIN_LENGTH}-${AGENT_NAME_MAX_LENGTH} 位。`;
  }

  return null;
}

export function validateCredentials(loginId: string, passcode: string): string | null {
  return validateLoginIdentifier(loginId) ?? validatePasscode(passcode);
}
