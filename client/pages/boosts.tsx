import Layout from "../components/layout";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import axios from "axios";
import { IUserState } from '../models/User';
import { IBoostCard } from '../models/Boosts';
import { showNotification } from '../lib/notifications';

interface MineralCard {
  imageUrl: string;
  owned: number;
}

// Hardcoded Mineral Cards
const minerals: MineralCard[] = [
  { imageUrl: "/mineral/c.png", owned: 1 },
  { imageUrl: "/mineral/au.png", owned: 1 },
  { imageUrl: "/mineral/as.png", owned: 1 },
  { imageUrl: "/mineral/ba.png", owned: 1 },
  { imageUrl: "/mineral/br.png", owned: 1 },
  { imageUrl: "/mineral/ca.png", owned: 1 },
  { imageUrl: "/mineral/cs.png", owned: 1 },
  { imageUrl: "/mineral/fe.png", owned: 1 },
  { imageUrl: "/mineral/mn-1.png", owned: 1 },
  { imageUrl: "/mineral/p.png", owned: 1 },
  { imageUrl: "/mineral/pd.png", owned: 1 },
  { imageUrl: "/mineral/rh.png", owned: 1 },
  { imageUrl: "/mineral/sb.png", owned: 1 },
  { imageUrl: "/mineral/sn.png", owned: 1 },
  { imageUrl: "/mineral/ti.png", owned: 1 },
  { imageUrl: "/mineral/u.png", owned: 1 },
  { imageUrl: "/mineral/zr.png", owned: 1 },
];

const Store: React.FC = () => {
  const { data: session } = useSession();
  const [boostCards, setBoostCards] = useState<IBoostCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<IUserState | null>(null);

  function triggerSuccess() {
    showNotification('Purchase was succesfull!', 'success');
  }
  
  function triggerWarning() {
    showNotification('This is a warning!', 'warning');
  }
  
  function triggerError() {
    showNotification('Not enough tokens!', 'error');
  }
  
  useEffect(() => {
    const fetchBoostCards = async () => {
      try {
        const response = await axios.get("/api/boost-cards");
        console.log("Fetched boost cards:", response.data);
        setBoostCards(response.data); 
      } catch (err) {
        console.error("Error fetching boost cards:", err);
        setError("Failed to load boost cards.");
      } finally {
        setLoading(false);
      }
    };

    fetchBoostCards();
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch('/api/user/data');
        if (!res.ok) throw new Error('Failed to fetch user data');
        const data = await res.json();
        setUserData(data);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false); 
      }
    };
    if (session) {
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, [session]);

  const handlePurchase = async (boostId: string) => {
    try {
      const response = await fetch('/api/buyboost', {
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json', 
        },
        body: JSON.stringify({ boostId }), 
      });
  
      if (response.ok) {
        const data = await response.json();
        setUserData((prev) => {
          if (!prev) return prev; 
          const newBoosts = { ...prev.boosts };
          newBoosts[boostId] = (newBoosts[boostId] || 0) + 1;
          return {
            ...prev,
            coins: prev.coins - (boostCards.find((card) => card.id === boostId)?.price || 0),
            boosts: newBoosts,
          };
        });
        
        triggerSuccess()
      } else {
        const errorData = await response.json();
        triggerError()
      }
    } catch (error) {
      console.error(error);
      triggerWarning()
    }
  };

  
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen w-screen bg-base-100">
        <div className="loading loading-spinner loading-lg mb-4"></div>
      </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="text-center">
          <p className="text-red-500">{error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col min-h-screen pb-20">
        <div className="text-center p-5">
          <h1 className="text-3xl font-bold p-2">🚀 Store</h1>
          <p className="p-2">Purchase boosts and collect minerals to accelerate your progress!</p>
        </div>

        {/* Boost Cards Section */}
        <div className="card bg-neutral text-white p-5 shadow-lg m-3">
          <h2 className="card-title text-center mb-4">Boost Cards</h2>
          <div className="flex flex-col gap-4">
            {boostCards.map((card) => (
              <div
                key={card.id}
                className="flex items-center bg-secondary text-white p-4 rounded-xl"
              >
                <img
                  src={card.imageUrl}
                  alt={card.title}
                  className="w-20 h-20 object-contain mr-4 rounded-xl"
                />

                <div className="flex-1">
                  <h3 className="font-bold text-lg">{card.title}</h3>
                  <p className="font-semibold">{card.price} GTL</p>
                  <p className="text-sm">Owned: {userData?.boosts?.[card.id] || 0}</p>
                </div>

                <button 
                className="btn btn-base-100 ml-4 rounded-xl border-2"
                onClick={() => handlePurchase(card.id)}>
                  Buy
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Mineral Cards Section */}
        <div className="card bg-neutral text-white p-5 shadow-lg m-3">
          <h2 className="card-title text-center mb-4">Mineral Cards</h2>
          <div className="flex flex-col gap-4">
            {minerals.map((mineral, index) => (
              <div
                key={index}
                className="flex items-center bg-secondary text-white p-4 rounded-xl"
              >
                <img
                  src={mineral.imageUrl}
                  alt={`Mineral ${index + 1}`}
                  className="w-20 h-20 object-contain mr-4 rounded-xl"
                />
                <div className="flex-1">
                  <p className="font-bold text-lg">Mineral {index + 1}</p>
                  <p className="text-sm">Owned: {mineral.owned}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Store;