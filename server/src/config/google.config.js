import dotenv from "dotenv"

dotenv.config()

export const config = {
    googleApiKey : process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
    modle : process.env.CODELI_MODEL || "gemini-2.5-flash"
}