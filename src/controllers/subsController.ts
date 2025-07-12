import { PrismaClient } from "@prisma/client";
import { keyValidation } from "../validations/subsValidation";

const db = new PrismaClient();

export function getSubscriptionPlans() {
  return db.subcriptionPlan.findMany({
    include: {
      planFeature: true,
    },
  });
}

export function getSubscriptionPlanById(planId: number) {
  return db.subcriptionPlan.findUnique({
    where: { plan_id: planId },
    include: {
      planFeature: true,
    },
  });
}

export function getUserSubscription(userId: number) {
  return db.userSubscription.findFirst({
    where: { user_id: userId },
    include: {
      SubscriptionPlan: {
        include: {
          planFeature: true,
        },
      },
    },
  });
}

export async function getUserFeatures(userId: number) {
  const userSub = await db.userSubscription.findMany({
    where: { user_id: userId },
    include: {
      SubscriptionPlan: {
        include: {
          planFeature: true,
        },
      },
    },
  });

  if (!userSub || userSub.length === 0) {
    return {};
  }

  const features = userSub.flatMap((sub) => sub.SubscriptionPlan.planFeature);
  const featureKeys = features.reduce((acc, feature) => {
    acc[feature.feature_key] = {
      value: feature.feature_value,
      enabled: feature.feature_enabled,
    };
    return acc;
  }, {} as Record<string, { value: number | null; enabled: boolean }>);

  return featureKeys;
}

export async function getEnabledUserParties(userId: number) {
  const userSub = await db.userSubscription.findFirst({
    where: { user_id: userId },
    include: {
      SubscriptionPlan: {
        include: {
          planFeature: true,
        },
      },
    },
  });

  if (!userSub) {
    return [];
  }

  const features = userSub.SubscriptionPlan.planFeature;
  const partyCreationFeature = features.find(
    (f) => f.feature_key === "PARTY_CREATION"
  );

  if (!partyCreationFeature || !partyCreationFeature.feature_enabled) {
    return [];
  }

  if (
    partyCreationFeature.feature_enabled &&
    !partyCreationFeature.feature_value
  ) {
    return ["all"];
  }

  const maxParties = partyCreationFeature.feature_value || 0;

  const parties = await db.party.findMany({
    where: {
      organizer_id: userId,
    },
    select: {
      party_id: true,
    },
    take: maxParties,
  });

  return parties.map((party) => party.party_id);
}
