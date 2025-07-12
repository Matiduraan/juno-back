import { PrismaClient } from "@prisma/client";
import { FEATURE_KEYS } from "../constants/featureKeys";

type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];

const db = new PrismaClient();

const keyValidationFunction: Record<
  FeatureKey,
  (params: Record<string, string>) => Promise<boolean>
> = {
  [FEATURE_KEYS.PARTY_CREATION]: async ({ userId }) => {
    if (!userId || isNaN(parseInt(userId))) {
      return false;
    }
    const userSub = await db.userSubscription.findFirst({
      where: { user_id: parseInt(userId) },
      include: {
        SubscriptionPlan: {
          include: {
            planFeature: true,
          },
        },
      },
    });
    if (!userSub) {
      return false;
    }
    const features = userSub.SubscriptionPlan.planFeature;
    const feature = features.find(
      (f) => f.feature_key === FEATURE_KEYS.PARTY_CREATION
    );
    if (!feature || !feature.feature_enabled) {
      return false;
    }
    if (feature.feature_enabled && !feature.feature_value) {
      return true;
    }
    const maxValue = feature.feature_value || 0;

    const userPartiesCount = await db.party.count({
      where: {
        OR: [
          { organizer_id: parseInt(userId) },
          { PartyHosts: { some: { host_id: parseInt(userId) } } },
        ],
      },
    });
    return userPartiesCount < maxValue;
  },
  [FEATURE_KEYS.GUEST_CREATION]: async ({ userId, partyId }) => {
    if (
      !userId ||
      isNaN(parseInt(userId)) ||
      !partyId ||
      isNaN(parseInt(partyId))
    ) {
      return false;
    }
    const userSub = await db.userSubscription.findFirst({
      where: { user_id: parseInt(userId) },
      include: {
        SubscriptionPlan: {
          include: {
            planFeature: true,
          },
        },
      },
    });
    if (!userSub) {
      return false;
    }
    const features = userSub.SubscriptionPlan.planFeature;
    const feature = features.find(
      (f) => f.feature_key === FEATURE_KEYS.GUEST_CREATION
    );
    if (!feature || !feature.feature_enabled) {
      return false;
    }
    if (feature.feature_enabled && !feature.feature_value) {
      return true;
    }
    const maxValue = feature.feature_value || 0;

    const userGuestsCount = await db.partyGuest.count({
      where: { party_id: parseInt(partyId) },
    });
    return userGuestsCount < maxValue;
  },
  [FEATURE_KEYS.PARTY_VIEW]: async ({ userId, partyId }) => {
    if (!userId || isNaN(parseInt(userId))) {
      return false;
    }
    const userSub = await db.userSubscription.findFirst({
      where: { user_id: parseInt(userId) },
      include: {
        SubscriptionPlan: {
          include: {
            planFeature: true,
          },
        },
      },
    });
    if (!userSub) {
      return false;
    }
    const features = userSub.SubscriptionPlan.planFeature;
    const feature = features.find(
      (f) => f.feature_key === FEATURE_KEYS.PARTY_CREATION
    );
    if (!feature || !feature.feature_enabled) {
      return false;
    }
    if (feature.feature_enabled && !feature.feature_value) {
      return true;
    }
    const maxValue = feature.feature_value || 0;
    const partyOwnerPartiesCount = await db.party.findFirst({
      where: {
        party_id: parseInt(partyId),
      },
      select: {
        organizer_id: true,
        Organizer: {
          select: {
            _count: {
              select: {
                Party: true,
              },
            },
          },
        },
      },
    });

    const userPartiesCount =
      partyOwnerPartiesCount?.Organizer._count.Party || 0;
    if (userPartiesCount < maxValue) {
      return true;
    }
    if (!partyId || isNaN(parseInt(partyId))) {
      return false;
    }
    const userPartiesIds = await db.party.findMany({
      where: { organizer_id: partyOwnerPartiesCount?.organizer_id },
      select: { party_id: true },
      take: maxValue,
      orderBy: { created_at: "desc" },
    });
    return userPartiesIds.some((party) => party.party_id === parseInt(partyId));
  },
  [FEATURE_KEYS.REUSABLE_LAYOUTS]: async ({ userId }) => {
    if (!userId || isNaN(parseInt(userId))) {
      return false;
    }
    const userSub = await db.userSubscription.findFirst({
      where: { user_id: parseInt(userId) },
      include: {
        SubscriptionPlan: {
          include: {
            planFeature: true,
          },
        },
      },
    });
    if (!userSub) {
      return false;
    }
    const features = userSub.SubscriptionPlan.planFeature;
    const feature = features.find(
      (f) => f.feature_key === FEATURE_KEYS.REUSABLE_LAYOUTS
    );
    if (!feature || !feature.feature_enabled) {
      return false;
    }
    const maxValue = feature?.feature_value || 0;
    const userLayoutsCount = await db.layout.count({
      where: { layout_owner_id: parseInt(userId), layout_type: "MODEL" },
    });
    return userLayoutsCount < maxValue;
  },
  [FEATURE_KEYS.LAYOUT_EDIT]: async ({ userId, layoutId }) => {
    if (!userId || isNaN(parseInt(userId))) {
      return false;
    }
    const userSub = await db.userSubscription.findFirst({
      where: { user_id: parseInt(userId) },
      include: {
        SubscriptionPlan: {
          include: {
            planFeature: true,
          },
        },
      },
    });
    if (!userSub) {
      return false;
    }
    const features = userSub.SubscriptionPlan.planFeature;
    const feature = features.find(
      (f) => f.feature_key === FEATURE_KEYS.REUSABLE_LAYOUTS
    );
    if (!feature || !feature.feature_enabled) {
      return false;
    }
    if (feature.feature_enabled && !feature.feature_value) {
      return true;
    }
    const maxValue = feature.feature_value || 0;
    const userLayoutsCount = await db.layout.count({
      where: {
        layout_owner_id: parseInt(userId),
        layout_type: "MODEL",
      },
    });
    if (userLayoutsCount < maxValue) {
      return true;
    }
    if (!layoutId || isNaN(parseInt(layoutId))) {
      return false;
    }
    const layoutInfo = await db.layout.findUnique({
      where: { layout_id: parseInt(layoutId) },
      select: { layout_type: true },
    });
    if (layoutInfo?.layout_type === "PARTY") {
      return true;
    }
    const userLayoutsId = await db.layout.findMany({
      where: {
        layout_owner_id: parseInt(userId),
        layout_type: "MODEL",
      },
      select: { layout_id: true },
      take: maxValue,
      orderBy: { created_at: "desc" },
    });
    return userLayoutsId.some(
      (layout) => layout.layout_id === parseInt(layoutId)
    );
  },
};

export const keyValidation = async (
  key: FeatureKey,
  params: Record<string, string>
): Promise<boolean> => {
  if (!keyValidationFunction[key]) {
    throw new Error(`No validation function defined for key: ${key}`);
  }

  return await keyValidationFunction[key](params);
};

export const validateFeatureParams = async (
  key: FeatureKey,
  params: Record<string, string>
): Promise<boolean> => {
  const validations: Record<FeatureKey, boolean> = {
    [FEATURE_KEYS.PARTY_CREATION]: true,
    [FEATURE_KEYS.GUEST_CREATION]:
      !!params.partyId && !isNaN(parseInt(params.partyId.toString())),
    [FEATURE_KEYS.PARTY_VIEW]:
      !!params.partyId && !isNaN(parseInt(params.partyId.toString())),
    [FEATURE_KEYS.REUSABLE_LAYOUTS]: true,
    [FEATURE_KEYS.LAYOUT_EDIT]:
      !!params.layoutId && !isNaN(parseInt(params.layoutId.toString())),
  };

  return validations[key];
};

export const isValidFeatureKey = (key: string): key is FeatureKey => {
  return Object.keys(FEATURE_KEYS).includes(key);
};
