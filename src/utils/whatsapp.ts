type MessageData = {
  messaging_product: string;
  preview_url?: boolean;
  recipient_type?: string;
  to: string;
  type: "text" | "image" | "document";
  text?: {
    body: string;
  };
  image?: {
    link: string;
  };
  document?: {
    link: string;
    filename?: string;
  };
};

/**
 * Envia un mensaje a través de la API de WhatsApp usando fetch nativo
 */
export async function sendWhatsappMessage(
  data: MessageData
): Promise<Response> {
  const url = `https://graph.facebook.com/${process.env.WHATSAPP_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_USER_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  console.log("WhatsApp API response:", res.status, await res.json());

  if (!res.ok) {
    console.error("Error sending WhatsApp message:", res.statusText);
    throw new Error("Failed to send WhatsApp message");
  }

  return res;
}

/**
 * Crea un mensaje de texto
 */
export function getTextMessageInput(
  recipient: string,
  text: string
): MessageData {
  return {
    messaging_product: "whatsapp",
    preview_url: false,
    recipient_type: "individual",
    to: recipient,
    type: "text",
    text: {
      body: text,
    },
  };
}

/**
 * Crea un mensaje con una imagen por URL
 */
export function getImageMessageInput(
  recipient: string,
  imageUrl: string,
  message: string = ""
): MessageData {
  return {
    messaging_product: "whatsapp",
    to: recipient,
    type: "image",
    image: {
      link: imageUrl,
    },
    text: {
      body: message,
    },
  };
}

/**
 * Crea un mensaje con un documento por URL (PDF, Word, etc.)
 */
export function getDocumentMessageInput(
  recipient: string,
  documentUrl: string,
  message: string = "",
  filename?: string
): MessageData {
  return {
    messaging_product: "whatsapp",
    to: recipient,
    type: "document",
    document: {
      link: documentUrl,
      filename,
    },
    text: {
      body: message,
    },
  };
}
