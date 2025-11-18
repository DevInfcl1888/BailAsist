const request = require("supertest")
const app = require('../../src/app.ts')
// const User = require("../../src/models/user.model");

describe("User Signup API", () => {
  const validBody = {
    firstName: "Varun",
    middleName: "Singh",
    lastName: "Saini",
    email: "varun@test.com",
    password: "Pass@123",
    confirmPassword: "Pass@123",
    phoneNo: "9876543210",
    homeAddress: "Near the city center road",
    street: "Long street number 12",
    ZipCode: "110085",
    isAgreed: true,
    countryCode: "+91",
  };

  it("Should return 400 if required field missing", async () => {
    const body = { ...validBody };
    delete body.firstName || delete body.password;

    const res = await request(app).post("/api/v1/user/registration").send(body);

    expect(res.statusCode).toBe(400);
    expect(res.body).toBe("All credentials are required");
  });

  it("Should return 404 for invalid email",async ()=>{
    const res = await request(app).post("/api/v1/user/registration").send({...validBody, email: "wrong22email"})

    expect(res.statusCode).toBe(404)
    expect(res.body).toBe("Invalid email")
  })
});

// describe("Dummy test to avoid empty file errors", () => {
//   it("should run a dummy test", () => {
//     expect(true).toBe(true);
//   });
// });
