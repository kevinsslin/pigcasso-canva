import Replicate from "replicate";

let cachedClient: Replicate | null = null;

export const getReplicateClient = () => {
  if (cachedClient) {
    return cachedClient;
  }

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error("Replicate is currently unavailable.");
  }

  cachedClient = new Replicate({ auth: token });
  return cachedClient;
};
