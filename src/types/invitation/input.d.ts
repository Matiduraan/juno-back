type InvitationInput = {
  partyId: number;
  email: string;
  name: string;
  status?: "PENDING" | "SENT" | "ACCEPTED";
  role: number;
};
