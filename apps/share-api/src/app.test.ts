import { it, expect } from "vitest";
import { makeProject, place } from "../../../fixtures/builders";
import { restoreSolution } from "@vlezet/io";
import { buildApp } from "./app";
function snapshot() {
  const input = makeProject();
  return {
    schemaVersion: 1,
    input,
    solution: restoreSolution(input, {
      inputRevisionId: input.revisionId,
      placements: [place(input.instances[0].id, 0, 0, 0)],
      run: { seed: 42, attempts: 1, algorithmVersion: "test" },
    })!,
  };
}
it("publishes canonical immutable snapshot, expires and requires deletion secret", async () => {
  let now = 1000;
  const app = await buildApp({ filename: ":memory:", now: () => now });
  try {
    const create = await app.inject({
      method: "POST",
      url: "/api/snapshots",
      payload: snapshot(),
    });
    expect(create.statusCode).toBe(201);
    const { token, deleteSecret } = create.json();
    expect(token).toHaveLength(32);
    expect(deleteSecret).toHaveLength(43);
    const get = await app.inject(`/api/snapshots/${token}`);
    expect(get.statusCode).toBe(200);
    expect(get.headers["referrer-policy"]).toBe("no-referrer");
    expect(get.body).not.toContain(deleteSecret);
    expect(get.json().solution.metrics.placedCount).toBe(1);
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: `/api/snapshots/${token}`,
          headers: { authorization: "Bearer wrong" },
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: `/api/snapshots/${token}`,
          headers: { authorization: `Bearer ${deleteSecret}` },
        })
      ).statusCode,
    ).toBe(204);
    expect((await app.inject(`/api/snapshots/${token}`)).statusCode).toBe(404);
    const next = (
      await app.inject({
        method: "POST",
        url: "/api/snapshots",
        payload: snapshot(),
      })
    ).json();
    now += 30 * 86400000;
    expect((await app.inject(`/api/snapshots/${next.token}`)).statusCode).toBe(
      404,
    );
  } finally {
    await app.close();
  }
});
it("rejects oversized, forged, invalid, partial and rate-limited snapshots", async () => {
  const app = await buildApp({ filename: ":memory:", publishLimit: 5 });
  try {
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/snapshots",
          headers: { "content-type": "application/json" },
          payload: JSON.stringify({ huge: "x".repeat(1024 * 1024) }),
        })
      ).statusCode,
    ).toBe(413);
    for (const payload of [
      { ...snapshot(), schemaVersion: 99 },
      {
        ...snapshot(),
        solution: { ...snapshot().solution, status: "partial" },
      },
      { ...snapshot(), solution: { ...snapshot().solution, placements: [] } },
    ])
      expect(
        (await app.inject({ method: "POST", url: "/api/snapshots", payload }))
          .statusCode,
      ).toBe(400);
    const s = snapshot();
    s.solution.metrics.placedCount = 999;
    const ok = await app.inject({
      method: "POST",
      url: "/api/snapshots",
      payload: s,
    });
    expect(ok.statusCode).toBe(201);
    expect(
      (await app.inject(`/api/snapshots/${ok.json().token}`)).json().solution
        .metrics.placedCount,
    ).toBe(1);
    expect(
      (await app.inject({ method: "POST", url: "/api/snapshots", payload: s }))
        .statusCode,
    ).toBe(429);
  } finally {
    await app.close();
  }
});
