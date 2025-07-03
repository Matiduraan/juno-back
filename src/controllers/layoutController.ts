import { Layout, PrismaClient } from "@prisma/client";

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

export const getUserLayouts = async (
  userId: number,
  offset = 0,
  limit = 50,
  sortField: keyof Layout = "created_at"
) => {
  const queryLayouts = db.layout.findMany({
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
      created_at: true,
      updated_at: true,
    },
    orderBy: {
      [sortField]: "desc",
    },
    take: limit !== 0 ? limit : undefined,
    skip: offset,
  });

  const queryPagination = db.layout.count({
    where: {
      layout_owner_id: userId,
      layout_type: "MODEL",
    },
  });

  const [layouts, totalCount] = await db.$transaction([
    queryLayouts,
    queryPagination,
  ]);

  const layoutIds = layouts.map((l) => l.layout_id);

  const { totalRooms, totalSeats, totalTables } = await getLayoutsMetrics(
    layoutIds
  );

  const result = layouts.map((layout) => {
    // const seatData = totalSeats.find((s) => s.layout_id === layout.layout_id);
    const seatData = totalSeats.find((s) => s.layout_id === layout.layout_id);
    const roomData = totalRooms.find((r) => r.layout_id === layout.layout_id);
    const tableData = totalTables.find((t) => t.layout_id === layout.layout_id);

    return {
      ...layout,
      total_seats: seatData?._sum?.layout_item_seat_count || 0,
      total_rooms: roomData?._count?.layout_item_id || 0,
      total_tables: tableData?._count?.layout_item_id || 0,
    };
  });

  const pagination = {
    total: totalCount,
    offset: offset,
    limit: limit,
  };

  return { results: result, pagination };
};

const getLayoutsMetrics = async (layoutsIds: number[]) => {
  // const queryTotalSeats = db.layoutItem.groupBy({
  //   by: ["layout_id"],
  //   where: {
  //     layout_id: { in: layoutsIds },
  //     layout_item_type: "SEAT",
  //   },
  //   _sum: {
  //     layout_item_seat_count: true,
  //   },
  // });
  const queryTotalSeats = db.layoutItem.groupBy({
    by: ["layout_id"],
    where: {
      layout_id: { in: layoutsIds },
    },
    _sum: {
      layout_item_seat_count: true,
    },
  });

  const queryTotalTables = db.layoutItem.groupBy({
    by: ["layout_id"],
    where: {
      layout_id: { in: layoutsIds },
      layout_item_type: "TABLE",
    },
    _count: {
      layout_item_id: true,
    },
  });

  const queryTotalRooms = db.layoutItem.groupBy({
    by: ["layout_id"],
    where: {
      layout_id: { in: layoutsIds },
      layout_item_type: "ROOM",
    },
    _count: {
      layout_item_id: true,
    },
  });

  const [totalSeats, totalTables, totalRooms] = await db.$transaction([
    queryTotalSeats,
    queryTotalTables,
    queryTotalRooms,
  ]);

  return {
    totalSeats,
    totalTables,
    totalRooms,
  };
};

export const updateLayout = async ({
  layoutId,
  elements = [],
  layoutName,
  layoutDescription = "",
}: UpdateLayoutInput<number>) => {
  let toUpdate: Array<LayoutItem<number>> = [];
  let toCreate: Array<LayoutItem<undefined>> = [];

  const toDeleteIds = await db.layoutItem.findMany({
    where: {
      layout_id: layoutId,
      layout_item_id: {
        notIn: elements
          .filter(
            (e) => e.layout_item_id && typeof e.layout_item_id === "number"
          )
          .map((e) => e.layout_item_id),
      },
    },
    select: {
      layout_item_id: true,
    },
  });

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
        layout_item_seat_count: element.layout_item_seat_count,
        layout_item_width: element.layout_item_width,
        layout_item_height: element.layout_item_height,
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
        layout_item_seat_count: element.layout_item_seat_count,
        layout_item_width: element.layout_item_width,
        layout_item_height: element.layout_item_height,
      });
    }
  });

  db.$transaction([
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
    ...toDeleteIds.map((item) =>
      db.layoutItem.delete({
        where: { layout_item_id: item.layout_item_id },
      })
    ),
  ]);

  return db.layout.update({
    where: {
      layout_id: layoutId,
    },
    data: {
      layout_description: layoutDescription,
      layout_name: layoutName,
    },
  });
};

export const createLayout = ({
  userId,
  elements,
  layoutName,
  layoutDescription = "",
}: CreateLayoutInput) => {
  return db.layout.create({
    data: {
      layout_name: layoutName || "Untitled Layout",
      layout_owner_id: userId,
      layout_type: "MODEL",
      layout_description: layoutDescription,
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
      layout_id: { not: chosenLayoutId },
      Party: {
        none: {}, // No está relacionado con ninguna party
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
    const chosen = await db.layout.findFirst({
      where: {
        layout_id: chosenLayoutId,
        layout_owner_id: userId,
        layout_type: "PARTY",
      },
    });
    if (chosen) {
      return chosen.layout_id;
    }
    const toDuplicateElements = await db.layoutItem.findMany({
      where: {
        layout_id: chosenLayoutId,
      },
      select: {
        layout_item_id: true,
        layout_item_type: true,
        layout_item_shape: true,
        layout_item_position_x: true,
        layout_item_position_y: true,
        layout_item_size: true,
        layout_item_rotation: true,
        layout_item_color: true,
        layout_item_radius: true,
        layout_item_name: true,
        layout_item_seat_count: true,
        layout_item_width: true,
        layout_item_height: true,
      },
    });
    const newLayout = await db.layout.create({
      data: {
        layout_name: "Party Layout",
        layout_owner_id: userId,
        layout_type: "PARTY",
        LayoutItem: {
          createMany: {
            data: toDuplicateElements.map((element) => ({
              ...element,
              layout_item_id: undefined, // Reset ID for new creation
            })),
          },
        },
      },
      select: {
        layout_id: true,
      },
    });
    return newLayout.layout_id;
  }
  if (!missingLayout) {
    throw new Error("No available layout for party creation");
  }
  return missingLayout?.layout_id;
};

export const deleteLayout = async (layoutId: number) => {
  return db.layout.delete({
    where: {
      layout_id: layoutId,
    },
  });
};

export const duplicateLayout = async (layoutId: number, userId: number) => {
  const layout = await db.layout.findFirst({
    where: {
      layout_id: layoutId,
      layout_owner_id: userId,
    },
    include: {
      LayoutItem: true,
    },
  });

  if (!layout) {
    throw new Error(
      "Layout not found or you do not have permission to access it"
    );
  }

  return await db.$transaction(async (tx) => {
    const newLayout = await tx.layout.create({
      data: {
        layout_name: `${layout.layout_name} (Copy)`,
        layout_owner_id: userId,
        layout_type: "MODEL",
      },
    });

    const newLayoutItems = layout.LayoutItem.map((item) => ({
      ...item,
      layout_item_id: undefined,
      layout_id: newLayout.layout_id,
    }));

    await tx.layoutItem.createMany({
      data: newLayoutItems,
    });

    return {
      ...newLayout,
      LayoutItem: newLayoutItems,
    };
  });
};
