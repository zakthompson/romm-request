CREATE TABLE `requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`igdb_game_id` integer NOT NULL,
	`game_name` text NOT NULL,
	`game_cover_url` text,
	`platform_name` text NOT NULL,
	`platform_igdb_id` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`admin_notes` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	`fulfilled_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_pending_request` ON `requests` (`user_id`,`igdb_game_id`,`platform_igdb_id`) WHERE `status` = 'pending';
