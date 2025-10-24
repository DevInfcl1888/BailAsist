export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*@([a-zA-Z0-9]+)\.com$/;
  return emailRegex.test(email);
}

export const isValidPassword = (password: string): boolean => {
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
  return passwordRegex.test(password);
};

// export const isValidTag = (tags: string[]): boolean => {
//   const tagsRegex = /^#[A-Za-z0-9_]+$/;
//   // Check each tag in array
//   return Array.isArray(tags) && tags.every(tag => tagsRegex.test(tag));
// };