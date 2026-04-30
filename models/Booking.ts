import { model, models, Schema, Types, type InferSchemaType } from "mongoose";

const bookingSchema = new Schema(
  {
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    start: {
      type: Date,
      required: true,
    },
    end: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["confirmed", "cancelled"],
      required: true,
      default: "confirmed",
      index: true,
    },
    googleEventId: {
      type: String,
      required: true,
      trim: true,
    },
    meetLink: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

bookingSchema.index(
  { start: 1, end: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "confirmed" },
  }
);

bookingSchema.index({ serviceId: 1, start: 1 });

export type BookingDocument = InferSchemaType<typeof bookingSchema> & {
  _id: Types.ObjectId;
};

export const Booking =
  models.Booking || model("Booking", bookingSchema);