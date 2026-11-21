export function ok(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function fail(status: number, error: string, message: string): Response {
  return ok({ error, message }, status);
}

export function withErrors<Args extends unknown[]>(
  handler: (...args: Args) => Response | Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof Response) return error;
      return fail(500, 'server', '잠시 뒤 다시 시도해 주세요.');
    }
  };
}
