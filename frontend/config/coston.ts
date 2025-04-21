import { defineChain } from 'viem';

export const coston2 = defineChain({
    id: 114,
    name: 'Flare Testnet Coston2',
    nativeCurrency: { name: 'C2FLARE', symbol: 'C2FLR', decimals: 18 },
    rpcUrls: {
      default: {
        http: ['https://coston2-api.flare.network/ext/C/rpc'],
      },
    },
    blockExplorers: {
      default: {
        name: 'Blockscan',
        url: 'https://coston2-explorer.flare.network',
        apiUrl: 'https://coston2-explorer.flare.network/api',
      },
    },
    testnet: true,
});