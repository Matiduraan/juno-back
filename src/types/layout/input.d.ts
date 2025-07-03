type UpdateLayoutInput<T = number | string> = {
  layoutId: number;
  layoutName?: string;
  layoutDescription?: string;
  elements?: Array<LayoutItem<T>>;
};

type CreateLayoutInput = {
  userId: number;
  layoutName?: string;
  layoutDescription?: string;
  elements?: Array<LayoutItem>;
};
