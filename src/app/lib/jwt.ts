import jwt from "jsonwebtoken";

export const klingJWT = () =>
  jwt.sign(
    { iss: process.env.KLING_AK, exp: Math.floor(Date.now()/1000) + 1800 },
    process.env.KLING_SK as string,
    { algorithm: "HS256" }
  );