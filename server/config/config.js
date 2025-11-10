import dotenv from "dotenv";
dotenv.config();

export const port = process.env.PORT || 5000;
export const mongourl = process.env.MONGODB 
export const jwtSecret=process.env.JWT_SECRET