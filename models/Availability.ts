import { model, models, Schema, type InferSchemaType } from "mongoose";

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

const availabilitySchema = new Schema(
  {
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
      index: true,
    },
    startTime: {
      type: String,
      required: true,
      match: timePattern,
    },
    endTime: {
      type: String,
      required: true,
      match: timePattern,
    },
  },
  {
    timestamps: true,
  }
);

export type AvailabilityDocument = InferSchemaType<typeof availabilitySchema>;

export const Availability =
  models.Availability || model("Availability", availabilitySchema);