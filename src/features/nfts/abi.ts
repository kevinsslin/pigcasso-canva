export const pigcassoNftFactoryAbi = [
  {
    type: "function",
    name: "createCollection",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "maxSupply", type: "uint256" },
      { name: "contractUri", type: "string" },
    ],
    outputs: [{ name: "collection", type: "address" }],
  },
  {
    type: "event",
    name: "CollectionCreated",
    inputs: [
      { indexed: true, name: "creator", type: "address" },
      { indexed: true, name: "collection", type: "address" },
      { indexed: false, name: "name", type: "string" },
      { indexed: false, name: "symbol", type: "string" },
      { indexed: false, name: "maxSupply", type: "uint256" },
      { indexed: false, name: "contractUri", type: "string" },
    ],
  },
] as const;

export const pigcassoCollectionAbi = [
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "tokenUri", type: "string" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "function",
    name: "contractURI",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

