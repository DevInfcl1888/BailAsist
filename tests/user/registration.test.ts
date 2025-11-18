// import request from "supertest";
// import { app } from "../../src/index"; // extension optional
import request from "supertest";
import { app } from "../../src/index";

describe("User Signup API", () => {
  // const validBody = {
  //   firstName: "Varun",
  //   middleName: "Singh",
  //   lastName: "Saini",
  //   email: "varun@test.com",
  //   password: "Pass@123",
  //   confirmPassword: "Pass@123",
  //   phoneNo: "9876543210",
  //   homeAddress: "Near the city center road",
  //   street: "Long street number 12",
  //   ZipCode: "110085",
  //   isAgreed: true,
  //   countryCode: "+91",
  // };
  it("should return 400 if firstName missing", async () => {
    // const body = { ...validBody };
    // delete body?.firstName;

    const res = await request(app).post("/api/v1/user/registration").send({
      firstName: "Varun",
      middleName: "Singh",
      email: "varun@test.com",
      password: "4ass@123",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toBe("All credentials are required");
  });

  //   it("Should return 404 for invalid email", async () => {
  //     const res = await request(app)
  //       .post("/api/v1/user/registration")
  //       .send({ ...validBody, email: "wrong22email" });

  //     expect(res.statusCode).toBe(404);
  //     expect(res.body).toBe("Invalid email");
  //   });
  // });

  // describe("Dummy test to avoid empty file errors", () => {
  //   it("should run a dummy test", () => {
  //     expect(true).toBe(true);
  //   });
});
// import request from "supertest";
// import { app } from "../../src/index"; // no extension needed

// describe("Registration API", () => {
//   it("should register user", async () => {
//     const res = await request(app).post("/api/v1/user/register").send({
//       firstName: "varun",
//       email: "varun@mail.com",
//       password: "123456",
//     });

//     expect(res.statusCode).toBe(200);
//   });
// });
