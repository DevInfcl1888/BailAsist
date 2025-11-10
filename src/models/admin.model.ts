import { Schema, model, Document, Date } from "mongoose";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";

interface IAdmin extends Document {
  username: string;
  email: string;
  phoneNo: string;
  password: string;
  avatarUrl?: string;
  role: string;
  refreshToken: string;
  adImg: [
    {
      url: string;
      _id: Schema.Types.ObjectId; // optional, Mongo adds it anyway
      createdAt: Date;
    }
  ];
  isCorrectPassword(password: string): Promise<boolean>;
  generateRefreshToken(): string;
  generateAccessToken(): string;
}

const AdminSchema = new Schema<IAdmin>(
  {
    username: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phoneNo: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      trim: true,
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
    refreshToken: {
      type: String,
    },
    adImg: [
      {
        url: { type: String, required: true },
        _id: { type: Schema.Types.ObjectId, auto: true }, // optional, Mongo adds it anyway
        createdAt: { type:  Date, default: Date.now  },
      },
    ],
    role: {
      type: String,
      set: () => "admin",
    },
  },
  { timestamps: true }
);

// set role as admin if no admin exist
AdminSchema.pre("save", function (next) {
  if (!this.role) this.role = "admin";
  next();
  next();
});
// This is middleware for encrypt password only when password is changed
AdminSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
    next(); // error here
  }
  next();
});

// This function use for check password is correct or not
AdminSchema.methods.isCorrectPassword = async function (password: string) {
  return await bcrypt.compare(password, this.password);
};

// This function use for generate access token
AdminSchema.methods.generateAccessToken = function (): string {
  const secret = process.env.ACCESS_TOKEN_KEY!;
  const expiresIn = process.env.ACCESS_TOKEN_EXPIRE!;
  if (!secret || !expiresIn) throw Error("JWT Error...!");

  const payload = {
    _id: this._id,
    username: this.username,
    email: this.email,
    phone: this.phoneNo,
  };
  const options: SignOptions = {
    algorithm: "HS256",
  };

  return jwt.sign(payload, secret, options);
};

// This function use for generate access token
AdminSchema.methods.generateRefreshToken = function (): string {
  const secret = process.env.REFRESH_TOKEN_KEY!;
  const expiresIn = process.env.REFRESH_TOKEN_EXPIRE!;
  if (!secret || !expiresIn) throw Error("JWT Error...!");

  const payload = {
    _id: this._id,
  };
  const options: SignOptions = {
    algorithm: "HS256",
  };

  return jwt.sign(payload, secret, options);
};

export const Admin = model("Admin", AdminSchema);
