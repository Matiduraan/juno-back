type GuestStatus = "INVITED" | "ACCEPTED" | "DECLINED" | "PENDING";

type GuestsFilters = {
  query: string;
  status?: GuestStatus[];
};
