import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  throw new Error(
    "Twilio credentials are not set in the environment variables."
  );
}

const client = twilio(accountSid, authToken);

export async function sendWhatsappTemplateMessage({
  to,
  templateName,
  bodyVariables,
  buttonVariable,
}: {
  to: string; // e.g. "whatsapp:+54911XXXXXXX"
  templateName: string;
  bodyVariables: string[];
  buttonVariable: string;
  language?: string;
}) {
  const message = await client.messages.create({
    from: process.env.TWILIO_FROM,
    to: `whatsapp:${to}`,
    contentSid: templateName,
    contentVariables: JSON.stringify({
      ...bodyVariables.reduce((acc, text, index) => {
        acc[index + 1] = text; // Twilio uses 1-based indexing for
        return acc;
      }, {} as Record<string, string>),
      [bodyVariables.length + 1]: buttonVariable,
    }),
  });

  return message;
}
