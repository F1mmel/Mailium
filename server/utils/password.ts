import bcrypt from 'bcryptjs';

const saltRounds = 10;

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(saltRounds);
  const hash = await bcrypt.hash(password, salt);
  return hash;
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  const isMatch = await bcrypt.compare(password, hash);
  return isMatch;
}

export function generateRandomPassword(length: number = 10): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let allChars = uppercase + lowercase + numbers + symbols;
  let password = '';

  if (length >= 4) {
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += symbols.charAt(Math.floor(Math.random() * symbols.length));
  }

  for (let i = password.length; i < length; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }

  password = password.split('').sort(() => 0.5 - Math.random()).join('');

  return password;
}
