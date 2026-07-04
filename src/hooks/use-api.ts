"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api-client";

/** GET helper backed by react-query. Pass `url: null` to disable. */
export function useApi<T>(key: unknown[], url: string | null) {
  return useQuery<T>({
    queryKey: key,
    queryFn: () => api.get<T>(url as string),
    enabled: !!url,
  });
}

/** Generic mutation helper that invalidates keys on success. */
export function useApiMutation<TBody, TResp>(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  urlBuilder: (body: TBody) => string,
  invalidateKeys: unknown[][],
) {
  const qc = useQueryClient();
  return useMutation<TResp, ApiError, TBody>({
    mutationFn: (body: TBody) => {
      if (method === "DELETE") return api.del<TResp>(urlBuilder(body));
      return api[method.toLowerCase() as "post" | "put" | "patch"]<TResp>(urlBuilder(body), body);
    },
    onSuccess: () => {
      invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
    },
  });
}

export { ApiError };
