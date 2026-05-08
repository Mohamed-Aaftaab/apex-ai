import { createThirdwebClient } from "thirdweb";

// Replace with your actual client ID from thirdweb.com/dashboard
const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "e2069720516fc9faeb44619a93ddceea";

export const client = createThirdwebClient({
  clientId: clientId,
});
