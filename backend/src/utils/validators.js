export const isValidEthiopianPhone = (phone) => {
  if (!phone) return false;

  const trimmed = phone.trim();

  return /^(09|07)\d{8}$/.test(trimmed);
};

export const isValidEmail = (email) => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

export const isValidFullName = (name) => {
  if (!name) return false;

  const trimmed = name.trim();

  const parts = trimmed.split(/\s+/);

  return parts.length >= 2 && parts.every((part) => /^[A-Za-z]+$/.test(part));
};
