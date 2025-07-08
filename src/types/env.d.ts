declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: "development" | "production" | "test";
    PORT?: string;
    DATABASE_URL?: string;
    JWT_SECRET: string;
    JWT_REFRESH_SECRET: string;
    S3_ENDPOINT?: string;
    S3_ACCESS_KEY: string;
    S3_SECRET_KEY: string;
    // Add more environment variables as needed
  }
}
