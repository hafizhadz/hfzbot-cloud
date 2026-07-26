export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  google_id?: string;
  email_verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
  requiresOtp: boolean;
}

export interface RegisterResponse {
  user: User;
  tokens: AuthTokens;
  otpSent: boolean;
}

export interface MeResponse {
  user: User;
}

export interface MessageResponse {
  message: string;
}
