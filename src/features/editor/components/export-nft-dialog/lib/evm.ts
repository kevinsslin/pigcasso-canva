export const getFactoryAddress = () =>
  process.env.NEXT_PUBLIC_NFT_FACTORY_ADDRESS?.trim() ?? "";

export const isEvmAddress = (value: string) => /^0x[0-9a-fA-F]{40}$/.test(value);

