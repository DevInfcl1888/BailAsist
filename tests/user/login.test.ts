import request from "supertest";
import { app } from "../../src/index";
import { User } from "../../src/models/user.model";

describe("User Login API", () => {
  it("Should return 400 if email missing", async () => {
    const body: any = {
      email: "var@var.com",
      password: "Pass@123",
    };
    body.email = " ";
    const res = await request(app).post("/api/v1/user/login").send(body);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Invalid email");
  });
  it("Should return 400 if password missing", async () => {
    const body: any = {
      email: "var@var.com",
      password: "Pass@123",
    };
    body.password = " ";
    const res = await request(app).post("/api/v1/user/login").send(body);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Invalid password");
  });
});
