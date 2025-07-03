import { UserRole } from "@prisma/client";

export type CreateUserInput = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role?: UserRole;
  google_id?: string;
};
