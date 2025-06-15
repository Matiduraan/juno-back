type CreatePartyInput = {
  userId: number;
  partyName: string;
  partyDate: string;
  partyLocation: string;
  partyStartTime: string;
  partyEndTime: string;
  layoutId?: number;
  hosts?: PartyHostInput[];
};

type PartyHostInput = {
  name: string;
  email: string;
};
