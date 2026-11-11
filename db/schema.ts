import { sql } from "drizzle-orm";
import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role", { enum: ["admin", "member"] }).notNull().default("member"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("users_email_unique").on(table.email)]);

export const walls = sqliteTable("walls", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const wallVersions = sqliteTable("wall_versions", {
  id: text("id").primaryKey(),
  wallId: text("wall_id").notNull().references(() => walls.id, { onDelete: "cascade" }),
  parentVersionId: text("parent_version_id"),
  name: text("name").notNull(),
  changeType: text("change_type", { enum: ["additive", "modified", "reset"] }).notNull(),
  imageUrl: text("image_url"),
  imageKey: text("image_key"),
  imageContentType: text("image_content_type"),
  photoScale: real("photo_scale").notNull().default(1),
  photoOffsetX: real("photo_offset_x").notNull().default(0),
  photoOffsetY: real("photo_offset_y").notNull().default(0),
  photoRotation: real("photo_rotation").notNull().default(0),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const holds = sqliteTable("holds", {
  id: text("id").primaryKey(),
  canonicalHoldId: text("canonical_hold_id").notNull(),
  wallVersionId: text("wall_version_id").notNull().references(() => wallVersions.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  color: text("color"),
  x: real("x").notNull(),
  y: real("y").notNull(),
  status: text("status", { enum: ["active", "moved", "removed", "added"] }).notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("holds_version_canonical_unique").on(table.wallVersionId, table.canonicalHoldId)]);

export const climbs = sqliteTable("climbs", {
  id: text("id").primaryKey(),
  wallVersionId: text("wall_version_id").notNull().references(() => wallVersions.id, { onDelete: "cascade" }),
  createdByUserId: text("created_by_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  setterGrade: text("setter_grade"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const climbHolds = sqliteTable("climb_holds", {
  id: text("id").primaryKey(),
  climbId: text("climb_id").notNull().references(() => climbs.id, { onDelete: "cascade" }),
  holdId: text("hold_id").notNull().references(() => holds.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["start", "middle", "foot", "finish"] }).notNull(),
  orderIndex: integer("order_index").notNull().default(0),
});

export const climbMarkers = sqliteTable("climb_markers", {
  id: text("id").primaryKey(),
  climbId: text("climb_id").notNull().references(() => climbs.id, { onDelete: "cascade" }),
  x: real("x").notNull(),
  y: real("y").notNull(),
  role: text("role", { enum: ["start", "middle", "foot", "finish"] }).notNull(),
  orderIndex: integer("order_index").notNull().default(0),
});

export const climbRatings = sqliteTable("climb_ratings", {
  climbId: text("climb_id").notNull().references(() => climbs.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stars: integer("stars").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [primaryKey({ columns: [table.climbId, table.userId] })]);

export const climbGradeVotes = sqliteTable("climb_grade_votes", {
  climbId: text("climb_id").notNull().references(() => climbs.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  suggestedGrade: text("suggested_grade").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [primaryKey({ columns: [table.climbId, table.userId] })]);

export const climbCompatibility = sqliteTable("climb_compatibility", {
  climbId: text("climb_id").notNull().references(() => climbs.id, { onDelete: "cascade" }),
  targetWallVersionId: text("target_wall_version_id").notNull().references(() => wallVersions.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["compatible", "needs_review", "incompatible"] }).notNull(),
  reason: text("reason"),
}, (table) => [primaryKey({ columns: [table.climbId, table.targetWallVersionId] })]);

export const favorites = sqliteTable("favorites", {
  climbId: text("climb_id").notNull().references(() => climbs.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [primaryKey({ columns: [table.climbId, table.userId] })]);

export const climbSends = sqliteTable("climb_sends", {
  climbId: text("climb_id").notNull().references(() => climbs.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  grade: text("grade").notNull(),
  sentAt: text("sent_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [primaryKey({ columns: [table.climbId, table.userId] })]);

export const climbRepeats = sqliteTable("climb_repeats", {
  id: text("id").primaryKey(),
  climbId: text("climb_id").notNull().references(() => climbs.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  repeatedAt: text("repeated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("climb_repeats_climb_idx").on(table.climbId),
  index("climb_repeats_user_idx").on(table.userId),
]);
