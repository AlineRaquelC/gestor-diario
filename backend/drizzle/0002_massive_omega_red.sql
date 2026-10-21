ALTER TABLE `projects` ADD `client_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `projects_client_id_unique` ON `projects` (`client_id`);--> statement-breakpoint
ALTER TABLE `tasks` ADD `client_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_client_id_unique` ON `tasks` (`client_id`);