CREATE TABLE `task_reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`offset_minutes` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "task_reminders_offset_valid" CHECK(typeof("task_reminders"."offset_minutes") = 'integer' AND "task_reminders"."offset_minutes" BETWEEN 0 AND 150119987579)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `task_reminders_task_offset_unique` ON `task_reminders` (`task_id`,`offset_minutes`);--> statement-breakpoint
ALTER TABLE `tasks` ADD `reminder_time_zone` text;
--> statement-breakpoint
CREATE TRIGGER task_reminders_limit_insert BEFORE INSERT ON task_reminders
WHEN (SELECT count(*) FROM task_reminders WHERE task_id = NEW.task_id) >= 5
BEGIN SELECT RAISE(ABORT, 'At most five reminders per task'); END;
--> statement-breakpoint
CREATE TRIGGER task_reminders_limit_update BEFORE UPDATE OF task_id ON task_reminders
WHEN NEW.task_id != OLD.task_id AND (SELECT count(*) FROM task_reminders WHERE task_id = NEW.task_id) >= 5
BEGIN SELECT RAISE(ABORT, 'At most five reminders per task'); END;
