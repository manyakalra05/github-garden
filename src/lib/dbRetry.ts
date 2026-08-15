/**
 * Neon (free tier) suspends its compute after a period of inactivity. The
 * very next query has to wait for it to wake back up, which occasionally
 * takes just long enough for Prisma's connection attempt to time out with
 * "Can't reach database server" (P1001) even though the database is
 * completely fine a moment later. Rather than surface that as a 500 to
 * whoever's request happened to hit the cold start, retry a couple of
 * times with a short backoff before giving up for real.
 */
export async function withDbRetry<F extends () => Promise<any>>(
  fn: F,
  attempts = 3,
  baseDelayMs = 600
): Promise<Awaited<ReturnType<F>>> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const isTransient =
        err?.code === "P1001" || // can't reach database server
        err?.code === "P1002" || // database server timed out
        err?.code === "P1017"; // server closed the connection
      if (!isTransient || i === attempts - 1) throw err;
      await new Promise((res) => setTimeout(res, baseDelayMs * (i + 1)));
    }
  }
  throw lastErr;
}
