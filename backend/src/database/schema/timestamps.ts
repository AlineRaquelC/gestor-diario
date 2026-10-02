import { sql } from 'drizzle-orm';
import { text } from 'drizzle-orm/sqlite-core';

// UTC ISO 8601; updatedAt must be maintained by the application on updates.
export const timestamps = () => ({
  createdAt: text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});
