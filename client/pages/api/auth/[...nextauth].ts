import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { connectToDatabase } from '../../../lib/mongodb';
import User from '../../../models/User';
import crypto from 'crypto';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Telegram',
      credentials: {
        initData: { label: 'Telegram Init Data', type: 'text' },
      },
      async authorize(credentials) {
        try {
          const initData = credentials?.initData;
          if (!initData) {
            throw new Error('Missing Telegram Init Data');
          }

          const telegramUser = verifyTelegramData(initData);

          // Connect to the database
          await connectToDatabase();
          const user = await findOrCreateUser(telegramUser);

          return {
            id: user._id.toString(),
            telegramId: user.telegramId,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
          };
        } catch (error) {
          console.error('Authorization failed:', error);
          throw new Error('Authentication failed');
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          id: token.id,
          telegramId: token.telegramId,
          firstName: token.firstName,
          lastName: token.lastName,
          username: token.username,
        };
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.telegramId = user.telegramId;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.username = user.username;
      }
      return token;
    },
  },
  pages: {
    signIn: '/authpage',
    error: '/auth/error',
  },
});

// Helper function to verify Telegram data
function verifyTelegramData(initData: string): TelegramUser {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!BOT_TOKEN) {
    throw new Error('Telegram Bot Token is not defined');
  }

  const initDataParams = new URLSearchParams(initData);
  const hash = initDataParams.get('hash');
  initDataParams.delete('hash');

  const dataCheckString = Array.from(initDataParams.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHash('sha256').update(BOT_TOKEN).digest();
  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (computedHash !== hash) {
    throw new Error('Invalid Telegram init data');
  }

  const userRaw = initDataParams.get('user');
  if (!userRaw) {
    throw new Error('User data is missing in initData');
  }

  const telegramUser: TelegramUser = JSON.parse(userRaw);
  return telegramUser;
}

// Helper function for database operations
async function findOrCreateUser(telegramUser: TelegramUser) {
  const telegramId = telegramUser.id;
  let user = await User.findOne({ telegramId });

  if (!user) {
    user = new User({
      telegramId,
      firstName: telegramUser.first_name || '',
      lastName: telegramUser.last_name || '',
      username: telegramUser.username || '',
    });
    await user.save();
  }
  return user;
}
