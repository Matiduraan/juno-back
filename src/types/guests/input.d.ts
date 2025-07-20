type AddGuestInput = {
  party_id: number;
  guest_name: string;
  guest_status?: GuestStatus;
  guest_email?: string;
  guest_phone?: string;
  guest_notes?: string;
  custom_fields?: {
    field_id: number;
    field_value: string | number | boolean | null;
  }[];
};

type MassiveAddGuestInput = {
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  guest_notes?: string;
};
