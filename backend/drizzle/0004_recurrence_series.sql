CREATE TABLE `recurrence_series` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`frequency` text NOT NULL,
	`time_zone` text NOT NULL,
	`anchor_date` text NOT NULL,
	`first_occurrence_key` text NOT NULL,
	`materialized_through` text,
	`title` text NOT NULL,
	`description` text,
	`project_id` text NOT NULL,
	`priority` text NOT NULL,
	`time` text,
	`start_offset_days` integer NOT NULL,
	`subtasks` text NOT NULL,
	`reminders` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "recurrence_frequency_valid" CHECK("recurrence_series"."frequency" IN ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY')),
	CONSTRAINT "recurrence_client_valid" CHECK(length(trim("recurrence_series"."client_id")) > 0),
	CONSTRAINT "recurrence_title_valid" CHECK(length(trim("recurrence_series"."title")) > 0),
	CONSTRAINT "recurrence_zone_valid" CHECK(length(trim("recurrence_series"."time_zone")) > 0),
	CONSTRAINT "recurrence_priority_valid" CHECK("recurrence_series"."priority" IN ('LOW', 'MEDIUM', 'HIGH')),
	CONSTRAINT "recurrence_duration_valid" CHECK(typeof("recurrence_series"."start_offset_days") = 'integer' AND "recurrence_series"."start_offset_days" BETWEEN 0 AND 2958463),
	CONSTRAINT "recurrence_subtasks_valid" CHECK(json_valid("recurrence_series"."subtasks") AND json_type("recurrence_series"."subtasks") = 'array'),
	CONSTRAINT "recurrence_reminders_valid" CHECK(json_valid("recurrence_series"."reminders") AND json_type("recurrence_series"."reminders") = 'array' AND json_array_length("recurrence_series"."reminders") <= 5)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recurrence_series_client_id_unique` ON `recurrence_series` (`client_id`);--> statement-breakpoint
ALTER TABLE `tasks` ADD `recurrence_series_id` text REFERENCES `recurrence_series`(`id`) ON UPDATE no action ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE `tasks` ADD `occurrence_key` text CONSTRAINT "tasks_recurrence_pair" CHECK ((`recurrence_series_id` IS NULL) = (`occurrence_key` IS NULL));
--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_series_occurrence_unique` ON `tasks` (`recurrence_series_id`,`occurrence_key`);
