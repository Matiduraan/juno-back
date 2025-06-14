type LayoutItem<T = number | string> = {
  layout_item_id: T;
  layout_item_type: string;
  layout_item_shape: string;
  layout_item_position_x: number;
  layout_item_position_y: number;
  layout_item_size: number;
  layout_item_rotation: number;
  layout_item_radius: number;
  layout_item_name: string;
  layout_item_color?: string;
};
