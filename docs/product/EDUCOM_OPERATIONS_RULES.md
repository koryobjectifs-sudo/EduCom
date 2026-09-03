# EduCom Operations Rules & Communication Architecture

## Communication Audit (WhatsApp & SMS)

### Current State
1. **WebhookEvent Model**: The Prisma schema contains a `WebhookEvent` model with fields for `provider` (intended for 'WHATSAPP'), `payload`, and `processed` status.
2. **Missing Idempotency**: The schema documentation mentions an idempotency constraint, but the model lacks a unique constraint on an external ID (e.g., `providerEventId`). If a webhook is retried by the provider, it will create duplicate rows.
3. **No Integration**: There is absolutely zero code in `src/` interacting with `WebhookEvent`. The API routes or background workers to receive and process webhooks are missing.
4. **Missing Notification Tracking**: There is no `Notification` or `Message` model in the database to track outgoing messages. We cannot know if a message was sent, delivered, or read, nor can we link a message to a specific student, parent, or invoice.
5. **No External ID Tracking**: Without a way to store the WhatsApp/SMS message ID returned by the provider upon sending, we cannot correlate incoming webhooks (delivery receipts) to the original outgoing message.

### Required Architecture

To implement a robust communication system (WhatsApp/SMS), the following infrastructure must be built:

1. **Notification Model**:
   - `id` (UUID)
   - `schoolId` (Relation)
   - `studentId` / `parentId` (Relation)
   - `type` (e.g., 'INVOICE_REMINDER', 'ABSENCE_ALERT')
   - `channel` ('WHATSAPP', 'SMS', 'EMAIL')
   - `status` ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED')
   - `externalId` (String, nullable) - The ID returned by the provider (e.g., Meta/Twilio).
   - `createdAt`, `updatedAt`

2. **WebhookEvent Enhancements**:
   - Add a `providerEventId` string field with a `@unique` constraint to ensure idempotency at the database level.

3. **Webhook Processing Pipeline**:
   - An API route (e.g., `/api/webhooks/whatsapp`) to receive incoming events and quickly save them to `WebhookEvent`.
   - A background worker or cron job to process `WebhookEvent` rows asynchronously, update the corresponding `Notification` status using `externalId`, and mark the webhook as `processed`.

4. **Sending Interface**:
   - A service function to dispatch messages via the provider's API, capture the `externalId`, and create the `Notification` record.
   - User interfaces in the Contextual OS (e.g., in the Student Profile or Invoice view) to manually trigger notifications and view their delivery status.
