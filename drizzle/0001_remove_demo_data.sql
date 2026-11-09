-- Remove only the prototype records that shipped with the first Sites build.
-- The wall delete cascades through its versions, holds, climbs, and activity.
DELETE FROM `walls` WHERE `id` = 'wall-1';
--> statement-breakpoint
DELETE FROM `users` WHERE `id` IN ('demo-u2', 'demo-u3');
