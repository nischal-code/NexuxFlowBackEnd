import dotenv from "dotenv"

dotenv.config();

if(!process.env.MONGO_URI){
    throw new Error("Mongo uri in not available in environment variables.")
}
if(!process.env.jwt_Secret){
    throw new Error("Mongo uri in not available in environment variables.")
}

if(!process.env.GOOGLE_CLIENT_ID){
    throw new Error("Jwt secret is not present in env file.")

}
if(!process.env.GOOGLE_CLIENT_SECRET){
    throw new Error("Jwt secret is not present in env file.")

}
if(!process.env.GOOGLE_REFRESH_TOKEN){
    throw new Error("Jwt secret is not present in env file.")

}
if(!process.env.GOOGLE_USER){
    throw new Error("Jwt secret is not present in env file.")

}
const isProduction = process.env.NODE_ENV === "production";

// Cookie options for the httpOnly refresh token cookie.
// `secure: true` tells the browser to ONLY store/send the cookie over HTTPS.
// In local dev the backend runs on plain http://localhost, so a `secure`
// cookie is silently dropped by the browser -> the refresh-token request
// on page reload finds no cookie -> user gets bounced back to /login even
// though they just logged in. Only force `secure`/`sameSite: "strict"`
// once we're actually running behind HTTPS in production.
const refreshCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

const config = {
    MONGO_URI: process.env.MONGO_URI,
    jwt_Secret:process.env.jwt_Secret,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN,
  GOOGLE_USER: process.env.GOOGLE_USER,
  refreshCookieOptions,
}

export default config;