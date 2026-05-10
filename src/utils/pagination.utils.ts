export const getPaginationParams = (page?: string, limit?: string) => {
  const p = Math.max(1, parseInt(page ?? "1") || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit ?? "10") || 10));
  return { skip: (p - 1) * l, take: l, page: p, limit: l };
};
