import { http, createConfig } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { walletConnect, injected } from 'wagmi/connectors'

export const projectId = 'e64084e160a2b33a0303baaa490287e2'

const metadata = {
  name: 'Innblock',
  description: 'Blockchain Engineering & Consultancy',
  url: 'https://innblock.com',
  icons: ['https://innblock.com/icon.png']
}

export const config = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http()
  },
  connectors: [
    walletConnect({ projectId, metadata, showQrModal: true }),
    injected({ shimDisconnect: true })
  ]
})
