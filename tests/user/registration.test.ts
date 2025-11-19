// import request from "supertest";
// import { app } from "../../src/index";

// describe("User Signup API", () => {
//   it("should return 400 if firstName missing", async () => {
//     let validBody: any = {
//       firstName: "Varun",
//       middleName: "Singh",
//       lastName: "Saini",
//       email: "varun@test.com",
//       password: "Pass@123",
//       confirmPassword: "Pass@123",
//       phoneNo: "9876543210",
//       homeAddress: "Near the city center road",
//       street: "Long street number 12",
//       ZipCode: "110085",
//       isAgreed: true,
//       countryCode: "+91",
//     };
//     const body = { ...validBody };
//     delete body.firstName;

//     const res = await request(app).post("/api/v1/user/registration").send(body);

//     expect(res.statusCode).toBe(400);
//     expect(res.body.message).toBe("All credentials are required");
//   });

//   it("Should return 404 for invalid email", async () => {
//     let validBody: any = {
//       firstName: "Varun",
//       middleName: "Singh",
//       lastName: "Saini",
//       email: "varun@test.com",
//       password: "Pass@123",
//       confirmPassword: "Pass@123",
//       phoneNo: "9876543210",
//       homeAddress: "Near the city center road",
//       street: "Long street number 12",
//       ZipCode: "110085",
//       isAgreed: true,
//       countryCode: "+91",
//     };
//     const body = { ...validBody };
//     body.email = "wrong22email";
//     const res = await request(app).post("/api/v1/user/registration").send(body);

//     expect(res.statusCode).toBe(400);
//     expect(res.body.message).toBe("Invalid email");
//   });

//   it("Should return 400 for mismatch password", async () => {
//     let validBody: any = {
//       firstName: "Varun",
//       middleName: "Singh",
//       lastName: "Saini",
//       email: "varun@test.com",
//       password: "Pass@123",
//       confirmPassword: "Pass@123",
//       phoneNo: "9876543210",
//       homeAddress: "Near the city center road",
//       street: "Long street number 12",
//       ZipCode: "110085",
//       isAgreed: true,
//       countryCode: "+91",
//     };
//     const body = { ...validBody };
//     body.confirmPassword = "Passssss@432";
//     const res = await request(app).post("/api/v1/user/registration").send(body);

//     expect(res.statusCode).toBe(400);
//     expect(res.body.message).toBe(
//       "Confirm password should be same as password"
//     );
//   });
// });
