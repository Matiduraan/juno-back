import { sendEmail } from "../utils/email";

export const sendSupportEmail = async (
  name: string,
  email: string,
  subject: string,
  message: string
) => {
  return await sendEmail(
    process.env.SUPPORT_EMAIL,
    subject,
    `Name: ${name}
     Email: ${email}
     Message: ${message}
    `
  );
};
