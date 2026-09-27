import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCaroHistory } from "../../services/caro.service";

export const caroKeys = { history: (page, limit) => ["caro", "history", { page, limit }] };

export const useCaroHistory = (page, limit = 10) => {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: caroKeys.history(page, limit),
    queryFn: async () => (await getCaroHistory({ page, limit })).data?.data || { games: [], pagination: {}, hint: {} },
    placeholderData: (previous) => previous,
  });
  const invalidate = useCallback(() => client.invalidateQueries({ queryKey: ["caro", "history"] }), [client]);
  return {
    games: query.data?.games || [],
    pagination: { page, limit, total: 0, ...(query.data?.pagination || {}) },
    hint: query.data?.hint || { winCount: 0, requiredWins: 3, available: false },
    invalidate,
    ...query,
  };
};
