import { http, createConfig } from "wagmi";
import { bsc, bscTestnet } from "wagmi/chains";
import { injected, walletConnect, metaMask } from "wagmi/connectors";
import { config as appConfig } from "./config";

const activeChain = appConfig.chainId === 56 ? bsc : bscTestnet;

const connectors = [
  injected({ shimDisconnect: true }),
  metaMask(),
  ...(appConfig.walletConnectId
    ? [
        walletConnect({
          projectId: appConfig.walletConnectId,
          showQrModal: true,
          metadata: {
            name: "Blobbie Playground",
            description: "Blobbie Daily Rewards Draw + Airdrop Hub",
            url: appConfig.siteUrl,
            icons: [`${appConfig.siteUrl}/icon.svg`],
          },
        }),
      ]
    : []),
];

export const wagmiConfig = createConfig({
  chains: [activeChain],
  connectors,
  transports: {
    [bsc.id]: http(),
    [bscTestnet.id]: http(),
  },
  ssr: true,
});

export const targetChain = activeChain;

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
