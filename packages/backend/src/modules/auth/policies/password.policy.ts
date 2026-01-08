import zxcvbn from 'zxcvbn';
import { WeakPasswordError } from 'src/modules/auth/errors/weak-password.error';

export interface PasswordContext {
  email?: string;
  username?: string;
}

export interface PasswordPolicy {
  validate(password: string, context?: PasswordContext): void;
}

export class DefaultPasswordPolicy implements PasswordPolicy {
  validate(password: string, context?: PasswordContext): void {
    if (password.length < 12) {
      throw new WeakPasswordError(
        'Password must be at least 12 characters long',
      );
    }

    if (password.length > 128) {
      throw new WeakPasswordError(
        'Password is too long',
      );
    }

    const userInputs = [
      context?.email,
      context?.username,
    ].filter(Boolean) as string[];

    const result = zxcvbn(password, userInputs);

    if (result.score < 3) {
      throw new WeakPasswordError(
        'Password is too weak',
      );
    }
  }
}
