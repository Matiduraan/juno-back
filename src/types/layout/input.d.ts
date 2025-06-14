type UpdateLayoutInput = {
  layoutId: number;
  layoutName?: string;
  elements?: Array<LayoutItem>;
};

type CreateLayoutInput = {
  userId: number;
  layoutName?: string;
  elements?: Array<LayoutItem>;
};
