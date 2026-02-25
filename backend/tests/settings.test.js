// Integration tests for:
//   POST /api/auth/change-password
//   DELETE /api/user/data
//   DELETE /api/user
// Registers a fresh user in beforeAll; runs all tests; cleans up in afterAll.

const request = require("supertest");
const app = require("../index");
const pool = require("../db/pool");

const testUser = {
  username: "testuser_settings",
  email: "testsettings@example.com",
  password: "securepassword123",
};

// A second user used only for the deleteUser test (so it doesn't break others).
const deleteUser = {
  username: "testuser_delete",
  email: "testdelete@example.com",
  password: "deletepassword123",
};

let authToken;
let deleteToken;

beforeAll(async () => {
  await pool.query("DELETE FROM users WHERE email = ANY($1)", [
    [testUser.email, deleteUser.email],
  ]);

  const res = await request(app).post("/api/auth/register").send(testUser);
  authToken = res.body.token;

  const res2 = await request(app).post("/api/auth/register").send(deleteUser);
  deleteToken = res2.body.token;
});

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE email = ANY($1)", [
    [testUser.email, deleteUser.email],
  ]);
  await pool.end();
});

// ── POST /api/auth/change-password ────────────────────────────────────────────

describe("POST /api/auth/change-password", () => {
  it("returns 401 without an auth token", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .send({ currentPassword: testUser.password, newPassword: "newpassword123" });

    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ currentPassword: testUser.password });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("returns 400 when new password is too short", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ currentPassword: testUser.password, newPassword: "short" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/8 characters/);
  });

  it("returns 401 when current password is wrong", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ currentPassword: "wrongpassword", newPassword: "newpassword123" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it("returns 200 and updates the password successfully", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ currentPassword: testUser.password, newPassword: "newpassword123" });

    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();

    // Verify the new password works for login.
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: testUser.email, password: "newpassword123" });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();

    // Reset password back for subsequent tests.
    await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ currentPassword: "newpassword123", newPassword: testUser.password });
  });
});

// ── DELETE /api/user/data ─────────────────────────────────────────────────────

describe("DELETE /api/user/data", () => {
  it("returns 401 without an auth token", async () => {
    const res = await request(app).delete("/api/user/data");
    expect(res.status).toBe(401);
  });

  it("returns 200 and resets user data", async () => {
    const res = await request(app)
      .delete("/api/user/data")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
  });
});

// ── DELETE /api/user ──────────────────────────────────────────────────────────

describe("DELETE /api/user", () => {
  it("returns 401 without an auth token", async () => {
    const res = await request(app).delete("/api/user");
    expect(res.status).toBe(401);
  });

  it("returns 200 and deletes the account", async () => {
    const res = await request(app)
      .delete("/api/user")
      .set("Authorization", `Bearer ${deleteToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();

    // Verify the user is gone — login should fail.
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: deleteUser.email, password: deleteUser.password });

    expect(loginRes.status).toBe(401);
  });
});
