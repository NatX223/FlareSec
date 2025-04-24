"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEthersSigner } from "../utils/ethersAdapter";
import { useAccount, useDisconnect } from 'wagmi';
import { checkUserSignUp, signupUser } from "@/utils/app";
import toast from 'react-hot-toast';

const Home: React.FC = () => {
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter(); // Initialize the router for navigation
  const [active, setActive] = useState<string | null>(null);
  const [showSignUpForm, setShowSignUpForm] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [hasAccount, setHasAccount] = useState(true);

  const signer = useEthersSigner({chainId: 114});

  useEffect(() => {
    const checkUserAccount = async () => {
      if (isConnected) {
        try {
          const accountStatus = await checkUserSignUp(address);
          setHasAccount(accountStatus);
          
          // Redirect to dashboard if the user has an account
          if (accountStatus) {
            router.push('/dashboard'); // Redirect to the dashboard
          }
        } catch (error) {
          console.error('Error checking user account:', error);
        }
      }
    };

    checkUserAccount();
  }, [isConnected]);

    // Handle sign-up form submission
  const handleSignUp = async () => {
    if (emailAddress) {
      try {
        const result = await signupUser(address, emailAddress);
        if (result) {
          toast.success('Account created successfully!');
          setShowSignUpForm(false);
          setHasAccount(true);
        } else {
          toast.error('Failed to create account');
        }
      } catch (error) {
        console.error('Error creating user:', error);
        toast.error('Error creating account: ' + (error as Error).message);
      }
    }
  };

  // Show sign-up form when connected but no account exists
  useEffect(() => {
    if (isConnected && !hasAccount) {
      setShowSignUpForm(true);
    }
  }, [isConnected, hasAccount]);

  return (
    <div className="min-h-screen max-w-screen-lg mx-auto bg-gradient-to-b from-blue-900 to-gray-800 text-white font-sans flex flex-col">
      <header className="flex justify-between items-center px-4 py-4">
        <h1 className="text-2xl font-bold text-blue-400">FlareSec</h1>
        <div className="flex items-center space-x-2">
        <ConnectButton />
        </div>
      </header>

      {showSignUpForm && (
        <section className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center px-4">
          <div className="bg-gray-700 p-8 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-2xl font-semibold mb-6 text-center">Sign Up</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSignUp();
              }}
            >
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="text"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  className="w-full px-4 py-2 rounded-md bg-gray-800 text-white"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-md text-white font-semibold"
              >
                Submit
              </button>
            </form>
          </div>
        </section>
      )}

      <main className="flex-grow px-4">
        <section className="text-center py-10 space-y-4">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-wide">
            Secure Your Assets.
          </h2>
          <p className="text-lg max-w-2xl mx-auto">
            FlareSec adds an extra layer of security by requiring email verification for approve and transfer transactions, ensuring that only you control your assets.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 py-10">
          {[
            {
              title: 'Stay Informed',
              description: '📧 Get real-time email alerts on transactions.',
            },
            {
              title: 'Be in Control',
              description: '🔒 Prevent unauthorized transactions.',
            },
            {
              title: 'Truly Verifiable',
              description: "FlareSec utilizes Flare's FDC for verifiable and tamper-proof user email auth.",
            },
            {
              title: 'Fully Decentralized',
              description: 'Fully decentralized validator network.',
            },
          ].map((feature, index) => (
            <motion.div
              key={index}
              className="p-2 h-32 bg-gradient-to-br from-blue-800 to-blue-500 rounded-lg shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              viewport={{ once: true }}
            >
              <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-blue-100">{feature.description}</p>
            </motion.div>
          ))}
        </section>

        <section className="text-center py-10">
          <h2 className="text-2xl md:text-3xl font-bold tracking-wide mb-4">
            Powered by and built on Flare
          </h2>
        </section>
      </main>
    </div>
  );
};

export default Home;