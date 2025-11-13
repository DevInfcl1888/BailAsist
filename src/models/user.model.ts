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
export enum ResidenceType {
  OWN = "own",
  RENT = "rent",
}
interface residenceInfo extends Document {
  user: Schema.Types.ObjectId;
  yearsAtCurrentAddress: string;
  residenceType: ResidenceType;
  landlordName: string;
  landlordAddress: string;
}

//  --------------------- Personal Refrence Information --------------------
interface personalRefrenceInfo extends Document {
  user: Schema.Types.ObjectId;
  otherFamilyMemberName_1: string;
  otherFamilyMemberAddress_1: string;
  otherFamilyMemberPhoneNo_1: string;
  knownDuration_1: string;
  otherFamilyMemberName_2: string;
  otherFamilyMemberAddress_2: string;
  otherFamilyMemberPhoneNo_2: string;
  knownDuration_2: string;
  otherFamilyMemberName_3: string;
  otherFamilyMemberAddress_3: string;
  otherFamilyMemberPhoneNo_3: string;
  knownDuration_3: string;
}

//  --------------------- Personal Information --------------------
export enum RACE {
  AMERICAN_INDIAN_OR_ALASKA_NATIVE_ASIAN = "American Indian or Alaska Native Asian",
  BLACK_OF_AFRICAN_AMERICAN_HISPANIC = "Black of African American Hispanic",
  NATIVE_HAWAIIAN_OR_PACIFIC_ISLANDER_WHITE = "Native Hawaiian or Pacific Islander White",
  OTHER = "Other",
  PREFER_NOT_TO_SAY = "Prefer not to say",
}
export enum GENDER {
  MALE = "Male",
  FEMALE = "Female",
}
export enum EYE_COLOR {
  AMBER = "Amber",
  BROWN = "Brown",
  BLUE = "Blue",
  GREEN = "Green",
  RED = "Red",
  HAZEL = "Hazel",
  BLACK = "Black",
  OTHER = "Other",
}
export enum HAIR_COLOR {
  AMBER = "Amber",
  BROWN = "Brown",
  BLUE = "Blue",
  GREEN = "Green",
  RED = "Red",
  HAZEL = "Hazel",
  BLACK = "Black",
  OTHER = "Other",
}

interface personalInfo extends Document {
  user: Schema.Types.ObjectId;
  weight: string;
  height: string;
  race: RACE;
  gender: GENDER;
  eyeColor: EYE_COLOR;
  birthPlace: string;
  birthDate: string;
  hairColor: HAIR_COLOR;
  UScitizen: boolean;
  nickname: string;
  maritalStatus: boolean;
  spouseName?: string;
  spouseOccupation?: string;
  spouseEmployer?: string; // The name of the company where your husband or wife works.
  child?: {
    childName: string;
    childAge: string;
    childSchool: string;
  }[];
  isResponsible: boolean; // Responsible for anyone else support
  dependents?: string; // only filled if isResponsible is true
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
  havingYourOwnAutomobile: boolean; //  if yes then fill further info
  automobikeColor?: string;
  automobikeMake?: string;
  automobikeNumberPlate?: string;
  automobikeModel?: string;
}

//  --------------------- Employement Information --------------------
interface employementInfo extends Document {
  user: Schema.Types.ObjectId;
  employementStatus: boolean; // if yes then fill further info
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

const contactInfoSchema = new Schema<contactInfo>({
  //  --------------------- Contact Information --------------------
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
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
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  yearsAtCurrentAddress: { type: String, required: true },
  residenceType: {
    type: String,
    enum: Object.values(ResidenceType), // return ["own", "rent"]
    required: true,
  },
  landlordName: { type: String, required: true },
  landlordAddress: { type: String, required: true },
});
const personalInfoSchema = new Schema<personalInfo>({
  //  --------------------- Personal Refrence Information --------------------
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
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
    enum: Object.values(RACE),
    required: true,
  },
  gender: {
    type: String,
    enum: Object.values(GENDER),
    required: true,
  },
  eyeColor: {
    type: String,
    enum: Object.values(EYE_COLOR),
    required: true,
  },
  hairColor: {
    type: String,
    enum: Object.values(HAIR_COLOR),
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
    type: Boolean,
    default: false,
  },
  nickname: {
    type: String,
    required: true,
    trim: true,
  },
  maritalStatus: {
    type: Boolean,
    default: false,
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
    type: Boolean,
    default: false,
  }, // Responsible for anyone else support
  dependents: {
    type: String,
    trim: true,
  }, // only filled if isResponsible is true
});
const personalRefrenceInfoSchema = new Schema<personalRefrenceInfo>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  otherFamilyMemberName_1: {
    type: String,
    required: true,
    trim: true,
  },
  otherFamilyMemberAddress_1: {
    type: String,
    required: true,
    trim: true,
  },
  otherFamilyMemberPhoneNo_1: {
    type: String,
    required: true,
    trim: true,
  },
  knownDuration_1: {
    type: String,
    required: true,
    trim: true,
  },
  otherFamilyMemberName_2: {
    type: String,
    required: true,
    trim: true,
  },
  otherFamilyMemberAddress_2: {
    type: String,
    required: true,
    trim: true,
  },
  otherFamilyMemberPhoneNo_2: {
    type: String,
    required: true,
    trim: true,
  },
  knownDuration_2: {
    type: String,
    required: true,
    trim: true,
  },
  otherFamilyMemberName_3: {
    type: String,
    required: true,
    trim: true,
  },
  otherFamilyMemberAddress_3: {
    type: String,
    required: true,
    trim: true,
  },
  otherFamilyMemberPhoneNo_3: {
    type: String,
    required: true,
    trim: true,
  },
  knownDuration_3: {
    type: String,
    required: true,
    trim: true,
  },
});
const legalInfoSchema = new Schema<legalInfo>({
  //  --------------------- Legal Information --------------------
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
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
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
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
    type: Boolean,
    default: false,
  }, //  if yes then fill further info
  automobikeColor: {
    type: String,
    trim: true,
  },
  automobikeMake: {
    type: String,
    trim: true,
  },
  automobikeNumberPlate: {
    type: String,
    trim: true,
  },
  automobikeModel: {
    type: String,
    trim: true,
  },
});
const employementInfoSchema = new Schema<employementInfo>({
  //  --------------------- Employement Information --------------------
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },

  employementStatus: {
    type: Boolean,
    default: false,
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
      required: true,
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
