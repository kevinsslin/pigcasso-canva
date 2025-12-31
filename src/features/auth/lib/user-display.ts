export const shortenWalletAddress = (address: string) => {
  const trimmed = address.trim();
  // Avoid shortening when it would not meaningfully shorten the string.
  // `0x1234...abcd` is 13 chars total.
  if (trimmed.length <= 13) {
    return trimmed;
  }
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
};

export const getUserDisplayLabel = (input: {
  name?: string | null;
  email?: string | null;
  walletAddress?: string | null;
}) => {
  const name = input.name?.trim();
  if (name) {
    return name;
  }

  const email = input.email?.trim();
  if (email) {
    return email;
  }

  const walletAddress = input.walletAddress?.trim();
  if (walletAddress) {
    return shortenWalletAddress(walletAddress);
  }

  return "Account";
};

export const getAvatarFallbackText = (label: string) => {
  const trimmed = label.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "A";
};
