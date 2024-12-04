import { getServerSession } from "next-auth/next";
import UserModel from "@/models/User";
import BoostCardModel from "@/models/Boosts";
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/lib/mongodb";
import { authOptions } from "./auth/[...nextauth]";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    await connectToDatabase();

    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.telegramId) {
      return res.status(401).json({ message: "Unauthorized: Please log in." });
    }

    const { boostId } = req.body;

    if (!boostId || typeof boostId !== "string") {
      return res.status(400).json({ message: "Invalid boost ID provided." });
    }

    // Fetch the boost card details
    const boostCard = await BoostCardModel.findOne({ id: boostId }).select("price").lean();
    if (!boostCard) {
      return res.status(404).json({ message: `Boost with ID '${boostId}' not found.` });
    }

    // Fetch the user
    const user = await UserModel.findOne({ telegramId: session.user.telegramId }).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found. Please try again." });
    }

    const { price } = boostCard;

    if (user.coins < price) {
      return res.status(400).json({ message: "Insufficient coins to purchase this boost." });
    }

    // Perform atomic update
    const updatedUser = await UserModel.findOneAndUpdate(
      { telegramId: session.user.telegramId },
      {
        $inc: {
          coins: -price,
          [`boosts.${boostId}`]: 1,
        },
      },
      { new: true }
    ).lean();

    if (!updatedUser) {
      return res.status(500).json({ message: "Failed to update user. Please try again later." });
    }

    // Success response
    res.status(200).json({
      message: "Boost purchased successfully!",
      boosts: updatedUser.boosts,
      coins: updatedUser.coins,
    });
  } catch (error) {
    console.error("Error in buyBoost API:", error);
    res.status(500).json({ message: "An unexpected error occurred. Please try again later." });
  }
}
