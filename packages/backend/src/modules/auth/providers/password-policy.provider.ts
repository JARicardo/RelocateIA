import { Provider } from '@nestjs/common';
import { DefaultPasswordPolicy } from 'src/modules/auth/policies/password.policy';

export const PASSWORD_POLICY = Symbol('PASSWORD_POLICY');

export const PasswordPolicyProvider: Provider = {
  provide: PASSWORD_POLICY,
  useClass: DefaultPasswordPolicy,
};
