export interface AccessSession {
  schemaVersion: 1;
  collaboratorId: string;
  createdAt: string;
}

export interface LocalCredential {
  schemaVersion: 1;
  collaboratorId: string;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
}
