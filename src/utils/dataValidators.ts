export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*@([a-zA-Z0-9]+)\.com$/;
  return emailRegex.test(email);
}

export const isValidPassword = (password: string): boolean => {
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
  return passwordRegex.test(password);
};

export const isDateValid = (date: string): boolean => {
  const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
  return dateRegex.test(date);
};

export const isValidData = (data: string): boolean => {
  const dataRegex = /^[A-Za-z ]{3,}$/;
  return dataRegex.test(data);
};

export const isValidImg = (imgData: string): boolean => {
  const imgRegex = /^image\/(jpeg|png|webp|jpg)$/;
  return imgRegex.test(imgData);
};
