CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "notes_content_not_empty" CHECK(length(trim("notes"."content")) > 0)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`color` text NOT NULL,
	`icon` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`deleted_at` text,
	CONSTRAINT "projects_name_not_empty" CHECK(length(trim("projects"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE `subtasks` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`title` text NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "subtasks_title_not_empty" CHECK(length(trim("subtasks"."title")) > 0),
	CONSTRAINT "subtasks_done_boolean" CHECK("subtasks"."done" IN (0, 1))
);
--> statement-breakpoint
CREATE TABLE `task_history` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`action` text NOT NULL,
	`metadata` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "task_history_action_valid" CHECK("task_history"."action" IN ('CREATED', 'UPDATED', 'STATUS_CHANGED', 'COMPLETED', 'REOPENED', 'DELETED', 'RESTORED', 'PROJECT_CHANGED'))
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`project_id` text NOT NULL,
	`start_date` text NOT NULL,
	`due_date` text NOT NULL,
	`time` text,
	`priority` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`favorite` integer DEFAULT false,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`deleted_at` text,
	`undo_until` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "tasks_title_not_empty" CHECK(length(trim("tasks"."title")) > 0),
	CONSTRAINT "tasks_priority_valid" CHECK("tasks"."priority" IN ('LOW', 'MEDIUM', 'HIGH')),
	CONSTRAINT "tasks_status_valid" CHECK("tasks"."status" IN ('PENDING', 'PARTIAL', 'COMPLETED')),
	CONSTRAINT "tasks_progress_valid" CHECK(typeof("tasks"."progress") = 'integer' AND "tasks"."progress" BETWEEN 0 AND 100),
	CONSTRAINT "tasks_done_boolean" CHECK("tasks"."done" IN (0, 1)),
	CONSTRAINT "tasks_favorite_boolean" CHECK("tasks"."favorite" IN (0, 1))
);
