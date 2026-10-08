import "dotenv/config";
import assert from "node:assert/strict";

const base = process.env.SMOKE_URL ?? "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("Smoke checks are restricted to a local demo server.");
if (process.env.DEMO_ENABLED !== "true" || !process.env.DEMO_PASSWORD)
  throw new Error("Smoke checks require explicit local demo credentials.");
class Client {
  private cookies = new Map<string, string>();
  async request(path: string, init: RequestInit = {}) {
    const response = await fetch(`${base}${path}`, {
      redirect: "manual",
      ...init,
      headers: {
        Cookie: [...this.cookies]
          .map(([key, value]) => `${key}=${value}`)
          .join("; "),
        ...init.headers,
      },
    });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";")[0];
      const index = pair.indexOf("=");
      this.cookies.set(pair.slice(0, index), pair.slice(index + 1));
    }
    return response;
  }
  async login(account: string) {
    const csrf = await (await this.request("/api/auth/csrf")).json();
    const response = await this.request("/api/auth/callback/credentials", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Auth-Return-Redirect": "1",
      },
      body: new URLSearchParams({
        csrfToken: csrf.csrfToken,
        email: `${account}@fieldops.local`,
        password: process.env.DEMO_PASSWORD!,
        callbackUrl: `${base}/dashboard`,
      }),
    });
    assert.equal(response.status, 200);
    const session = await (await this.request("/api/auth/session")).json();
    assert.equal(session.user.email, `${account}@fieldops.local`);
  }
}
const anonymous = new Client();
assert.equal((await anonymous.request("/api/incidents")).status, 401);
assert.equal(
  (await anonymous.request("/api/locations/location-001/device-options"))
    .status,
  401,
);
assert.equal((await anonymous.request("/dashboard")).status, 307);
const engineer = new Client();
await engineer.login("engineer");
const incidents: { id: string; assignedToId: string | null }[] = await (
  await engineer.request("/api/incidents?engineer=user-support")
).json();
assert.ok(incidents.length > 0);
assert.ok(incidents.every((i) => i.assignedToId === "user-engineer"));
for (const path of [
  "/dashboard",
  "/incidents",
  "/incidents/incident-1",
  "/my-work",
  "/visits",
  "/locations",
  "/locations/location-001?tab=network",
  "/equipment",
  "/equipment/device-001-4",
  "/monitoring",
  "/alerts",
  "/knowledge",
  "/diagnostics",
  "/settings",
]) {
  const response = await engineer.request(path);
  assert.equal(response.status, 200, path);
  const html = await response.text();
  assert.ok(!html.includes("Не удалось загрузить данные"), path);
  assert.ok(html.includes("FieldOps"), path);
}
const foreign = await engineer.request("/api/incidents/incident-4");
assert.equal(foreign.status, 403);
const invalidOrigin = await engineer.request(
  "/api/incidents/incident-1/comments",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://untrusted.invalid",
    },
    body: JSON.stringify({ body: "Must be blocked" }),
  },
);
assert.equal(invalidOrigin.status, 403);
const viewer = new Client();
await viewer.login("viewer");
assert.equal(
  (
    await viewer.request("/api/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: base },
      body: "{}",
    })
  ).status,
  403,
);
const admin = new Client();
await admin.login("admin");
assert.equal((await admin.request("/users")).status, 200);
const dispatcher = new Client();
await dispatcher.login("dispatcher");
assert.equal((await dispatcher.request("/incidents")).status, 200);
const deviceResponse = await dispatcher.request(
  "/api/locations/location-001/device-options?location=location-002",
);
assert.equal(deviceResponse.status, 200);
assert.equal(deviceResponse.headers.get("cache-control"), "no-store");
const devices: {
  id: string;
  name: string;
  assetTag: string;
  ipAddress: string;
  status: string;
}[] = await (
  await dispatcher.request("/api/locations/location-001/devices")
).json();
assert.ok(devices.length > 0);
assert.deepEqual(
  await deviceResponse.json(),
  devices
    .filter((device) => device.status !== "RETIRED")
    .map(({ id, name, assetTag, ipAddress }) => ({
      id,
      name,
      assetTag,
      ipAddress,
    })),
);
const search = await (
  await engineer.request("/api/search?q=10.1.20.24")
).json();
assert.ok(
  search.some(
    (item: { href: string }) => item.href === "/equipment/device-001-4",
  ),
);
console.log(
  "HTTP smoke checks passed: authentication, 15 pages, role scope, readonly access, origin protection, global search, incident equipment options.",
);
