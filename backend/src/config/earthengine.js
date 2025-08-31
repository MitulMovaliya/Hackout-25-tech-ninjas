/**
 * Google Earth Engine configuration and initialization
 */
import ee from "@google/earthengine";
import { GoogleAuth } from "google-auth-library";
import dotenv from "dotenv";

dotenv.config();

// Earth Engine credentials
const EE_CLIENT_EMAIL = process.env.GEE_CLIENT_EMAIL;
const EE_PRIVATE_KEY = process.env.GEE_PRIVATE_KEY;
const EE_SCOPES = ["https://www.googleapis.com/auth/earthengine"];

let initialized = false;

/**
 * Initialize the Earth Engine client with service account credentials
 */
export async function initializeEarthEngine() {
  if (initialized) return true;

  try {
    if (!EE_PRIVATE_KEY || !EE_CLIENT_EMAIL) {
      console.error(
        "Earth Engine credentials are missing from environment variables"
      );
      return false;
    }

    console.log("Initializing Google Earth Engine with OAuth...");

    try {
      // Create a new GoogleAuth instance for service account auth
      const auth = new GoogleAuth({
        credentials: {
          client_email: EE_CLIENT_EMAIL,
          private_key: EE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        },
        scopes: EE_SCOPES,
      });

      // Get an auth client with the service account credentials
      const client = await auth.getClient();

      // Get the auth token
      const authToken = await client.getAccessToken();
      if (!authToken || !authToken.token) {
        throw new Error("Failed to get access token");
      }

      console.log("Successfully obtained OAuth access token");

      // Set the API URL explicitly to avoid the replace function issue
      if (ee.data && ee.data.setApiBaseUrl) {
        ee.data.setApiBaseUrl("https://earthengine.googleapis.com");
      }

      // Set up Earth Engine with the token
      ee.data.setAuthToken("Bearer", authToken.token);

      // Initialize Earth Engine
      await ee.initialize();

      console.log("Google Earth Engine initialized successfully with OAuth");
      initialized = true;
      return true;
    } catch (initErr) {
      console.warn("OAuth initialization approach failed:", initErr);

      // Fallback to direct initialization if OAuth fails
      console.log("Trying fallback authentication approach...");

      try {
        // Configure basic Earth Engine settings
        ee.data.setAuthType("SERVICE_ACCOUNT");

        await ee.initialize({
          credentials: {
            client_email: EE_CLIENT_EMAIL,
            private_key: EE_PRIVATE_KEY.replace(/\\n/g, "\n"),
          },
        });

        console.log(
          "Google Earth Engine initialized successfully with fallback method"
        );
        initialized = true;
        return true;
      } catch (fallbackErr) {
        console.error("Fallback initialization also failed:", fallbackErr);
        throw fallbackErr;
      }
    }
  } catch (err) {
    console.error("Failed to initialize Earth Engine:", err);
    return false;
  }
}

/**
 * Check if Earth Engine is initialized
 */
export function isInitialized() {
  return initialized;
}

/**
 * Get the Earth Engine instance
 */
export default ee;
