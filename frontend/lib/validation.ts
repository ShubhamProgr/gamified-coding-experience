export const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,32}$/;

export function validateUsername(username: string): string | null {
  const value = username.trim();
  if (!value) {
    return "Enter a username.";
  }
  if (!USERNAME_PATTERN.test(value)) {
    return "Username must be 3-32 characters and use only letters, numbers, or underscores.";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) {
    return "Enter a password.";
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (password.length > 128) {
    return "Password must be at most 128 characters.";
  }
  return null;
}
