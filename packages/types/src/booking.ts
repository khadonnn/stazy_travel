import { BookingSchemaType } from "@repo/booking-db";

export type BookingType = BookingSchemaType & {
  _id: string;
};

export type BookingChartType = {
  name: string;
  totalRevenue: number;
  totalBookings: number;
  confirmedBookings: number;
  month: string;
  total: number;
  successful: number;
};
