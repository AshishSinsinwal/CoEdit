
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Document {
  _id: string;
  title: string;
  ownerId: string;
  content?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
}
