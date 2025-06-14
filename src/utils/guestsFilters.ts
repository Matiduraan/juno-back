export const buildGuestsFilter = (query?: string, status?: string) => {
  const filters: GuestsFilters = { query: query || "", status: [] };

  if (status) {
    const statusArray = status.split(",");
    const statuses: GuestStatus[] = statusArray
      .map((s) => s.trim() as GuestStatus)
      .filter((s) =>
        ["INVITED", "ACCEPTED", "DECLINED", "PENDING"].includes(s)
      );
    filters.status = statuses;
  }

  return filters;
};
