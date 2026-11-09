CREATE TABLE `climb_compatibility` (
	`climb_id` text NOT NULL,
	`target_wall_version_id` text NOT NULL,
	`status` text NOT NULL,
	`reason` text,
	PRIMARY KEY(`climb_id`, `target_wall_version_id`),
	FOREIGN KEY (`climb_id`) REFERENCES `climbs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_wall_version_id`) REFERENCES `wall_versions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `climb_grade_votes` (
	`climb_id` text NOT NULL,
	`user_id` text NOT NULL,
	`suggested_grade` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`climb_id`, `user_id`),
	FOREIGN KEY (`climb_id`) REFERENCES `climbs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `climb_holds` (
	`id` text PRIMARY KEY NOT NULL,
	`climb_id` text NOT NULL,
	`hold_id` text NOT NULL,
	`role` text NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`climb_id`) REFERENCES `climbs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`hold_id`) REFERENCES `holds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `climb_ratings` (
	`climb_id` text NOT NULL,
	`user_id` text NOT NULL,
	`stars` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`climb_id`, `user_id`),
	FOREIGN KEY (`climb_id`) REFERENCES `climbs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `climb_sends` (
	`climb_id` text NOT NULL,
	`user_id` text NOT NULL,
	`grade` text NOT NULL,
	`sent_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`climb_id`, `user_id`),
	FOREIGN KEY (`climb_id`) REFERENCES `climbs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `climbs` (
	`id` text PRIMARY KEY NOT NULL,
	`wall_version_id` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`name` text NOT NULL,
	`setter_grade` text,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`wall_version_id`) REFERENCES `wall_versions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`climb_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`climb_id`, `user_id`),
	FOREIGN KEY (`climb_id`) REFERENCES `climbs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `holds` (
	`id` text PRIMARY KEY NOT NULL,
	`canonical_hold_id` text NOT NULL,
	`wall_version_id` text NOT NULL,
	`label` text NOT NULL,
	`color` text,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`wall_version_id`) REFERENCES `wall_versions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `holds_version_canonical_unique` ON `holds` (`wall_version_id`,`canonical_hold_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `wall_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`wall_id` text NOT NULL,
	`parent_version_id` text,
	`name` text NOT NULL,
	`change_type` text NOT NULL,
	`image_url` text,
	`image_key` text,
	`image_content_type` text,
	`photo_scale` real DEFAULT 1 NOT NULL,
	`photo_offset_x` real DEFAULT 0 NOT NULL,
	`photo_offset_y` real DEFAULT 0 NOT NULL,
	`photo_rotation` real DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`wall_id`) REFERENCES `walls`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `walls` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
