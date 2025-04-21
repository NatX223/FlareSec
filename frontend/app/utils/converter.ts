import { BrowserProvider, ethers } from "ethers";

// Define the type for an EIP1193Provider
interface EIP1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

// Function to convert EIP1193Provider to Signer
export async function getSignerFromProvider(eip1193Provider: EIP1193Provider): Promise<ethers.Signer> {
  // Convert the EIP1193Provider to an ethers.js provider
  const ethersProvider = new BrowserProvider(eip1193Provider as any);

  // Request accounts (connect wallet if needed)
//   await eip1193Provider.request({ method: "eth_requestAccounts" });

  // Get the signer (default to the first account)
  const signer = ethersProvider.getSigner();
  return signer;
}
