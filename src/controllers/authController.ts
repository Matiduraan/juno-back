import { PrismaClient } from "@prisma/client";
import { CreateUserInput } from "../types/auth/input";
import jwt from "jsonwebtoken";
import { hash } from "bcrypt";
import dayjs from "dayjs";
import { getGoogleUserId } from "./googleController";

const db = new PrismaClient();

export const getUserByEmail = async (email: string) => {
  return await db.user.findUnique({
    where: { email },
  });
};

export const createUser = async (data: CreateUserInput) => {
  return await db.user.create({
    data,
  });
};

export const getUserTokens = async ({
  userId,
  ip,
  userAgent,
}: {
  userId: number;
  userAgent?: string;
  ip?: string;
}) => {
  const accessToken = jwt.sign(
    { userId, userAgent, ip },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" }
  );
  const refreshToken = jwt.sign(
    { userId, userAgent, ip },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: "7d" }
  );
  const hashedRefreshToken = await hash(refreshToken, 10);
  await db.refreshToken.create({
    data: {
      user_id: userId,
      token: hashedRefreshToken,
      userAgent,
      ip,
      expires_at: dayjs().add(7, "day").toDate(),
    },
  });
  return { accessToken, refreshToken };
};

export const revokeToken = async (conditions: {
  user_id?: number;
  token?: string;
}) => {
  const { token, ...where } = conditions;
  const hashedToken = token ? await hash(token, 10) : undefined;
  await db.refreshToken.updateMany({
    where: {
      ...where,
      ...(hashedToken ? { token: hashedToken } : {}),
      expires_at: {
        gte: new Date(),
      },
    },
    data: {
      revoked: true,
    },
  });
};

export const isRefreshTokenValid = async (
  token: string
): Promise<number | null> => {
  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as {
      userId: number;
      userAgent?: string;
      ip?: string;
    };

    if (
      !payload ||
      !payload.userId ||
      isNaN(parseInt(payload.userId.toString()))
    ) {
      return null;
    }

    const refreshToken = await db.refreshToken.findFirst({
      where: {
        user_id: payload.userId,
        revoked: false,
        expires_at: {
          gte: new Date(),
        },
      },
    });

    if (!refreshToken || refreshToken.revoked) {
      return null;
    }

    return payload.userId;
  } catch (error) {
    return null;
  }
};

export const isUserLinkedWithGoogle = async (userId: number) => {
  const user = await db.user.findUnique({
    where: { user_id: userId },
    select: { GoogleRefreshToken: true },
  });

  return !!user?.GoogleRefreshToken;
};

export const linkUserWithGoogle = async (
  tokens: { access_token: string; refresh_token: string },
  userId: number
) => {
  const googleUserId = await getGoogleUserId(tokens.access_token);

  await db.googleRefreshToken.upsert({
    where: { user_id: userId },
    update: {
      token: tokens.refresh_token,
    },
    create: {
      user_id: userId,
      token: tokens.refresh_token,
    },
  });

  return await db.user.update({
    where: { user_id: userId },
    data: {
      google_id: googleUserId,
    },
  });
};

export async function getUserByGoogleId(googleId: string) {
  return await db.user.findFirst({
    where: { google_id: googleId },
  });
}
