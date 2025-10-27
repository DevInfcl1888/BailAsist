export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*@([a-zA-Z0-9]+)\.com$/;
  return emailRegex.test(email);
}

export const isValidPassword = (password: string): boolean => {
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
  return passwordRegex.test(password);
};

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(phone);
};

export const isDateValid= (date: string): boolean => {
  const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;  
  return dateRegex.test(date);
};
