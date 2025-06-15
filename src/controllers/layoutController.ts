import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

export const getLayout = (layoutId: number) => {
  return db.layout.findFirst({
    where: {
      layout_id: layoutId,
    },
    include: {
      LayoutItem: true,
    },
  });
};

// export const getUserLayouts = (userId: number, offset = 0, limit = 50) => {
//   return db.layout.findMany({
//     where: {
//       layout_owner_id: userId,
//       layout_type: "MODEL",
//     },
//     select: {
//       layout_id: true,
//       layout_name: true,
//       layout_type: true,
//       layout_description: true,
//       layout_owner_id: true,
//     },
//     take: limit !== 0 ? limit : undefined,
//     skip: offset,
//   });
// };

export const getUserLayouts = async (
  userId: number,
  offset = 0,
  limit = 50
) => {
  const layouts = await db.layout.findMany({
    where: {
      layout_owner_id: userId,
      layout_type: "MODEL",
    },
    select: {
      layout_id: true,
      layout_name: true,
      layout_type: true,
      layout_description: true,
      layout_owner_id: true,
    },
    take: limit !== 0 ? limit : undefined,
    skip: offset,
  });

  const layoutIds = layouts.map((l) => l.layout_id);

  const seatCounts = await db.layoutItem.groupBy({
    by: ["layout_id"],
    where: {
      layout_id: { in: layoutIds },
    },
    _sum: {
      layout_item_seat_count: true,
    },
  });

  const result = layouts.map((layout) => {
    const seatData = seatCounts.find((s) => s.layout_id === layout.layout_id);
    return {
      ...layout,
      total_seats: seatData?._sum.layout_item_seat_count ?? 0,
    };
  });

  return result;
};

export const updateLayout = ({
  layoutId,
  elements = [],
  layoutName,
}: UpdateLayoutInput) => {
  db.layout.update({
    where: {
      layout_id: layoutId,
    },
    data: {
      layout_name: layoutName,
    },
  });
  let toUpdate: Array<LayoutItem<number>> = [];
  let toCreate: Array<LayoutItem<undefined>> = [];

  elements.forEach(async (element) => {
    if (element.layout_item_id && typeof element.layout_item_id === "number") {
      toUpdate.push({
        layout_item_id: element.layout_item_id,
        layout_item_type: element.layout_item_type,
        layout_item_shape: element.layout_item_shape,
        layout_item_position_x: element.layout_item_position_x,
        layout_item_position_y: element.layout_item_position_y,
        layout_item_size: element.layout_item_size,
        layout_item_rotation: element.layout_item_rotation,
        layout_item_color: element.layout_item_color,
        layout_item_radius: element.layout_item_radius,
        layout_item_name: element.layout_item_name,
      });
    } else {
      toCreate.push({
        layout_item_id: undefined,
        layout_item_type: element.layout_item_type,
        layout_item_shape: element.layout_item_shape,
        layout_item_position_x: element.layout_item_position_x,
        layout_item_position_y: element.layout_item_position_y,
        layout_item_size: element.layout_item_size,
        layout_item_rotation: element.layout_item_rotation,
        layout_item_color: element.layout_item_color,
        layout_item_radius: element.layout_item_radius,
        layout_item_name: element.layout_item_name,
      });
    }
  });

  return db.$transaction([
    ...toUpdate.map((item) =>
      db.layoutItem.update({
        where: { layout_item_id: item.layout_item_id },
        data: item,
      })
    ),
    ...toCreate.map((item) =>
      db.layoutItem.create({
        data: {
          ...item,
          layout_item_id: undefined,
          Layout: {
            connect: {
              layout_id: layoutId,
            },
          },
        },
      })
    ),
  ]);
};

export const createLayout = ({
  userId,
  elements,
  layoutName,
}: CreateLayoutInput) => {
  return db.layout.create({
    data: {
      layout_name: layoutName || "Untitled Layout",
      layout_owner_id: userId,
      layout_type: "MODEL",
      LayoutItem: {
        createMany: {
          data:
            !elements || elements?.length === 0
              ? []
              : elements.map((element) => ({
                  layout_item_type: element.layout_item_type,
                  layout_item_shape: element.layout_item_shape,
                  layout_item_position_x: element.layout_item_position_x,
                  layout_item_position_y: element.layout_item_position_y,
                  layout_item_size: element.layout_item_size,
                  layout_item_rotation: element.layout_item_rotation,
                  layout_item_color: element.layout_item_color,
                  layout_item_radius: element.layout_item_radius,
                  layout_item_name: element.layout_item_name,
                })),
        },
      },
    },
  });
};

export const createPartyLayout = async (userId: number, layoutName: string) => {
  const pendingLayout = await db.layout.findMany({
    where: {
      layout_owner_id: userId,
      layout_type: "PARTY",
      NOT: {
        Party: {
          some: {},
        },
      },
    },
  });

  if (pendingLayout.length > 0) {
    return db.layout.update({
      where: {
        layout_id: pendingLayout[0].layout_id,
      },
      data: {
        layout_name: layoutName,
      },
      select: {
        layout_id: true,
      },
    });
  }
  return db.layout.create({
    data: {
      layout_name: layoutName,
      layout_owner_id: userId,
      layout_type: "PARTY",
    },
    select: {
      layout_id: true,
    },
  });
};

export const layoutIdOnPartyCreation = async (
  userId: number,
  chosenLayoutId?: number
) => {
  const missingLayout = await db.layout.findFirst({
    where: {
      layout_owner_id: userId,
      layout_type: "PARTY",
      NOT: {
        Party: {
          some: {},
        },
        layout_id: chosenLayoutId,
      },
    },
  });
  if (chosenLayoutId) {
    if (missingLayout) {
      await db.layout.delete({
        where: {
          layout_id: missingLayout.layout_id,
        },
      });
    }
    return chosenLayoutId;
  }
  if (!missingLayout) {
    throw new Error("No available layout for party creation");
  }
  return missingLayout?.layout_id;
};
