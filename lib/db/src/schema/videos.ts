import {
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const videosTable = pgTable(
  "videos",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    caption: varchar("caption", { length: 300 }).notNull(),
    videoUrl: text("video_url").notNull(),
    coverUrl: text("cover_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("videos_created_at_idx").on(table.createdAt)],
);

export const likesTable = pgTable(
  "video_likes",
  {
    videoId: integer("video_id")
      .notNull()
      .references(() => videosTable.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.videoId, table.userId] }),
    index("video_likes_user_idx").on(table.userId),
  ],
);

export const commentsTable = pgTable(
  "video_comments",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    videoId: integer("video_id")
      .notNull()
      .references(() => videosTable.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    body: varchar("body", { length: 500 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("video_comments_video_idx").on(table.videoId, table.createdAt)],
);

export const followsTable = pgTable(
  "creator_follows",
  {
    followerId: varchar("follower_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    followedId: varchar("followed_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.followerId, table.followedId] }),
    index("creator_follows_followed_idx").on(table.followedId),
  ],
);

export type Video = typeof videosTable.$inferSelect;
