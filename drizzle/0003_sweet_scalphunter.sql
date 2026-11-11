CREATE TABLE `climb_markers` (
	`id` text PRIMARY KEY NOT NULL,
	`climb_id` text NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`role` text NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`climb_id`) REFERENCES `climbs`(`id`) ON UPDATE no action ON DELETE cascade
);
