import { Action } from '@ngrx/store';
import { Authenticate, User } from 'models/auth';

export enum AuthActionTypes {
  Login = '[Auth] Login',
  LoginSuccess = '[Auth] Login Success',
  LoginFailure = '[Auth] Login Failure',
  LoginRedirect = '[Auth] Login Redirect',
  Logout = '[Auth] Logout',
  LogoutSuccess = '[Auth] Logout Success',
  GetExternalConfiguration = '[Auth] Get External Configuration',
  GetExternalConfigurationSuccess = '[Auth] Get External Configuration Success',
  GetExternalConfigurationFailure = '[Auth] Get External Configuration Failure',
}

export class Login implements Action {
  readonly type = AuthActionTypes.Login;

  constructor(public payload: Authenticate) { }
}

export class LoginSuccess implements Action {
  readonly type = AuthActionTypes.LoginSuccess;

  constructor(public payload: User) { }
}

export class LoginFailure implements Action {
  readonly type = AuthActionTypes.LoginFailure;

  constructor(public payload: any) { }
}

export class LoginRedirect implements Action {
  readonly type = AuthActionTypes.LoginRedirect;
  constructor(public payload: { redirectUrl: string }) { }
}

export class Logout implements Action {
  readonly type = AuthActionTypes.Logout;
}

export class LogoutSuccess implements Action {
  readonly type = AuthActionTypes.LogoutSuccess;
}

export type AuthActionsUnion =
  | Login
  | LoginSuccess
  | LoginFailure
  | LoginRedirect
  | Logout
  | LogoutSuccess;
