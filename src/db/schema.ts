import { pgTable, serial, text, integer, boolean, real, timestamp, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  age: integer("age").notNull(),
  gender: text("gender").notNull().default("Kadın"),
  city: text("city").notNull().default("İstanbul"),
  district: text("district").notNull().default(""),
  intent: text("intent").notNull().default("bekar"),
  profileId: integer("profile_id"),
  isAdmin: boolean("is_admin").notNull().default(false),
  isVip: boolean("is_vip").notNull().default(false),
  vipPlan: text("vip_plan").notNull().default(""),
  vipExpiresAt: timestamp("vip_expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vipOrders = pgTable("vip_orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  planKey: text("plan_key").notNull(),
  stars: integer("stars").notNull().default(0),
  status: text("status").notNull().default("pending"), // pending | paid
  createdAt: timestamp("created_at").defaultNow(),
  paidAt: timestamp("paid_at"),
});

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  gender: text("gender").notNull(), // Kadın | Erkek
  city: text("city").notNull(),
  district: text("district").notNull().default(""),
  intent: text("intent").notNull(), // dul | bekar | sevgili | evlilik | kacamak
  bio: text("bio").notNull().default(""),
  imageUrl: text("image_url").notNull(),
  interests: jsonb("interests").$type<string[]>().notNull().default([]),
  isOnline: boolean("is_online").notNull().default(true),
  distanceKm: real("distance_km").notNull().default(2),
  lat: real("lat"),
  lng: real("lng"),
  isVerified: boolean("is_verified").notNull().default(true),
  autoReplyEnabled: boolean("auto_reply_enabled").notNull().default(false),
  autoReplyMessage: text("auto_reply_message").notNull().default(""),
  autoReplyDelaySec: integer("auto_reply_delay_sec").notNull().default(4),
  hasPrivate: boolean("has_private").notNull().default(true),
  privateNote: text("private_note").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull(),
  kind: text("kind").notNull().default("normal"), // normal | super
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull(),
  fromMe: boolean("from_me").notNull().default(true),
  text: text("text").notNull(),
  isAutoReply: boolean("is_auto_reply").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const intimateRequests = pgTable("intimate_requests", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull(),
  status: text("status").notNull().default("pending"), // pending | accepted | rejected
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const consents = pgTable("consents", {
  id: serial("id").primaryKey(),
  birthDate: text("birth_date").notNull(),
  adultConfirmed: boolean("adult_confirmed").notNull().default(false),
  responsibilityAccepted: boolean("responsibility_accepted").notNull().default(false),
  consentText: text("consent_text").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const autoReplySettings = pgTable("auto_reply_settings", {
  id: serial("id").primaryKey(),
  enabled: boolean("enabled").notNull().default(true),
  message: text("message").notNull().default(""),
  delaySec: integer("delay_sec").notNull().default(5),
  onlyWhenOffline: boolean("only_when_offline").notNull().default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});
