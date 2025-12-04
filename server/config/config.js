import dotenv from "dotenv";
dotenv.config();

export const port = process.env.PORT || 5002;
export const mongourl = process.env.MONGODB 
export const jwtSecret=process.env.JWT_SECRET
export const jwtRefreshSecret=process.env.JWT_REFRESH_SECRET