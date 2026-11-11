CREATE TABLE `playlist_climbs` (
	`playlist_id` text NOT NULL,
	`climb_id` text NOT NULL,
	`added_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`playlist_id`, `climb_id`),
	FOREIGN KEY (`playlist_id`) REFERENCES `playlists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`climb_id`) REFERENCES `climbs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `playlist_climbs_climb_idx` ON `playlist_climbs` (`climb_id`);--> statement-breakpoint
CREATE TABLE `playlists` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `playlists_user_idx` ON `playlists` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `playlists_user_name_unique` ON `playlists` (`user_id`,`name`);