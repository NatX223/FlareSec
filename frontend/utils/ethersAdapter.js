import { BrowserProvider, JsonRpcSigner } from "ethers";
import { useMemo } from "react";
import { useConnectorClient } from "wagmi";

export function clientToSigner(client) {
	const { account, chain, transport } = client;
	const network = {
		chainId: chain.id,
		name: chain.name,
		ensAddress: chain.contracts?.ensRegistry?.address,
	};
	const provider = new BrowserProvider(transport, network);
	const signer = new JsonRpcSigner(provider, account.address);
	console.log(transport, chain, network, provider, signer);
	return signer;
}

export function useEthersSigner({ chainId } = {}) {
	const { data: client } = useConnectorClient({ chainId });
	console.log(chainId, client)
	return useMemo(() => (client ? clientToSigner(client) : undefined), [client]);
}
