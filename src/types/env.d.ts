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
    S3_BUCKET: string;
    CORS_ORIGIN?: string;
    TWILIO_ACCOUNT_SID?: string;
    TWILIO_AUTH_TOKEN?: string;
    TWILIO_FROM?: string;
    RESEND_API_KEY?: string;
    SUPPORT_EMAIL: string;

    // Add more environment variables as needed
  }
}
