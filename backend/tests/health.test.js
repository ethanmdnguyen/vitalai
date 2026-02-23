// Integration test for the health check endpoint.
// Verifies GET /api/health returns 200 with { status: "ok" }.

const request = require("supertest");
const app = require("../index");

describe("GET /api/health", () => {
  it("returns 200 with status ok", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.timestamp).toBeDefined();
  });
});
