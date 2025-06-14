type AddGuestInput = {
  party_id: number;
  guest_name: string;
  guest_status?: "INVITED" | "ACCEPTED" | "DECLINED";
  guest_email?: string;
  guest_phone?: string;
  guest_notes?: string;
};
