import { createTransport } from "nodemailer";
import Mail from "nodemailer/lib/mailer";

const transporter = () =>
  createTransport({
    host: process.env.NODEMAILER_HOST,
    port: 587,
    secure: false, // use false for STARTTLS; true for SSL on port 465
    auth: {
      user: process.env.NODEMAILER_USER, // generated ethereal user
      pass: process.env.NODEMAILER_PASS,
    },
  });

export const sendEmail = (
  to: string,
  subject: string,
  body: string,
  attachments?: Mail.Attachment[]
) => {
  return transporter().sendMail({
    from: process.env.NODEMAILER_USER, // sender address
    to,
    subject,
    html: body,
    attachments,
  });
};
