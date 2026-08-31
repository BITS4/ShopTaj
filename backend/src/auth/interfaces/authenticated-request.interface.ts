export interface AuthenticatedUser {
  id: string;
}

export interface AuthenticatedRequest {
  user: AuthenticatedUser;
}
