CREATE TABLE `climb_repeats` (
	`id` text PRIMARY KEY NOT NULL,
	`climb_id` text NOT NULL,
	`user_id` text NOT NULL,
	`repeated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`climb_id`) REFERENCES `climbs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `climb_repeats_climb_idx` ON `climb_repeats` (`climb_id`);--> statement-breakpoint
CREATE INDEX `climb_repeats_user_idx` ON `climb_repeats` (`user_id`);