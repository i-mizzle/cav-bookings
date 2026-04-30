import { model, models, Schema, type InferSchemaType } from "mongoose";

const servicePackageSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    pricing: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  }
);

const pricingSchema = new Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
      required: true,
      enum: ["rolling", "fixed", "packaged"],
      trim: true,
    },
    cycle: {
      type: String,
      required: false,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const serviceSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    pricing: {
      type: pricingSchema,
      required: true,
    },
    packages: {
      type: [servicePackageSchema],
      default: [],
    },
    duration: {
      type: Number,
      required: true,
      default: 60,
      min: 60,
    },
    bufferBefore: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    bufferAfter: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

export type ServiceDocument = InferSchemaType<typeof serviceSchema>;

export const Service =
  models.Service || model("Service", serviceSchema);