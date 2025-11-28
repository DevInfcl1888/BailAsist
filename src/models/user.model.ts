import { Schema, model, Document, Date } from "mongoose";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";

//  --------------------- Contact Information --------------------
interface contactInfo extends Document {
  user: Schema.Types.ObjectId;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phoneNo: string;
}

//  --------------------- Residence Information --------------------
interface residenceInfo extends Document {
  user: Schema.Types.ObjectId;
  yearsAtCurrentAddress: string;
  landlordName: string;
  homeOwnership: string;
  landlordAddress: string;
}

//  --------------------- Personal Refrence Information --------------------
interface personalRefrenceInfo extends Document {
  user: Schema.Types.ObjectId;
  familyMembers: {
    name: string;
    address: string;
    phoneNo: string;
    knownDuration: string;
  }[];
}

//  --------------------- Personal Information --------------------
interface personalInfo extends Document {
  user: Schema.Types.ObjectId;
  weight: string;
  height: string;
  race: string;
  gender: string;
  eyeColor: string;
  birthPlace: string;
  birthDate: string;
  hairColor: string;
  UScitizen: string;
  nickname: string;
  maritalStatus: string;
  spouseName?: string;
  spouseOccupation?: string;
  spouseEmployer?: string; // The name of the company where your husband or wife works.
  child?: {
    childName: string;
    childAge: string;
    childSchool: string;
  }[];
  isResponsible: string; // Responsible for anyone else support
  responsibleDescription?: string; // only filled if isResponsible is true
}

//  --------------------- Legal Information --------------------
interface legalInfo extends Document {
  user: Schema.Types.ObjectId;
  attorneyName: string;
  attorneyAddress: string;
  attorneyPhoneNo: string;
}

//  --------------------- Driver Lic.  Information --------------------
interface driversLicInfo extends Document {
  user: Schema.Types.ObjectId;
  socialSecurityNumber: string;
  state: string;
  drivingLicenseNo: string;
  havingYourOwnAutomobile: string; //  if yes then fill further info
  automobileColor?: string;
  automobileMake?: string;
  automobileModel?: string;
}

//  --------------------- Employement Information --------------------
interface employementInfo extends Document {
  user: Schema.Types.ObjectId;
  employementStatus: string; // if yes then fill further info
  employerName?: string;
  employerSupervisorName?: string;
  employerAddress?: string;
  employerWorkingPeriod?: string;
  automobileColor?: string;
  previousEmployer?: string;
}

//  --------------------- Sign Up Information --------------------
interface signUp extends Document {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNo: string;
  isActive: boolean;
  deviceToken: string;
  homeAddress: string;
  street: string;
  ZipCode: string;
  refreshToken: string;
  image: string;
  isAgreed: boolean;
  bondsman: Schema.Types.ObjectId;
  court: Schema.Types.ObjectId;
  latitude: number;
  longitude: number;
  countryCode: String;
  reminders: Schema.Types.ObjectId[];
  isCorrectPassword(password: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
}

//  --------------------- Login Information --------------------
interface login extends Document {
  email: string;
  password: string;
  isRemember?: boolean;
}

//  --------------------- CheckIn Information --------------------
interface ICheckIn extends Document {
  user: Schema.Types.ObjectId;
  photoUrl: string;
  message: string;
  location: { lat: number; long: number };
  createdAt: Date;
  updatedAt: Date;
}

//  --------------------- CheckOut Information --------------------
interface ICheckOut extends Document {
  user: Schema.Types.ObjectId;
  photoUrl: string;
  location?: { lat: number; long: number };
  createdAt: Date;
  updatedAt: Date;
}

//  --------------------- CheckIn Information --------------------
const CheckInSchema = new Schema<ICheckIn>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    photoUrl: { type: String }, // cloudinary url
    message: { type: String, trim: true },
    location: {
      lat: { type: Number, required: true },
      long: { type: Number, required: true },
    },
  },
  {
    timestamps: true,
  }
);
//  --------------------- CheckOut Information --------------------
const CheckOutSchema = new Schema<ICheckOut>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    photoUrl: { type: String }, // cloudinary url
    location: {
      lat: { type: Number, required: false },
      long: { type: Number, required: false },
    },
  },
  {
    timestamps: true,
  }
);
const contactInfoSchema = new Schema<contactInfo>({
  //  --------------------- Contact Information --------------------
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  middleName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
  },
  phoneNo: {
    type: String,
    required: true,
    trim: true,
  },
});
const residenceInfoSchema = new Schema<residenceInfo>({
  //  --------------------- Residence Information --------------------
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  yearsAtCurrentAddress: { type: String, required: true },
  homeOwnership: { type: String, required: true },
  landlordName: { type: String, required: true },
  landlordAddress: { type: String, required: true },
});
const personalInfoSchema = new Schema<personalInfo>({
  //  --------------------- Personal Refrence Information --------------------
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  weight: {
    type: String,
    required: true,
    trim: true,
  },
  height: {
    type: String,
    required: true,
    trim: true,
  },
  race: {
    type: String,
    required: true,
  },
  gender: {
    type: String,
    required: true,
  },
  eyeColor: {
    type: String,
    required: true,
  },
  hairColor: {
    type: String,
    required: true,
  },
  birthPlace: {
    type: String,
    required: true,
    trim: true,
  },
  birthDate: {
    type: String,
    required: true,
  },
  UScitizen: {
    type: String,
    trim: true,
  },
  nickname: {
    type: String,
    required: true,
    trim: true,
  },
  maritalStatus: {
    type: String,
    trim: true,
  },
  spouseName: {
    type: String,
    trim: true,
  },
  spouseOccupation: {
    type: String,
    trim: true,
  },
  spouseEmployer: {
    type: String,
    trim: true,
  }, // The name of the company where your husband or wife works.
  child: [
    {
      childName: { type: String },
      childAge: { type: String },
      childSchool: { type: String },
    },
  ],
  isResponsible: {
    type: String,
    required: true,
  }, // Responsible for anyone else support
  responsibleDescription: {
    type: String,
    trim: true,
  }, // only filled if isResponsible is true
});
const personalRefrenceInfoSchema = new Schema<personalRefrenceInfo>({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },

  // <-- ARRAY OF OBJECTS
  familyMembers: [
    {
      name: { type: String, required: true, trim: true },
      address: { type: String, required: true, trim: true },
      phoneNo: { type: String, required: true, trim: true },
      knownDuration: { type: String, required: true, trim: true }, // e.g. "2 Yr"
    },
  ],
});
const legalInfoSchema = new Schema<legalInfo>({
  //  --------------------- Legal Information --------------------
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  attorneyName: {
    type: String,
    required: true,
    trim: true,
  },
  attorneyAddress: {
    type: String,
    required: true,
    trim: true,
  },
  attorneyPhoneNo: {
    type: String,
    required: true,
    trim: true,
  },
});
const driversLicInfoSchema = new Schema<driversLicInfo>({
  //  --------------------- Driver Lic. Information --------------------
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  socialSecurityNumber: {
    type: String,
    required: true,
    trim: true,
  },
  state: {
    type: String,
    required: true,
    trim: true,
  },
  drivingLicenseNo: {
    type: String,
    required: true,
    trim: true,
  },
  havingYourOwnAutomobile: {
    type: String,
    trim: true,
  }, //  if yes then fill further info
  automobileColor: {
    type: String,
    trim: true,
  },
  automobileMake: {
    type: String,
    trim: true,
  },
  automobileModel: {
    type: String,
    trim: true,
  },
});
const employementInfoSchema = new Schema<employementInfo>({
  //  --------------------- Employement Information --------------------
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  employementStatus: {
    type: String,
    trim: true,
  }, // if yes then fill further info
  employerName: {
    type: String,
    trim: true,
  },
  employerSupervisorName: {
    type: String,
    trim: true,
  },
  employerAddress: {
    type: String,
    trim: true,
  },
  employerWorkingPeriod: {
    type: String,
    trim: true,
  },
  automobileColor: {
    type: String,
    trim: true,
  },
  previousEmployer: {
    type: String,
    trim: true,
  },
});
const userSchema = new Schema<signUp>(
  {
    //  --------------------- Sign Up Information --------------------

    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    middleName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    confirmPassword: {
      type: String,
    },
    phoneNo: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deviceToken: {
      type: String,
    },
    homeAddress: {
      type: String,
      required: true,
      trim: true,
    },
    street: {
      type: String,
      required: true,
      trim: true,
    },
    ZipCode: {
      type: String,
      required: true,
      trim: true,
    },
    isAgreed: {
      type: Boolean,
      required: true,
      immutable: true,
    },
    countryCode: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
    },
    bondsman: { type: Schema.Types.ObjectId, ref: "Bondsman" },
    image: {
      type: String, // cloudinary url
    },
    reminders: [{ type: Schema.Types.ObjectId, ref: "Reminder" }],
    latitude: { type: Number },
    longitude: { type: Number },
    court: {
      type: Schema.Types.ObjectId,
      ref: "Court",
    },
  },
  {
    timestamps: true,
  }
);
userSchema.index({ email: 1 }, { unique: true, sparse: true });

const loggedInSchema = new Schema<login>(
  {
    //  --------------------- LogIn Information --------------------
    email: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    isRemember: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// This is middleware for encrypt password only when password is changed
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// This function use for check password is correct or not
userSchema.methods.isCorrectPassword = async function (password: string) {
  return await bcrypt.compare(password, this.password);
};

// This function use for generate access token
userSchema.methods.generateAccessToken = function (): string {
  const secret = process.env.ACCESS_TOKEN_KEY!;
  const expiresIn = process.env.ACCESS_TOKEN_EXPIRE!;
  if (!secret || !expiresIn) throw Error("JWT Error...!");

  const payload = {
    _id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phoneNo,
  };
  const options: SignOptions = {
    algorithm: "HS256",
  };

  return jwt.sign(payload, secret, options);
};

// This function use for generate access token
userSchema.methods.generateRefreshToken = function (): string {
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

export const User = model("User", userSchema);
export const LoggedIn = model("Login", loggedInSchema);
export const ContactInfo = model("ContactInfo", contactInfoSchema);
export const ResidenceInfo = model("ResidenceInfo", residenceInfoSchema);
export const PersonalInfo = model("PersonalInfo", personalInfoSchema);
export const personalRefrenceInfo = model(
  "PersonalRefrenceInfo",
  personalRefrenceInfoSchema
);
export const LegalInfo = model("LegalInfo", legalInfoSchema);
export const DriversLicInfo = model("DriversLicInfo", driversLicInfoSchema);
export const EmployementInfo = model("EmployementInfo", employementInfoSchema);
export const CheckIn = model("CheckIn", CheckInSchema);
export const CheckOut = model("CheckOut", CheckOutSchema);
