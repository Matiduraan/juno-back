type CreateMomentInput = {
  moment_name: string;
  moment_description: string;
  moment_type_id: number;
  moment_time_start: string;
  moment_time_end?: string | null;
};

type UpdateMomentInput = {
  moment_name: string;
  party_id: number;
  moment_description?: string;
  moment_type_id: number;
  moment_time_start: string;
  moment_time_end: string | null;
};

type CreateMomentTypeInput = {
  moment_type_name: string;
  moment_type_color: string;
  moment_type_icon: string;
  user_id?: number | null;
};

type UpdateMomentTypeInput = {
  moment_type_name?: string;
  moment_type_color?: string;
  moment_type_icon?: string;
  user_id: number;
};
