import xss from "xss";
import { z } from "zod";

const guestSchema = z.object({
  guest_name: z.string().min(1, "Name mandatory"),
  guest_email: z.string().email().optional(),
  guest_phone: z.string().optional(),
  guest_notes: z.string().optional(),
  guest_status: z.literal("PENDING"),
});

export const validateGuestFromFile = (
  guests: any[][],
  validationMode = "filter"
) => {
  let returnData: Omit<AddGuestInput, "party_id">[] = [];

  guests.forEach((guest) => {
    const [guest_name, guest_email, guest_phone, guest_notes] = guest;
    const guestData = {
      guest_name: xss(guest_name.toString().trim()),
      guest_email: xss(guest_email.toString().trim()),
      guest_phone: xss(guest_phone.toString().trim()) || undefined,
      guest_notes: xss(guest_notes?.toString().trim()) || undefined,
      guest_status: "PENDING",
    };
    const parsed = guestSchema.safeParse(guestData);

    if (parsed.success) {
      returnData.push(parsed.data);
    } else {
      if (validationMode === "throw") {
        throw new Error(`Validation error: ${parsed.error.message}`);
      }
    }
  });

  return returnData; // Return only valid guests
};

export const validateGuestFromInput = (guest: AddGuestInput) => {
  const guestData = {
    guest_name: xss(guest.guest_name.trim()),
    guest_email: xss(guest.guest_email?.trim() || ""),
    guest_phone: xss(guest.guest_phone?.trim() || ""),
    guest_notes: xss(guest.guest_notes?.trim() || ""),
    guest_status: "PENDING",
  };

  const parsed = guestSchema.safeParse(guestData);

  if (!parsed.success) {
    throw new Error(`Validation error: ${parsed.error.message}`);
  }

  return parsed.data; // Return validated guest data
};
