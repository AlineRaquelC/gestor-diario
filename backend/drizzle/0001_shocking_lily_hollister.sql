PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_task_history` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`action` text NOT NULL,
	`metadata` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "task_history_action_valid" CHECK("__new_task_history"."action" IN ('CREATED', 'UPDATED', 'STATUS_CHANGED', 'COMPLETED', 'REOPENED', 'DELETE', 'RESTORE', 'DELETED', 'RESTORED', 'PROJECT_CHANGED'))
);
--> statement-breakpoint
INSERT INTO `__new_task_history`("id", "task_id", "action", "metadata", "created_at") SELECT "id", "task_id", "action", "metadata", "created_at" FROM `task_history`;--> statement-breakpoint
DROP TABLE `task_history`;--> statement-breakpoint
ALTER TABLE `__new_task_history` RENAME TO `task_history`;--> statement-breakpoint
PRAGMA foreign_keys=ON;