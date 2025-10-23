import { Schema, model, Document, Date } from "mongoose";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";

//  --------------------- Contact Information --------------------
interface contactInfo {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phoneNo: string;
  currentAddress: string;
  isAgree: boolean;
}

//  --------------------- Residence Information --------------------
enum ResidenceType {
  OWN = "own",
  RENT = "rent",
}
interface residenceInfo {
  yearsAtCurrentAddress: string;
  residenceType: ResidenceType;
  landlordName: string;
  landlordAddress: string;
}

//  --------------------- Personal Refrence Information --------------------
interface personalRefrenceInfo {
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
enum RACE {
  AMERICAN_INDIAN_OR_ALASKA_NATIVE_ASIAN = "American Indian or Alaska Native  Asian",
  BLACK_OF_AFRICAN_AMERICAN_HISPANIC = "Black of African American  Hispanic",
  NATIVE_HAWAIIAN_OR_PACIFIC_ISLANDER_WHITE = "Native Hawaiian or Pacific Islander  White",
  OTHER = "Other",
  PREFER_NOT_TO_SAY = "Prefer not to say",
}
enum GENDER {
  MALE = "Male",
  FEMALE = "Female",
}
enum EYE_COLOR {
  AMBER = "Amber",
  BROWN = "Brown",
  BLUE = "Blue",
  GREEN = "Green",
  RED = "Red",
  HAZEL = "Hazel",
  BLACK = "Black",
  OTHER = "Other",
}
enum HAIR_COLOR {
  AMBER = "Amber",
  BROWN = "Brown",
  BLUE = "Blue",
  GREEN = "Green",
  RED = "Red",
  HAZEL = "Hazel",
  BLACK = "Black",
  OTHER = "Other",
}
enum MARITAL_STATUS {
  MARRIED = "Married",
  DIVORCED = "Divorced",
  SINGLE = "Single",
  WIDOWED = "Widowed",
  SEPRATED = "Seprated",
}
interface personalInfo {
  weight: string;
  height: string;
  race: RACE;
  gender: GENDER;
  eyeColor: EYE_COLOR;
  hairColor: HAIR_COLOR;
  birthPlace: string;
  birthDate: Date;
  UScitizen: boolean;
  nickname: string;
  maritalStatus: MARITAL_STATUS;
  spouseName?: string;
  spouseOccupation?: string;
  spouseEmployer?: string; // The name of the company where your husband or wife works.
  childName_1?: string;
  childAge_1?: string;
  childSchool_1?: string;
  childName_2?: string;
  childAge_2?: string;
  childSchool_2?: string;
  childName_3?: string;
  childAge_3?: string;
  childSchool_3?: string;
  childName_4?: string;
  childAge_4?: string;
  childSchool_4?: string;
  isResponsible: boolean; // Responsible for anyone else support
  dependents?: string; // only filled if isResponsible is true
}

//  --------------------- Legal Information --------------------
interface legalInfo {
  attorneyName: string;
  attorneyAddress: string;
  attorneyPhoneNo: string;
}

//  --------------------- Driver Lic.  Information --------------------
interface driversLicInfo {
  socialSecurityNumber: string;
  state: string;
  drivingLicenseNo: string;
  havingYourOwnAutomobile: boolean; //  if yes then fill further info
  automobileColor: string;
  automobileMake: string;
  automobileNumberPlate: string;
  automobileModel: string;
}

//  --------------------- Employement Information --------------------
interface employementInfo {
  employementStatus: boolean; // if yes then fill further info
  employerName: string;
  employerSupervisorName: string;
  employerAddress: string;
  employerWorkingPeriod: string;
  automobileColor: string;
  previousEmployer: string;
}

//  --------------------- Sign Up Information --------------------
interface signUp {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNo: string;
  isAgree: boolean;
  refreshToken:string
}

//  --------------------- Login Information --------------------
interface login {
  email: string;
  password: string;
  isRemember?: boolean;
}

//  --------------------- Combine --------------------
interface IUser extends Document {
  contactInfo: contactInfo;
  residenceInfo: residenceInfo;
  personalRefrenceInfo: personalRefrenceInfo;
  personalInfo: personalInfo;
  legalInfo: legalInfo;
  driversLicInfo: driversLicInfo;
  employementInfo: employementInfo;
  signUp: signUp;

  // for Auth
  refreshToken: string;

  // functions injected in schema
  isCorrectPassword(password: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
}

const userSchema = new Schema<IUser>({
  // contactInfo: {
  //   firstName: {
  //     type: String,
  //     required: true,
  //     trim: true,
  //   },
  //   middleName: {
  //     type: String,
  //     required: true,
  //     trim: true,
  //   },
  //   lastName: {
  //     type: String,
  //     required: true,
  //     trim: true,
  //   },
  //   email: {
  //     type: String,
  //     required: true,
  //     trim: true,
  //     unique: true,
  //   },
  //   phoneNo: {
  //     type: String,
  //     required: true,
  //     trim: true,
  //   },
  //   currentAddress: {
  //     type: String,
  //     trim: true,
  //     required: true,
  //   },
  //   isAgree: {
  //     type: Boolean,
  //     required: true,
  //   },
  // },
  // residenceInfo: {
  //   yearsAtCurrentAddress: { type: String, required: true },
  //   residenceType: {
  //     type: String,
  //     enum: Object.values(ResidenceType), // return ["own", "rent"]
  //     required: true,
  //   },
  //   landlordName: { type: String, required: true },
  //   landlordAddress: { type: String, required: true },
  // },
  // personalRefrenceInfo: {
  //   weight: {
  //     type: String,
  //     required: true,
  //     trim: true,
  //   },
  //   height: {
  //     type: String,
  //     required: true,
  //     trim: true,
  //   },
  //   race: Object.values(RACE),
  //   gender: Object.values(GENDER),
  //   eyeColor: Object.values(EYE_COLOR),
  //   hairColor: Object.values(HAIR_COLOR),
  //   birthPlace: {
  //     type: String,
  //     required: true,
  //     trim: true,
  //   },
  //   birthDate: {
  //     type: Date,
  //     required: true,
  //   },
  //   UScitizen: {
  //     type: Boolean,
  //     default: false,
  //   },
  //   nickname: {
  //     type: String,
  //     required: true,
  //     trim: true,
  //   },
  //   maritalStatus: Object.values(MARITAL_STATUS),
  //   spouseName: {
  //     type: String,
  //     trim: true,
  //   },
  //   spouseOccupation: {
  //     type: String,
  //     trim: true,
  //   },
  //   spouseEmployer: {
  //     type: String,
  //     trim: true,
  //   }, // The name of the company where your husband or wife works.
  //   childName_1: {
  //     type: String,
  //     trim: true,
  //   },
  //   childAge_1: {
  //     type: String,
  //     trim: true,
  //   },
  //   childSchool_1: {
  //     type: String,
  //     trim: true,
  //   },
  //   childName_2: {
  //     type: String,
  //     trim: true,
  //   },
  //   childAge_2: {
  //     type: String,
  //     trim: true,
  //   },
  //   childSchool_2: {
  //     type: String,
  //     trim: true,
  //   },
  //   childName_3: {
  //     type: String,
  //     trim: true,
  //   },
  //   childAge_3: {
  //     type: String,
  //     trim: true,
  //   },
  //   childSchool_3: {
  //     type: String,
  //     trim: true,
  //   },
  //   childName_4: {
  //     type: String,
  //     trim: true,
  //   },
  //   childAge_4: {
  //     type: String,
  //     trim: true,
  //   },
  //   childSchool_4: {
  //     type: String,
  //     trim: true,
  //   },
  //   isResponsible: {
  //     type: Boolean,
  //     default: false,
  //   }, // Responsible for anyone else support
  //   dependents: {
  //     type: String,
  //     trim: true,
  //   }, // only filled if isResponsible is true
  // },
  // legalInfo: {
  //   attorneyName: {
  //     type: String,
  //     required: true,
  //     trim: true,
  //   },
  //   attorneyAddress: {
  //     type: String,
  //     required: true,
  //     trim: true,
  //   },
  //   attorneyPhoneNo: {
  //     type: String,
  //     required: true,
  //     trim: true,
  //   },
  // },
  // driversLicInfo: {
  //   socialSecurityNumber: {
  //     type: String,
  //     required: true,
  //     trim: true,
  //   },
  //   state: {
  //     type: String,
  //     required: true,
  //     trim: true,
  //   },
  //   drivingLicenseNo: {
  //     type: String,
  //     required: true,
  //     trim: true,
  //   },
  //   havingYourOwnAutomobile: {
  //     type: Boolean,
  //     default: false,
  //   }, //  if yes then fill further info
  //   automobileColor: {
  //     type: String,
  //     required: true,
  //     trim: true,
  //   },
  //   automobileMake: {
  //     type: String,
  //     required: true,
  //     trim: true,
  //   },
  //   automobileNumberPlate: {
  //     type: String,
  //     required: true,
  //     trim: true,
  //   },
  //   automobileModel: {
  //     type: String,
  //     required: true,
  //     trim: true,
  //   },
  // },
  // employementInfo: {
  //   employementStatus: {
  //     type: Boolean,
  //     default: false,
  //   }, // if yes then fill further info
  //   employerName: {
  //     type: String,
  //     required: true,
  //     trim: true,
  //   },
  //   employerSupervisorName: {
  //     type: String,
  //     required: true,
  //     trim: true,
  //   },
  //   employerAddress: {
  //     type: String,
  //     required: true,
  //     trim: true,
  //   },
  //   employerWorkingPeriod: {
  //     type: String,
  //     required: true,
  //     trim: true,
  //   },
  //   automobileColor: {
  //     type: String,
  //     required: true,
  //     trim: true,
  //   },
  //   previousEmployer: {
  //     type: String,
  //     required: true,
  //     trim: true,
  //   },
  // },
  signUp: {
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
    phoneNo: {
      type: String,
      required: true,
      trim: true,
    },
    isAgreed: { type: Boolean, required: true, immutable: true },
    refreshToken: { type: String },
  },
});
userSchema.index({ "signUp.email": 1 }, { unique: true });

const loggedInSchema = new Schema<login>({
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
});

// This is middleware for encrypt password only when password is changed
userSchema.pre("save", async function (next) {
  if (this.isModified("signUp.password")) {
    this.signUp.password = await bcrypt.hash(this.signUp.password, 10);
    next();
  }
});

// This function use for check password is correct or not
userSchema.methods.isCorrectPassword = async function (password: string) {
  return await bcrypt.compare(password, this.signUp.password);
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
