// Prints a password hash for ADMIN_PASSWORD_HASH.
// Usage: npm run hash-password -- "your password"
import { hashPassword } from "../src/lib/password";

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error("Pass a password of at least 12 characters.");
  process.exit(1);
}
console.log(await hashPassword(password));
