import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../src/index";

let mongo: MongoMemoryServer;
const mongoServer = await MongoMemoryServer.create({
  instance: {
    port: 27017, // fixed port
    dbName: "testDB", // fixed DB name
  },
});
const uri = mongoServer.getUri();
console.log({ uri });
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongo.stop();
});
jest.mock("mongoose", () => ({
  model: () => ({
    create: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
  }),
  connect: jest.fn(),
}));
(global as any).testApp = () => app;
