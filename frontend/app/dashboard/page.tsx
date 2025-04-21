"use client";

import React, { useState, useEffect } from 'react';
import { tokenUpgrade, NFTUpgrade } from "../../utils/app";
import { useAccount } from "wagmi";
import { useEthersSigner } from "../../utils/ethersAdapter";
import { fetchUserTransactions, fetchUserNFTs, fetchUserTokens } from "../../utils/AppFetch";
import toast from 'react-hot-toast';
import { ethers } from 'ethers';
import { formatDistanceToNow } from 'date-fns';

interface TokenInfo {
  name: string;
  symbol: string;
  balance: number;
  address: string;
  image: string;
}

interface NFTInfo {
  name: string;
  tokenId: number;
  address: string;
  image: string;
}

interface TransactionInfo {
  type: string;
  name: number;
  id: number;
  amount: number;
  time: Date;
  status: string;
}

const dashboard: React.FC = () => {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState('assets');
  const [userTokens, setUserTokens] = useState<TokenInfo[]>([]);
  const [userNFTs, setUserNFTs] = useState<NFTInfo[]>([]);
  const [userTransactions, setUserTransactions] = useState<TransactionInfo[]>([]);
  const [amount, setAmount] = useState<string>('');
  const [amounts, setAmounts] = useState<{ [key: number]: string }>({});

  const signer = useEthersSigner();

  useEffect(() => {
    const getUserTokens = async () => {
      console.log(signer);
      const tokens = await fetchUserTokens(address, signer);
      if (tokens) {
        setUserTokens(tokens);
      }
    };

    getUserTokens();
  }, []);

  useEffect(() => {
    const getUserNFTs = async () => {

      const nfts = await fetchUserNFTs(address, signer);
      if (nfts) {
        setUserNFTs(nfts);
      }
    };

    getUserNFTs();
  }, []);

  useEffect(() => {
    const getUserTransactions = async () => {
      const transactions = await fetchUserTransactions(address);
      if (transactions) {
        setUserTransactions(transactions);
      }
    };

    getUserTransactions();
  }, []);

  const upgradeNFT = async (NFTAddress: string, tokenId: number) => {
    try {
      const result = await NFTUpgrade(signer, NFTAddress, tokenId);
      if (result === true) {
        toast.success('NFT upgraded successfully');
      } else {
        toast.error('Failed to upgrade NFT');
      }
    } catch (error) {
      console.log(error);
      toast.error('Error upgrading NFT: ' + (error as Error).message);
    }
  }

  const upgradeToken = async (tokenAddress: string, index: number) => {
    try {
      const amount = amounts[index];
      console.log(amount);
      const result = await tokenUpgrade(signer, tokenAddress, amount);
      if (result === true) {
        toast.success('Token upgraded successfully');
      } else {
        toast.error('Failed to upgrade token');
      }
    } catch (error) {
      console.log(error);
      toast.error('Error upgrading token: ' + (error as Error).message);
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'assets':
        return (
          <div className="p-6 bg-gray-800 rounded-lg shadow-lg border border-gray-700 space-y-4">
            {userNFTs.length === 0 && userTokens.length === 0 ? (
              <p className="text-gray-400">No Assets available</p>
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-4 text-gray-100">NFTS</h2>
                {userNFTs.length === 0 ? (
                  <p className="text-gray-400">No NFTs available</p>
                ) : (
                  userNFTs.map((NFT, index) => (
                    <div key={index} className="p-4 bg-gray-700 rounded-lg shadow-md space-y-2 flex items-center">
                      <img 
                        src={NFT.image}
                        alt="Description" 
                        className="w-16 h-16 rounded-lg mr-4" 
                      />
                      <div className="flex-1 flex flex-col items-start">
                        <p>{NFT.name}</p>
                        <p>#{NFT.tokenId}</p>
                      </div>
                      <div className="flex items-center">
                        <button 
                          onClick={() => upgradeNFT(NFT.address, NFT.tokenId)}
                          className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition shadow-lg"
                        >
                          Upgrade
                        </button>
                      </div>
                    </div>
                  ))
                )}

                <h2 className="text-2xl font-bold mb-4 text-gray-100">Tokens</h2>
                {userTokens.length === 0 ? (
                  <p className="text-gray-400">No Tokens available</p>
                ) : (
                  userTokens.map((Token, index) => (
                    <div key={index} className="p-4 bg-gray-700 rounded-lg shadow-md space-y-2 flex items-center justify-between">
                      <div className="flex flex-col items-start">
                        <p>{Token.name}</p>
                        <p>{Token.symbol}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <p>{Token.balance}</p>
                        <div className="flex items-center space-x-2">
                          <input 
                            type="string" 
                            placeholder="Amount" 
                            value={amounts[index] || ''}
                            onChange={(e) => setAmounts({ ...amounts, [index]: e.target.value })}
                            className="p-2 bg-gray-800 border border-gray-600 rounded-lg text-white shadow-inner focus:outline-none"
                          />
                          <button 
                            onClick={() => upgradeToken(Token.address, index)}
                            className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition shadow-lg"
                          >
                            Upgrade
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        );

      case 'offers':
        return null;

      case 'transactions':
        return (
          <div className="p-6 bg-gray-800 rounded-lg shadow-lg border border-gray-700 space-y-4">
            <h2 className="text-2xl font-bold mb-4 text-gray-100">Transactions</h2>
            {userTransactions.length === 0 ? (
              <p className="text-gray-400">No transactions available</p>
            ) : (
              userTransactions.map((tx, index) => (
                <div key={index} className="p-4 bg-gray-700 rounded-lg shadow-md space-y-2 flex items-start justify-between">
                  <div className="flex flex-col">
                    <p className="font-medium">{tx.name}</p>
                    <p>{tx.amount}</p>
                    <p>Status: {tx.status}</p>
                    <p>Type: {tx.type}</p>
                    <p>{formatDistanceToNow(new Date(tx.time), { addSuffix: true })}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-100">FlareSec</h1>

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-8 justify-center">
        <button 
          onClick={() => setActiveTab('assets')}
          className={`px-6 py-3 rounded-full font-semibold transition ${
            activeTab === 'assets' ? 'bg-blue-500 text-white shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Assets
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-6 py-3 rounded-full font-semibold transition ${
            activeTab === 'transactions' ? 'bg-blue-500 text-white shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Transactions
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-700">
        {renderContent()}
      </div>
    </div>
  );
};

export default dashboard;
