type CreatePartyInput = {
  userId: number;
  partyName: string;
  partyDate: string;
  partyLocationName: string;
  partyLocationLink?: string;
  partyDressCode?: string;
  partySpecialInstructions?: string;
  partyStartTime: string;
  partyEndTime: string;
  layoutId?: number;
  hosts?: PartyHostInput[];
};

type UpdatePartyInput = {
  userId: number;
  partyName: string;
  partyDate: string;
  partyLocationName: string;
  partyLocationLink?: string;
  partyStartTime: string;
  partyEndTime: string;
  partyDressCode?: string;
  partySpecialInstructions?: string;
};

type PartyHostInput = {
  name: string;
  email: string;
};
